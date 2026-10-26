/**
 * Runner migrare PCO → pc_. Ordine de pull pe dependențe FK, upsert IDEMPOTENT pe
 * (orgId, remoteSource:"pco", remoteId), hărți remoteId→localId pt. rezolvarea relațiilor.
 * dryRun implicit = NU scrie (doar numără). Reluabil (upsert, nu insert).
 *
 * SCHELET: structura + entitățile principale sunt complete. Puncte de extindere marcate „TODO".
 */
const M = require("../../models");
const { map } = require("./mapper");

const SOURCE = "pco";
// remoteType PCO → { model, mapper }
const REG = {
  Folder: { model: M.PcFolder, mapper: "folder" },
  ServiceType: { model: M.PcServiceType, mapper: "service_type" },
  Team: { model: M.PcTeam, mapper: "team" },
  TeamPosition: { model: M.PcPosition, mapper: "team_position" },
  Person: { model: M.PcPerson, mapper: "person" },
  Series: { model: M.PcSeries, mapper: "series" },
  Plan: { model: M.PcPlan, mapper: "plan" },
  PlanTime: { model: M.PcPlanTime, mapper: "plan_time" },
  Item: { model: M.PcPlanItem, mapper: "item" },
  PlanPerson: { model: M.PcAssignment, mapper: "plan_person" },
  NeededPosition: { model: M.PcNeededPosition, mapper: "needed_position" },
  PlanNote: { model: M.PcPlanNote, mapper: "plan_note" },
  Blockout: { model: M.PcBlockout, mapper: "blockout" },
};

class ImportRunner {
  constructor({ client, orgId, dryRun = true, log = console.log }) {
    this.client = client;
    this.orgId = orgId;
    this.dryRun = dryRun;
    this.log = log;
    this.ids = {};          // remoteType → Map(remoteId → localId)
    this.posByName = new Map(); // `${teamLocalId}::${nume poziție}` → localId poziție (rezolvare după nume)
    this.inc = new Map();   // included curent (type:id → resource)
    this.report = {};       // remoteType → { created, updated, skipped, errors }
  }

  local(type, remoteId) { return remoteId ? (this.ids[type] && this.ids[type].get(String(remoteId))) || null : null; }
  remember(type, remoteId, localId) { (this.ids[type] = this.ids[type] || new Map()).set(String(remoteId), localId); }
  // Poziția locală după (echipă, nume) — PCO dă team_position_name, nu o relație, pe needed/assignment.
  posKey(teamLocalId, name) { return `${teamLocalId || ""}::${String(name || "").trim().toLowerCase()}`; }
  posId(teamLocalId, name) { return (teamLocalId && name) ? this.posByName.get(this.posKey(teamLocalId, name)) || null : null; }
  // Copiii unei relații to-many, rezolvați din `included` (ex. emails ale unei persoane).
  children(res, name) { return (res.relationships?.[name]?.data || []).map((d) => this.inc.get(`${d.type}:${d.id}`)).filter(Boolean); }

  bump(type, k) { (this.report[type] = this.report[type] || { created: 0, updated: 0, skipped: 0, errors: 0 })[k]++; }

  ctx() { return { orgId: this.orgId, local: (t, id) => this.local(t, id), posId: (t, n) => this.posId(t, n), children: (r, n) => this.children(r, n) }; }

  /** Upsert idempotent al unui lot de resurse PCO de un anumit tip. */
  async upsertBatch(type, { data, included }) {
    const reg = REG[type];
    this.inc = included || new Map();
    for (const r of data || []) {
      try {
        const fields = map[reg.mapper](r, this.ctx());
        if (this.dryRun) { this.bump(type, this.local(type, r.id) ? "updated" : "created"); continue; }
        const existing = await reg.model.findOne({ orgId: this.orgId, remoteSource: SOURCE, remoteId: r.id }).select("_id").lean();
        const doc = await reg.model.findOneAndUpdate(
          { orgId: this.orgId, remoteSource: SOURCE, remoteId: r.id },
          { $set: { ...fields, orgId: this.orgId, remoteSource: SOURCE, remoteId: r.id } },
          { upsert: true, new: true }
        ).select("_id").lean();
        this.remember(type, r.id, doc._id);
        if (type === "TeamPosition") this.posByName.set(this.posKey(fields.teamId, fields.name), doc._id);
        this.bump(type, existing ? "updated" : "created");
      } catch (e) { this.bump(type, "errors"); this.log(`  ! ${type} ${r.id}: ${e.message}`); }
    }
  }

  async run() {
    const c = this.client;
    // 1) Foldere + service types
    await this.upsertBatch("Folder", await c.getAll("/folders"));
    await this.upsertBatch("ServiceType", await c.getAll("/service_types"));
    // 2) Per service type: teams + poziții
    for (const [rid] of this.ids.ServiceType || []) {
      await this.upsertBatch("Team", await c.getAll(`/service_types/${rid}/teams`));
      await this.upsertBatch("TeamPosition", await c.getAll(`/service_types/${rid}/team_positions`));
    }
    // 3) People (cu emails/telefoane) + serii
    await this.upsertBatch("Person", await c.getAll("/people", { include: "emails,phone_numbers" }));
    await this.upsertBatch("Series", await c.getAll("/series"));
    // 4) PLANURI — întâi doc-urile de plan din TOATE service types (ca să apară toate în tab Plans),
    //    apoi conținutul fiecărui plan în ordine GLOBALĂ (cele mai recente întâi), ca Matrix-ul
    //    (care arată planuri recente/viitoare) să se umple imediat pt. toate service types.
    const allPlans = []; // { stId, remoteId, sortDate }
    for (const [stId] of this.ids.ServiceType || []) {
      for (const flt of ["future", "past"]) {
        const { data, included } = await c.getAll(`/service_types/${stId}/plans`, { filter: flt, include: "series", order: flt === "past" ? "-sort_date" : "sort_date" });
        await this.upsertBatch("Plan", { data, included });
        for (const p of data) allPlans.push({ stId, remoteId: p.id, sortDate: p.attributes?.sort_date || p.attributes?.dates || null });
      }
    }
    // cele mai APROPIATE de azi întâi (viitor apropiat + trecut recent) — exact ce arată Matrix/Plans.
    // Istoricul vechi se completează la urmă. Așa scheduling-ul activ apare imediat.
    const now = Date.now();
    allPlans.sort((a, b) => Math.abs(new Date(a.sortDate || 0).getTime() - now) - Math.abs(new Date(b.sortDate || 0).getTime() - now));
    this.log(`[pcoImport] ${allPlans.length} planuri — trag conținutul (cele apropiate de azi întâi)…`);
    for (const { stId, remoteId } of allPlans) {
      const base = `/service_types/${stId}/plans/${remoteId}`;
      await this.upsertBatch("PlanTime", await c.getAll(`${base}/plan_times`));
      await this.upsertBatch("Item", await c.getAll(`${base}/items`));
      await this.upsertBatch("NeededPosition", await c.getAll(`${base}/needed_positions`));
      await this.upsertBatch("PlanPerson", await c.getAll(`${base}/team_members`));
      await this.upsertBatch("PlanNote", await c.getAll(`${base}/notes`));
    }
    // 5) Blockouts (per persoană). TODO: paralelizare controlată + ItemNotes + PlanTemplates + SchedulingPreferences.
    for (const [personId] of this.ids.Person || []) {
      await this.upsertBatch("Blockout", await c.getAll(`/people/${personId}/blockouts`));
    }
    return this.report;
  }
}

module.exports = { ImportRunner };
