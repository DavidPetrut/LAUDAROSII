/**
 * Rute Services — Plan page (felia Services core, read). /api/pc/v1/plans.
 * Header + Order + Teams + Times + Notes + Files + Item detail. Org-scoped + authz.
 * UI = app/planning-center/screens/plans/* (identic cu screenshot-urile).
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcPlan, PcPlanTime, PcPlanItem, PcAssignment, PcNeededPosition, PcPlanNote, PcPlanFile,
  PcServiceType, PcTeam, PcPosition, PcTeamMember, PcPerson, PcOrg, PcCampus, PcSong,
  PcArrangement, PcKey, PcSongFile, PcBlockout,
} = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { requireCan, can } = require("../core/permissions");
const { wallToUtc } = require("../lib/time");
const { DEFAULT_ITEM_ROW_COLORS, rowColorFor } = require("../lib/orderColors");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);

// Detectează audio după kind SAU extensie (fișierele uploadate pot avea kind generic → altfel nu ajung în player).
const AUDIO_RX = /\.(mp3|m4a|aac|wav|ogg|flac|opus|aiff?)(\?|#|$)/i;
const isAudioFile = (f) => f?.kind === "audio" || AUDIO_RX.test(f?.url || "") || AUDIO_RX.test(f?.name || "");

/* ---------- helpers tz / format ---------- */
async function campusTz(req) {
  if (req._pcTz) return req._pcTz;
  const org = await PcOrg.findById(req.pcOrgId).select("defaultCampusId").lean();
  let tz = "Europe/Bucharest";
  if (org?.defaultCampusId) {
    const c = await PcCampus.findById(org.defaultCampusId).select("timezone").lean();
    if (c?.timezone) tz = c.timezone;
  }
  req._pcTz = tz;
  return tz;
}
const fmtDate = (d, tz) => (d ? new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(new Date(d)) : "");
const fmtWeekday = (d, tz) => (d ? new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date(d)).toUpperCase() : "");
const fmtFullDate = (d, tz) => (d ? new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d)) : "");
const fmtTime = (d, tz) => (d ? new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d)) : "");
const fmtLen = (sec) => { const s = Math.max(0, Math.floor(sec || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const personMini = (p) => (p ? { id: p._id, name: [p.firstName, p.lastName].filter(Boolean).join(" "), avatar: p.avatar || "", initials: `${(p.firstName || "").charAt(0)}${(p.lastName || "").charAt(0)}`.toUpperCase() } : null);

async function viewerPersonId(req) {
  if (req._pcViewerId !== undefined) return req._pcViewerId;
  const p = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
  req._pcViewerId = p?._id || null;
  return req._pcViewerId;
}

/* ───────── GET / — planuri grupate pe service type (tab Plans) ───────── */
router.get("/", requireCan("people.view"), async (req, res) => {
  try {
    const tz = await campusTz(req);
    const [serviceTypes, plans] = await Promise.all([
      PcServiceType.find(scoped(req, { archived: false })).select("name sortOrder").sort({ sortOrder: 1, name: 1 }).lean(),
      PcPlan.find(scoped(req)).select("serviceTypeId title sortDate").sort({ sortDate: 1 }).lean(),
    ]);
    const byType = {};
    plans.forEach((p) => {
      const k = String(p.serviceTypeId);
      (byType[k] = byType[k] || []).push({ id: p._id, title: p.title || "", dateLabel: fmtDate(p.sortDate, tz), sortDate: p.sortDate });
    });
    res.json({
      serviceTypes: serviceTypes.map((st) => ({
        id: st._id, name: st.name, plans: byType[String(st._id)] || [],
      })),
    });
  } catch (err) {
    console.error("[pc] GET /plans:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea planurilor." });
  }
});

/* ───────── POST / — creează un plan nou într-un service type (butonul „+") ───────── */
router.post("/", requireCan("services.addPlan"), async (req, res) => {
  try {
    const stId = OID(req.body?.serviceTypeId);
    if (!stId) return res.status(400).json({ error: "serviceTypeId invalid." });
    if (!req.body?.date) return res.status(400).json({ error: "Alege o dată." });
    const st = await PcServiceType.findOne(scoped(req, { _id: stId })).lean();
    if (!st) return res.status(404).json({ error: "Service type inexistent." });
    const tz = await campusTz(req);
    const defTemplate = (st.serviceTimeTemplate && st.serviceTimeTemplate.length) ? st.serviceTimeTemplate : [{ start: "09:00", end: "10:00" }];

    // Opțiuni Add Plans (ca în PCO): câte planuri, de unde copiez orele, ce plan e „template" (structura/Needed).
    const quantity = Math.max(1, Math.min(52, parseInt(req.body?.quantity, 10) || 1));
    const copyTimesId = OID(req.body?.copyTimesFromPlanId);
    const templateId = OID(req.body?.templatePlanId);

    // sursa ORELOR: „Copy Times From" > „Template" > template-ul service type-ului
    const clean = (o) => { const { _id, planId, orgId, createdAt, updatedAt, __v, deletedAt, ...rest } = o; return rest; };
    const dateStrOf = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
    const addWeeksStr = (ds, w) => { const [y, m, d] = ds.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() + 7 * w); return dt.toISOString().slice(0, 10); };

    let srcTimes = null, srcDateStr = null;
    const srcTimesPlanId = copyTimesId || templateId;
    if (srcTimesPlanId) {
      const pl = await PcPlan.findOne(scoped(req, { _id: srcTimesPlanId, serviceTypeId: stId })).select("sortDate").lean();
      if (pl) { srcTimes = await PcPlanTime.find(scoped(req, { planId: srcTimesPlanId })).lean(); srcDateStr = dateStrOf(pl.sortDate); }
    }
    // STRUCTURA (Needed per poziție) din planul „template"
    const srcNeeded = templateId ? await PcNeededPosition.find(scoped(req, { planId: templateId })).lean() : null;

    const created = [];
    for (let i = 0; i < quantity; i++) {
      const dayStr = addWeeksStr(req.body.date, i); // păstrează ziua săptămânii (+7*i)
      let sortDate, times; // times = [{type,name,startsAt,endsAt}]
      if (srcTimes && srcTimes.length) {
        // decalaj zile sursă→nou (păstrează ora + ziua relativă, ex. repetiție sâmbătă înainte de duminică)
        const deltaMs = Date.parse(dayStr + "T00:00:00Z") - Date.parse(srcDateStr + "T00:00:00Z");
        const shift = (d) => (d ? new Date(new Date(d).getTime() + deltaMs) : d);
        times = srcTimes.map((t) => ({ ...clean(t), startsAt: shift(t.startsAt), endsAt: shift(t.endsAt) }));
        const firstSvc = times.find((t) => t.type === "service") || times[0];
        sortDate = firstSvc?.startsAt || wallToUtc(dayStr, defTemplate[0].start, tz);
      } else {
        sortDate = wallToUtc(dayStr, defTemplate[0].start, tz) || new Date(dayStr);
        times = defTemplate.map((t) => ({ type: "service", name: "", startsAt: wallToUtc(dayStr, t.start, tz) || sortDate, endsAt: t.end ? wallToUtc(dayStr, t.end, tz) : null }));
      }
      const plan = await PcPlan.create(stamp(req, { serviceTypeId: stId, sortDate }));
      for (const t of times) await PcPlanTime.create(stamp(req, { ...t, planId: plan._id }));
      if (srcNeeded) for (const n of srcNeeded) await PcNeededPosition.create(stamp(req, { ...clean(n), planId: plan._id }));
      created.push(plan._id);
    }
    res.status(201).json({ ok: true, created: created.length, planId: created[0], planIds: created });
  } catch (err) {
    console.error("[pc] POST /plans:", err.message);
    res.status(500).json({ error: "Eroare la crearea planului: " + err.message });
  }
});

/* ───────── GET /:id — header plan (titlu, dată, prev/next, asignările mele) ───────── */
router.get("/:id", requireCan("people.view"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid" });
    const plan = await PcPlan.findOne(scoped(req, { _id: id })).lean();
    if (!plan) return res.status(404).json({ error: "Planul nu există" });
    const tz = await campusTz(req);
    const st = await PcServiceType.findOne(scoped(req, { _id: plan.serviceTypeId })).select("name").lean();

    // prev/next în același service type după dată
    const [prev, next] = await Promise.all([
      PcPlan.findOne(scoped(req, { serviceTypeId: plan.serviceTypeId, sortDate: { $lt: plan.sortDate } })).sort({ sortDate: -1 }).select("_id").lean(),
      PcPlan.findOne(scoped(req, { serviceTypeId: plan.serviceTypeId, sortDate: { $gt: plan.sortDate } })).sort({ sortDate: 1 }).select("_id").lean(),
    ]);

    // asignările mele pe acest plan (chip-urile verzi de sus)
    const vpid = await viewerPersonId(req);
    let myAssignments = [];
    if (vpid) {
      const mine = await PcAssignment.find(scoped(req, { planId: id, personId: vpid })).lean();
      const posIds = mine.map((a) => a.positionId).filter(Boolean);
      const teamIds = mine.map((a) => a.teamId);
      const [positions, teams] = await Promise.all([
        PcPosition.find(scoped(req, { _id: { $in: posIds } })).select("name instructions").lean(),
        PcTeam.find(scoped(req, { _id: { $in: teamIds } })).select("name").lean(),
      ]);
      const posName = Object.fromEntries(positions.map((p) => [String(p._id), p.name]));
      const posInstr = Object.fromEntries(positions.map((p) => [String(p._id), p.instructions || ""]));
      const teamName = Object.fromEntries(teams.map((t) => [String(t._id), t.name]));
      myAssignments = mine.map((a) => ({
        assignmentId: String(a._id),
        label: posName[String(a.positionId)] || "Poziție",
        team: teamName[String(a.teamId)] || "",
        instructions: posInstr[String(a.positionId)] || "",   // „manualul" poziției, vizibil userului
        confirmed: a.status === "confirmed",
        declined: a.status === "declined",
      }));
    }

    res.json({
      id: plan._id,
      title: plan.title || st?.name || "Plan",
      serviceTypeId: plan.serviceTypeId,   // #5: lipsea → butonul Matrix dădea „ID invalid"
      serviceTypeName: st?.name || "",
      dateLabel: plan.sortDate ? new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(plan.sortDate)) : "",
      prevId: prev?._id || null,
      nextId: next?._id || null,
      myAssignments,
    });
  } catch (err) {
    console.error("[pc] GET /plans/:id:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea planului." });
  }
});

/* ───────── PATCH /:id — editează planul (deocamdată: redenumire titlu) ───────── */
router.patch("/:id", requireCan("services.editOrder"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid" });
    const set = {};
    if (req.body?.title !== undefined) set.title = String(req.body.title).trim().slice(0, 200);
    if (!Object.keys(set).length) return res.status(400).json({ error: "Nimic de salvat." });
    const plan = await PcPlan.findOneAndUpdate(scoped(req, { _id: id }), { $set: set }, { new: true }).select("_id title").lean();
    if (!plan) return res.status(404).json({ error: "Planul nu există" });
    res.json({ ok: true, title: plan.title || "" });
  } catch (err) {
    console.error("[pc] PATCH /plans/:id:", err.message);
    res.status(500).json({ error: "Eroare la redenumire." });
  }
});

/** Rezolvă liderii (persoană SAU poziție→persoana programată) pt. o listă de itemi. */
async function resolveItemLeaders(req, planId, items) {
  const personIds = [], positionIds = [];
  for (const it of items) {
    if (it.leaderId) personIds.push(it.leaderId);
    for (const l of it.leaders || []) { if (l.personId) personIds.push(l.personId); if (l.positionId) positionIds.push(l.positionId); }
  }
  const [persons, positions, assigns] = await Promise.all([
    PcPerson.find(scoped(req, { _id: { $in: personIds } })).select("firstName lastName avatar").lean(),
    PcPosition.find(scoped(req, { _id: { $in: positionIds } })).select("name").lean(),
    positionIds.length ? PcAssignment.find(scoped(req, { planId, positionId: { $in: positionIds } })).lean() : [],
  ]);
  const personById = Object.fromEntries(persons.map((p) => [String(p._id), p]));
  const posById = Object.fromEntries(positions.map((p) => [String(p._id), p]));
  const assignByPos = {};
  for (const a of assigns) if (!assignByPos[String(a.positionId)]) assignByPos[String(a.positionId)] = a.personId;
  const extra = Object.values(assignByPos).filter((id) => !personById[String(id)]);
  if (extra.length) {
    (await PcPerson.find(scoped(req, { _id: { $in: extra } })).select("firstName lastName avatar").lean())
      .forEach((p) => (personById[String(p._id)] = p));
  }
  const map = {};
  for (const it of items) {
    const list = [], seen = new Set();
    const pushP = (pid) => { const p = personById[String(pid)]; if (p && !seen.has(String(pid))) { seen.add(String(pid)); list.push(personMini(p)); } };
    if (it.leaderId) pushP(it.leaderId);
    for (const l of it.leaders || []) {
      if (l.personId) pushP(l.personId);
      else if (l.positionId) {
        const pid = assignByPos[String(l.positionId)];
        if (pid) pushP(pid);
        else list.push({ positionName: posById[String(l.positionId)]?.name || "Poziție", needed: true, positionId: l.positionId });
      }
    }
    map[String(it._id)] = list;
  }
  return map;
}

/* ───────── GET /:id/order — ordinea serviciului (secțiuni + itemi) ───────── */
router.get("/:id/order", requireCan("people.view"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid" });
    const items = await PcPlanItem.find(scoped(req, { planId: id })).sort({ sortOrder: 1 }).lean();
    const leadersMap = await resolveItemLeaders(req, id, items);
    // reguli de culoare din service type
    const plan = await PcPlan.findOne(scoped(req, { _id: id })).select("serviceTypeId").lean();
    const st = plan ? await PcServiceType.findOne(scoped(req, { _id: plan.serviceTypeId })).select("itemRowColors useCustomRowColors").lean() : null;
    const rules = st && st.useCustomRowColors === false ? [] : (st && st.itemRowColors && st.itemRowColors.length ? st.itemRowColors : DEFAULT_ITEM_ROW_COLORS);
    res.json({
      items: items.map((it) => ({
        id: it._id,
        type: it.type,
        title: it.title,
        description: it.description || "",
        lengthLabel: fmtLen(it.lengthSec),
        keyName: it.keyName || "",
        rowColor: rowColorFor(it, rules),
        leaders: leadersMap[String(it._id)] || [],
        leader: (leadersMap[String(it._id)] || [])[0] || null,
      })),
    });
  } catch (err) {
    console.error("[pc] GET /plans/:id/order:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea ordinii." });
  }
});

/* ───────── GET /:id/items/:itemId — detaliu item (ecranul Item) ───────── */
router.get("/:id/items/:itemId", requireCan("people.view"), async (req, res) => {
  try {
    const itemId = OID(req.params.itemId);
    if (!itemId) return res.status(400).json({ error: "ID invalid" });
    const it = await PcPlanItem.findOne(scoped(req, { _id: itemId })).lean();
    if (!it) return res.status(404).json({ error: "Item inexistent" });
    const planId = OID(req.params.id);
    const leadersMap = await resolveItemLeaders(req, planId, [it]);
    const files = await PcPlanFile.find(scoped(req, { itemId })).sort({ sortOrder: 1 }).lean();
    // ore de serviciu (pt. checkbox-urile During/Before/After per oră)
    const serviceTimes = await PcPlanTime.find(scoped(req, { planId, type: "service" })).sort({ startsAt: 1 }).lean();
    const tz = await campusTz(req);
    res.json({
      id: it._id,
      type: it.type,
      title: it.title,
      description: it.description || "",
      lengthSec: it.lengthSec || 0,
      lengthLabel: fmtLen(it.lengthSec),
      placement: it.placement || "during",
      duringAll: it.duringAll !== false,
      timeIds: (it.timeIds || []).map(String),
      keyName: it.keyName || "",
      // Linkaj song (pt. tab-ul SONG / Edit a song from a plan + Sequence):
      songId: it.songId ? String(it.songId) : null,
      arrangementId: it.arrangementId ? String(it.arrangementId) : null,
      keyId: it.keyId ? String(it.keyId) : null,
      sequence: Array.isArray(it.sequence) ? it.sequence : [],
      duringLabel: (it.placement && it.placement !== "during") ? `${it.placement[0].toUpperCase()}${it.placement.slice(1)} All` : (it.duringAll !== false ? "During All" : `${(it.timeIds || []).length} time(s)`),
      leaders: leadersMap[String(it._id)] || [],
      serviceTimes: serviceTimes.map((t) => ({ id: t._id, label: fmtTime(t.startsAt, tz) })),
      files: files.map((f) => ({ id: f._id, name: f.name, kind: f.kind, url: f.url || null })),
    });
  } catch (err) {
    console.error("[pc] GET /plans/:id/items/:itemId:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea itemului." });
  }
});

/* ───────── POST /:id/items — adaugă item (Item/Header/Song/Media) ───────── */
router.post("/:id/items", requireCan("services.editOrder"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    if (!planId) return res.status(400).json({ error: "ID invalid" });
    const b = req.body || {};
    const type = ["item", "header", "song", "media"].includes(b.type) ? b.type : "item";

    const doc = {
      planId, type,
      title: String(b.title || (type === "header" ? "Header" : type === "song" ? "New Song" : type === "media" ? "New Media" : "New Item")).trim(),
      description: b.description || "",
      lengthSec: Number(b.lengthSec) || 0,
      placement: ["before", "during", "after"].includes(b.placement) ? b.placement : "during",
      duringAll: b.duringAll !== false,
      timeIds: Array.isArray(b.timeIds) ? b.timeIds.map(OID).filter(Boolean) : [],
      keyName: b.keyName || "",
    };
    // Song din bibliotecă
    if (type === "song" && b.songId) {
      const song = await PcSong.findOne(scoped(req, { _id: OID(b.songId) })).lean();
      if (song) { doc.songId = song._id; doc.title = song.title; doc.keyName = b.keyName || song.defaultKey || ""; if (!doc.lengthSec) doc.lengthSec = song.lengthSec || 0; }
    }

    // poziție în ordine: după afterItemId, altfel la final
    if (b.afterItemId) {
      const after = await PcPlanItem.findOne(scoped(req, { _id: OID(b.afterItemId) })).select("sortOrder").lean();
      const at = after ? after.sortOrder : 0;
      await PcPlanItem.updateMany(scoped(req, { planId, sortOrder: { $gt: at } }), { $inc: { sortOrder: 1 } });
      doc.sortOrder = at + 1;
    } else {
      const last = await PcPlanItem.findOne(scoped(req, { planId })).sort({ sortOrder: -1 }).select("sortOrder").lean();
      doc.sortOrder = last ? last.sortOrder + 1 : 0;
    }
    const item = await PcPlanItem.create(stamp(req, doc));
    res.status(201).json({ id: item._id });
  } catch (err) {
    console.error("[pc] POST /plans/:id/items:", err.message);
    res.status(500).json({ error: "Eroare la adăugarea itemului: " + err.message });
  }
});

/* ───────── PATCH /:id/items/:itemId — editează item ───────── */
router.patch("/:id/items/:itemId", requireCan("services.editOrder"), async (req, res) => {
  try {
    const itemId = OID(req.params.itemId);
    if (!itemId) return res.status(400).json({ error: "ID invalid" });
    const b = req.body || {};
    const set = {};
    if (b.title !== undefined) set.title = String(b.title);
    if (b.description !== undefined) set.description = String(b.description);
    if (b.lengthSec !== undefined) set.lengthSec = Number(b.lengthSec) || 0;
    if (b.placement !== undefined && ["before", "during", "after"].includes(b.placement)) set.placement = b.placement;
    if (b.duringAll !== undefined) set.duringAll = !!b.duringAll;
    if (Array.isArray(b.timeIds)) set.timeIds = b.timeIds.map(OID).filter(Boolean);
    if (b.keyName !== undefined) set.keyName = String(b.keyName);
    // Secvență one-time pt. acest plan (Edit Sequence from a plan).
    if (Array.isArray(b.sequence)) set.sequence = b.sequence.map((s) => String(s)).filter(Boolean);
    // Edit a song from a plan: schimbă aranjamentul / cheia linkate (keyName se auto-rezolvă).
    if (b.arrangementId !== undefined) {
      const aid = OID(b.arrangementId);
      set.arrangementId = aid;
      if (aid) {
        const arr = await PcArrangement.findOne(scoped(req, { _id: aid })).select("_id").lean();
        if (!arr) return res.status(400).json({ error: "Aranjament inexistent." });
      }
    }
    if (b.keyId !== undefined) {
      const kid = OID(b.keyId);
      set.keyId = kid;
      if (kid) {
        const key = await PcKey.findOne(scoped(req, { _id: kid })).select("startKey").lean();
        if (!key) return res.status(400).json({ error: "Cheie inexistentă." });
        set.keyName = key.startKey || "";
      } else if (b.keyName === undefined) {
        set.keyName = ""; // cheie scoasă → curăță badge-ul
      }
    }
    const p = await PcPlanItem.findOneAndUpdate(scoped(req, { _id: itemId }), { $set: set }, { new: true }).select("_id arrangementId sequence").lean();
    if (!p) return res.status(404).json({ error: "Item inexistent" });
    // „Update Arrangement Sequence" — salvează secvența și pe aranjament (permanent).
    if (b.updateArrangementSequence && Array.isArray(b.sequence) && p.arrangementId) {
      await PcArrangement.updateOne(scoped(req, { _id: p.arrangementId }), { $set: { sequence: set.sequence } });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[pc] PATCH /plans/:id/items/:itemId:", err.message);
    res.status(500).json({ error: "Eroare la salvarea itemului." });
  }
});

/* ───────── DELETE /:id/items/:itemId ───────── */
router.delete("/:id/items/:itemId", requireCan("services.editOrder"), async (req, res) => {
  try {
    const itemId = OID(req.params.itemId);
    const p = await PcPlanItem.findOneAndUpdate(scoped(req, { _id: itemId }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!p) return res.status(404).json({ error: "Item inexistent" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[pc] DELETE /plans/:id/items/:itemId:", err.message);
    res.status(500).json({ error: "Eroare la ștergere." });
  }
});

/* ───────── POST /:id/items/reorder — reordonează (listă de id-uri) ───────── */
router.post("/:id/items/reorder", requireCan("services.editOrder"), async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.itemIds) ? req.body.itemIds : [];
    for (let i = 0; i < ids.length; i++) {
      const oid = OID(ids[i]);
      if (oid) await PcPlanItem.updateOne(scoped(req, { _id: oid }), { $set: { sortOrder: i } });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[pc] POST /plans/:id/items/reorder:", err.message);
    res.status(500).json({ error: "Eroare la reordonare." });
  }
});

/* ───────── POST /:id/items/:itemId/leaders — adaugă lider (persoană SAU poziție) ───────── */
router.post("/:id/items/:itemId/leaders", requireCan("services.editOrder"), async (req, res) => {
  try {
    const itemId = OID(req.params.itemId);
    const personId = OID(req.body?.personId);
    const positionId = OID(req.body?.positionId);
    if (!personId && !positionId) return res.status(400).json({ error: "Trimite personId sau positionId." });
    const entry = {};
    if (personId) entry.personId = personId;
    if (positionId) entry.positionId = positionId;
    const p = await PcPlanItem.findOneAndUpdate(
      scoped(req, { _id: itemId }),
      { $addToSet: { leaders: entry } },
      { new: true }
    ).select("_id").lean();
    if (!p) return res.status(404).json({ error: "Item inexistent" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[pc] POST /plans/:id/items/:itemId/leaders:", err.message);
    res.status(500).json({ error: "Eroare la adăugarea liderului." });
  }
});

/* ───────── DELETE /:id/items/:itemId/leaders — scoate lider ───────── */
router.delete("/:id/items/:itemId/leaders", requireCan("services.editOrder"), async (req, res) => {
  try {
    const itemId = OID(req.params.itemId);
    const personId = OID(req.query.personId);
    const positionId = OID(req.query.positionId);
    const pull = {};
    if (personId) pull.personId = personId;
    if (positionId) pull.positionId = positionId;
    await PcPlanItem.updateOne(scoped(req, { _id: itemId }), { $pull: { leaders: pull } });
    // curăță și leaderId legacy dacă e aceeași persoană
    if (personId) await PcPlanItem.updateOne(scoped(req, { _id: itemId, leaderId: personId }), { $set: { leaderId: null } });
    res.json({ ok: true });
  } catch (err) {
    console.error("[pc] DELETE /plans/:id/items/:itemId/leaders:", err.message);
    res.status(500).json({ error: "Eroare la scoaterea liderului." });
  }
});

/* ───────── GET /:id/leader-search — caută persoane + poziții pt. „Add leader" ───────── */
router.get("/:id/leader-search", requireCan("services.editOrder"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    const q = String(req.query.q || "").trim();
    const rx = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
    const plan = await PcPlan.findOne(scoped(req, { _id: planId })).select("serviceTypeId").lean();
    // poziții din echipele service-type-ului
    const teams = await PcTeam.find(scoped(req, { serviceTypeId: plan?.serviceTypeId })).select("_id name").lean();
    const teamName = Object.fromEntries(teams.map((t) => [String(t._id), t.name]));
    let positions = await PcPosition.find(scoped(req, { teamId: { $in: teams.map((t) => t._id) } })).select("name teamId").lean();
    if (rx) positions = positions.filter((p) => rx.test(p.name));
    let people = [];
    if (q) {
      people = await PcPerson.find(scoped(req, { status: "active", $or: [{ firstName: rx }, { lastName: rx }] }))
        .collation({ locale: "ro", strength: 1 }).limit(15).select("firstName lastName avatar").lean();
    }
    res.json({
      positions: positions.slice(0, 15).map((p) => ({ id: p._id, name: p.name, team: teamName[String(p.teamId)] || "" })),
      people: people.map((p) => personMini(p)),
    });
  } catch (err) {
    console.error("[pc] GET /plans/:id/leader-search:", err.message);
    res.status(500).json({ error: "Eroare la căutare." });
  }
});

/* ───────── GET /:id/teams — echipe grupate (My/Other) cu poziții + oameni + status ───────── */
router.get("/:id/teams", requireCan("people.view"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid" });
    const plan = await PcPlan.findOne(scoped(req, { _id: id })).select("serviceTypeId").lean();
    if (!plan) return res.status(404).json({ error: "Plan inexistent." });
    const tz = await campusTz(req);
    const [assignments, needed, planTimes] = await Promise.all([
      PcAssignment.find(scoped(req, { planId: id })).lean(),
      PcNeededPosition.find(scoped(req, { planId: id })).lean(),
      PcPlanTime.find(scoped(req, { planId: id, type: "service" })).sort({ startsAt: 1 }).lean(),
    ]);
    // orele de serviciu (pt. „Needed per oră" / split-teams)
    const fmtTime = (d) => (d ? new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(d)) : "");
    const serviceTimes = planTimes.map((t) => ({ id: String(t._id), label: t.name ? `${fmtTime(t.startsAt)} ${t.name}` : fmtTime(t.startsAt) }));
    // TEAMS pre-concepute: TOATE echipele service type-ului (nu doar cele cu asignări) → apar si cele goale.
    const teams = await PcTeam.find(scoped(req, { serviceTypeId: plan.serviceTypeId, archived: false })).sort({ sortOrder: 1 }).lean();
    const teamIds = teams.map((t) => t._id);
    const [positions, people] = await Promise.all([
      PcPosition.find(scoped(req, { teamId: { $in: teamIds } })).sort({ sortOrder: 1 }).lean(),
      PcPerson.find(scoped(req, { _id: { $in: assignments.map((a) => a.personId) } })).select("firstName lastName avatar").lean(),
    ]);
    const posName = Object.fromEntries(positions.map((p) => [String(p._id), p.name]));
    const personById = Object.fromEntries(people.map((p) => [String(p._id), p]));

    // echipele pe care le conduce viewerul
    const vpid = await viewerPersonId(req);
    const myLedTeamIds = new Set(
      (await PcTeamMember.find(scoped(req, { personId: vpid || null, isLeader: true })).select("teamId").lean()).map((m) => String(m.teamId))
    );
    const myAssignedTeamIds = new Set(assignments.filter((a) => vpid && String(a.personId) === String(vpid)).map((a) => String(a.teamId)));

    const teamPositions = {}; // teamId → [poziții sortate]
    positions.forEach((p) => (teamPositions[String(p.teamId)] = teamPositions[String(p.teamId)] || []).push(p));

    const buildTeam = (team) => {
      const tAssigns = assignments.filter((a) => String(a.teamId) === String(team._id));
      const tNeeded = needed.filter((n) => String(n.teamId) === String(team._id));
      // Toate pozițiile echipei (ca în PCO: fiecare poziție e un rând, chiar goală) + câmp pt. asignări fără poziție.
      const order = (teamPositions[String(team._id)] || []).map((p) => ({ positionId: p._id, positionName: p.name }));
      const groups = {}; // positionId|__none → {positionId, positionName, people[], needed}
      const ensure = (positionId, positionName) => {
        const key = positionId ? String(positionId) : "__none";
        return (groups[key] = groups[key] || { positionId: positionId || null, positionName: positionName || "", people: [], needed: 0, timeNeeds: {} });
      };
      order.forEach((o) => ensure(o.positionId, o.positionName));
      // #1: DECLINED RĂMÂNE pe poziție (pt. admin — evidență); la user (mobil) se va ascunde.
      tAssigns.forEach((a) => {
        const base = a.isGuest
          ? { name: a.guestName || "Invitat", initials: (a.guestName || "?").slice(0, 2).toUpperCase(), avatar: "" }
          : personMini(personById[String(a.personId)]);
        ensure(a.positionId, posName[String(a.positionId)]).people.push({
          ...base, personId: a.personId, assignmentId: a._id, status: a.status, isGuest: !!a.isGuest,
        });
      });
      tNeeded.forEach((n) => {
        const grp = ensure(n.positionId, posName[String(n.positionId)]);
        grp.needed += (n.count || 0);
        const k = n.timeId ? String(n.timeId) : "plan"; // „plan" = Needed pe tot planul (nelegat de o oră)
        grp.timeNeeds[k] = (grp.timeNeeds[k] || 0) + (n.count || 0);
      });
      // Păstrăm pozițiile chiar goale (le arătăm cu „Needed"); scoatem doar „__none" dacă e complet gol.
      if (groups.__none && !groups.__none.people.length && !groups.__none.needed) delete groups.__none;
      // ordonăm: întâi după ordinea pozițiilor, apoi ce a rămas
      const ordered = order.map((o) => groups[String(o.positionId)]).filter(Boolean);
      Object.values(groups).forEach((g) => { if (!ordered.includes(g)) ordered.push(g); });
      return {
        teamId: team._id,
        name: team.name,
        counts: {
          confirmed: tAssigns.filter((a) => a.status === "confirmed").length,
          declined: tAssigns.filter((a) => a.status === "declined").length,
          unconfirmed: tAssigns.filter((a) => a.status === "unconfirmed").length,
        },
        unsentEmails: tAssigns.filter((a) => !a.notificationSentAt && a.status !== "declined").length,
        groups: ordered,
      };
    };

    const myTeams = [], otherTeams = [];
    teams.forEach((t) => {
      const data = buildTeam(t);
      (myLedTeamIds.has(String(t._id)) || myAssignedTeamIds.has(String(t._id)) ? myTeams : otherTeams).push(data);
    });
    res.json({ myTeams, otherTeams, serviceTimes });
  } catch (err) {
    console.error("[pc] GET /plans/:id/teams:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea echipelor." });
  }
});

/* ───────── GET /:id/schedulable — echipe+poziții+oameni pt. „Add People" ───────── */
router.get("/:id/schedulable", requireCan("services.schedule"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    const plan = await PcPlan.findOne(scoped(req, { _id: planId })).select("serviceTypeId").lean();
    const teams = await PcTeam.find(scoped(req, { serviceTypeId: plan?.serviceTypeId, archived: false })).select("name").sort({ sortOrder: 1 }).lean();
    const positions = await PcPosition.find(scoped(req, { teamId: { $in: teams.map((t) => t._id) } })).select("name teamId").sort({ sortOrder: 1 }).lean();
    const tz = await campusTz(req);
    const sTimes = await PcPlanTime.find(scoped(req, { planId, type: "service" })).sort({ startsAt: 1 }).lean();
    const q = String(req.query.q || "").trim();
    let people = [];
    const rx = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
    const filter = scoped(req, { status: "active" });
    if (rx) filter.$or = [{ firstName: rx }, { lastName: rx }];
    people = await PcPerson.find(filter).collation({ locale: "ro", strength: 1 }).sort({ firstName: 1 }).limit(q ? 25 : 40).select("firstName lastName avatar").lean();
    res.json({
      teams: teams.map((t) => ({
        id: t._id, name: t.name,
        positions: positions.filter((p) => String(p.teamId) === String(t._id)).map((p) => ({ id: p._id, name: p.name })),
      })),
      people: people.map((p) => personMini(p)),
      serviceTimes: sTimes.map((t) => ({ id: t._id, label: `${fmtTime(t.startsAt, tz)} (${fmtDate(t.startsAt, tz)})` })),
    });
  } catch (err) {
    console.error("[pc] GET /plans/:id/schedulable:", err.message);
    res.status(500).json({ error: "Eroare la lista de programare." });
  }
});

/* ───────── POST /:id/assignments — programează o persoană pe o poziție ───────── */
router.post("/:id/assignments", requireCan("services.schedule"), async (req, res) => {
  try {
    const crypto = require("crypto");
    const planId = OID(req.params.id);
    const b = req.body || {};
    const teamId = OID(b.teamId), positionId = OID(b.positionId);
    // Invitat one-time: nume liber, FĂRĂ PcPerson (fără istoric). personId = id fictiv unic → nu apare în liste.
    const guestName = String(b.guestName || "").trim();
    const isGuest = !!guestName || !!b.isGuest;
    let personId = OID(b.personId);
    if (isGuest && !personId) personId = new mongoose.Types.ObjectId();
    if (!personId || !teamId) return res.status(400).json({ error: "personId/guestName și teamId sunt necesare." });
    // invitatul apare implicit Confirmed (cerință lider)
    const status = ["confirmed", "unconfirmed", "declined"].includes(b.status) ? b.status : (isGuest ? "confirmed" : "unconfirmed");
    const doc = {
      planId, personId, teamId, positionId: positionId || null,
      timeIds: Array.isArray(b.timeIds) ? b.timeIds.map(OID).filter(Boolean) : [],
      status, source: isGuest ? "guest" : (b.source || "manual"),
      prepared: !!b.prepared,
      repliesToPersonId: OID(b.repliesToPersonId) || null,
      notes: b.notes || "",
      isGuest, guestName: isGuest ? guestName : "",
      isTemporaryPosition: !!b.isTemporaryPosition,
      tempPositionName: b.tempPositionName || "",
      responseToken: crypto.randomBytes(18).toString("hex"),
    };
    // upsert pe (plan, position, person) ca să nu dublăm — invitații sunt mereu noi (id fictiv).
    // IMPORTANT: căutăm INCLUSIV asignări șterse soft (deletedAt setat), altfel indexul unic
    // {orgId,planId,positionId,personId} dă E11000 când repui pe cineva șters anterior. Le REÎNVIEM.
    const existing = (positionId && !isGuest)
      ? await PcAssignment.findOne({ orgId: req.pcOrgId, planId, positionId, personId }).select("_id").lean()
      : null;
    let assignment;
    if (existing) {
      assignment = await PcAssignment.findOneAndUpdate({ _id: existing._id }, { $set: { ...doc, deletedAt: null } }, { new: true }).lean();
    } else {
      assignment = (await PcAssignment.create(stamp(req, doc))).toObject();
    }
    // scade un „Needed" dacă există pe poziția asta: întâi al orei la care e asignat (dacă există target pe acea oră), altfel plan-wide
    if (positionId) {
      const tid = (doc.timeIds && doc.timeIds[0]) || null;
      let np = tid ? await PcNeededPosition.findOne(scoped(req, { planId, teamId, positionId, timeId: tid, count: { $gt: 0 } })) : null;
      if (!np) np = await PcNeededPosition.findOne(scoped(req, { planId, teamId, positionId, timeId: null, count: { $gt: 0 } }));
      if (!np) np = await PcNeededPosition.findOne(scoped(req, { planId, teamId, positionId, count: { $gt: 0 } }));
      if (np) { np.count -= 1; await np.save(); }
    }
    res.status(201).json({ id: assignment._id });
  } catch (err) {
    console.error("[pc] POST /plans/:id/assignments:", err.message);
    res.status(500).json({ error: "Eroare la programare: " + err.message });
  }
});

/* ───────── PATCH /:id/assignments/:aid — editează o asignare (status/poziție/note/times) ─────────
   Modalul „Editing Scheduled Person". NU trimite email (schimbarea de status e locală). */
router.patch("/:id/assignments/:aid", requireCan("services.schedule"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    const cur = await PcAssignment.findOne(scoped(req, { _id: OID(req.params.aid) })).lean();
    if (!cur) return res.status(404).json({ error: "Programare inexistentă." });
    const b = req.body || {};
    const set = {};
    if (["confirmed", "unconfirmed", "declined"].includes(b.status)) {
      set.status = b.status;
      if (b.status === "confirmed") { set.acceptedAt = new Date(); if (cur.status === "declined") { set.declinedAt = null; set.declineReason = ""; } }
      if (b.status === "declined") { set.declinedAt = new Date(); set.declineReason = b.declineReason || ""; if (cur.status === "confirmed") set.declinedAfterConfirm = true; }
    }
    if (b.positionId !== undefined) set.positionId = OID(b.positionId) || null;
    if (b.teamId !== undefined) set.teamId = OID(b.teamId);
    if (Array.isArray(b.timeIds)) set.timeIds = b.timeIds.map(OID).filter(Boolean);
    if (typeof b.notes === "string") set.notes = b.notes;
    if (typeof b.prepared === "boolean") set.prepared = b.prepared;
    if (b.repliesToPersonId !== undefined) set.repliesToPersonId = OID(b.repliesToPersonId) || null;
    const a = await PcAssignment.findOneAndUpdate(scoped(req, { _id: OID(req.params.aid) }), { $set: set }, { new: true }).select("_id status").lean();

    // #1: când cineva REFUZĂ, poziția rămâne „de completat" → +1 Needed. Când revine din declin → −1 Needed.
    const newStatus = set.status || cur.status;
    if (cur.positionId && cur.teamId) {
      if (cur.status !== "declined" && newStatus === "declined") {
        await PcNeededPosition.findOneAndUpdate(scoped(req, { planId, teamId: cur.teamId, positionId: cur.positionId }), { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true });
      } else if (cur.status === "declined" && newStatus !== "declined") {
        const np = await PcNeededPosition.findOne(scoped(req, { planId, teamId: cur.teamId, positionId: cur.positionId }));
        if (np && np.count > 0) { np.count -= 1; await np.save(); }
      }
    }
    res.json({ ok: true, status: a.status });
  } catch (err) {
    console.error("[pc] PATCH /plans/:id/assignments/:aid:", err.message);
    res.status(500).json({ error: "Eroare la editare: " + err.message });
  }
});

/* ───────── DELETE /:id/assignments/:aid ───────── */
router.delete("/:id/assignments/:aid", requireCan("services.schedule"), async (req, res) => {
  try {
    const a = await PcAssignment.findOneAndUpdate(scoped(req, { _id: OID(req.params.aid) }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!a) return res.status(404).json({ error: "Programare inexistentă." });
    res.json({ ok: true });
  } catch (err) {
    console.error("[pc] DELETE /plans/:id/assignments/:aid:", err.message);
    res.status(500).json({ error: "Eroare la ștergere." });
  }
});

/* ───────── GET /:id/assignments/:aid — detaliu complet pt. „Editing Scheduled Person" ─────────
   email + Service/Rehearsal Times (bifate = în timeIds) + timeline (Prepared/Sent/Read/Responded). READ. */
router.get("/:id/assignments/:aid", requireCan("people.view"), async (req, res) => {
  try {
    const planId = OID(req.params.id), aid = OID(req.params.aid);
    const a = await PcAssignment.findOne(scoped(req, { _id: aid, planId })).lean();
    if (!a) return res.status(404).json({ error: "Programare inexistentă." });
    const tz = await campusTz(req);
    const [person, pos, team, times, teamPositions] = await Promise.all([
      PcPerson.findOne(scoped(req, { _id: a.personId })).select("firstName lastName avatar emails").lean(),
      a.positionId ? PcPosition.findOne(scoped(req, { _id: a.positionId })).select("name").lean() : null,
      a.teamId ? PcTeam.findOne(scoped(req, { _id: a.teamId })).select("name").lean() : null,
      PcPlanTime.find(scoped(req, { planId })).sort({ startsAt: 1 }).lean(),
      a.teamId ? PcPosition.find(scoped(req, { teamId: a.teamId })).select("name").sort({ sortOrder: 1, name: 1 }).lean() : [],
    ]);
    const checked = new Set((a.timeIds || []).map(String));
    const tlabel = (t) => `${fmtWeekday(t.startsAt, tz)} ${fmtTime(t.startsAt, tz)}${t.name ? " · " + t.name : ""}`;
    // bifat = în timeIds; dacă asignarea n-are timeIds setate, considerăm toate bifate (default PCO)
    const mapTimes = (type) => times.filter((t) => t.type === type).map((t) => ({ id: t._id, label: tlabel(t), checked: checked.size ? checked.has(String(t._id)) : true }));
    const fdt = (d) => (d ? `${fmtDate(d, tz)} ${fmtTime(d, tz)}` : "");
    res.json({
      email: person?.emails?.find((e) => e.primary)?.address || person?.emails?.[0]?.address || "",
      teamName: team?.name || "", positionName: a.isTemporaryPosition ? (a.tempPositionName || "") : (pos?.name || ""),
      positionId: a.positionId || null,
      positions: (teamPositions || []).map((p) => ({ id: p._id, name: p.name })), // reassign (Schedule Person advanced)
      status: a.status, notes: a.notes || "", prepared: !!a.prepared,
      declineReason: a.declineReason || "",
      serviceTimes: mapTimes("service"), rehearsalTimes: mapTimes("rehearsal"),
      // „Responded" reflectă răspunsul: data reală dacă există; altfel, dacă e deja confirmat/refuzat
      // (ex. setat de admin sau import PCO fără timestamp), marchează pasul ca făcut cu eticheta de status.
      timeline: {
        preparedAt: fdt(a.preparedAt), sentAt: fdt(a.notificationSentAt), readAt: fdt(a.readAt),
        respondedAt: fdt(a.acceptedAt || a.declinedAt) || (a.status === "confirmed" ? "Confirmat" : a.status === "declined" ? "Refuzat" : ""),
      },
    });
  } catch (err) {
    console.error("[pc] GET /plans/:id/assignments/:aid:", err.message);
    res.status(500).json({ error: "Eroare la detaliul programării." });
  }
});

/* ───────── PATCH /positions/:positionId/rules — reguli de recomandare per poziție (lider) ─────────
   defaultGender (M/F/any), defaultProgram/SIM (1/2/any), targetPerMonth (de câte ori/lună), instructions. */
router.patch("/positions/:positionId/rules", requireCan("services.schedule"), async (req, res) => {
  try {
    const positionId = OID(req.params.positionId);
    if (!positionId) return res.status(400).json({ error: "ID invalid." });
    const b = req.body || {};
    const set = {};
    if (["M", "F", "any"].includes(b.defaultGender)) set.defaultGender = b.defaultGender;
    if (["1", "2", "any"].includes(String(b.defaultProgram))) set.defaultProgram = String(b.defaultProgram);
    if (b.targetPerMonth != null) set["recommendRule.targetPerMonth"] = Math.max(0, Math.min(31, parseInt(b.targetPerMonth, 10) || 0));
    if (typeof b.instructions === "string") set.instructions = b.instructions;
    if (!Object.keys(set).length) return res.status(400).json({ error: "Nimic de salvat." });
    const pos = await PcPosition.findOneAndUpdate(scoped(req, { _id: positionId }), { $set: set }, { new: true }).lean();
    if (!pos) return res.status(404).json({ error: "Poziție inexistentă." });
    res.json({ ok: true, defaults: { gender: pos.defaultGender, program: pos.defaultProgram, targetPerMonth: pos.recommendRule?.targetPerMonth || 0 }, instructions: pos.instructions || "" });
  } catch (err) {
    console.error("[pc] PATCH /plans/positions/:positionId/rules:", err.message);
    res.status(500).json({ error: "Eroare la salvarea regulilor." });
  }
});

/* ───────── Fișiere/„manual" per POZIȚIE (lider încarcă; userii le văd după rol) ─────────
   Reutilizabile pe toate planurile acelei poziții. Instrucțiunile text sunt pe PcPosition.instructions. */
router.get("/positions/:positionId/files", requireCan("people.view"), async (req, res) => {
  try {
    const positionId = OID(req.params.positionId);
    const files = await PcPlanFile.find(scoped(req, { positionId, scope: "position" })).sort({ sortOrder: 1 }).lean();
    res.json({ files: files.map((f) => ({ id: f._id, name: f.name, kind: f.kind, url: f.url || null })) });
  } catch (err) { console.error("[pc] GET position files:", err.message); res.status(500).json({ error: "Eroare." }); }
});
router.post("/positions/:positionId/files", requireCan("services.schedule"), async (req, res) => {
  try {
    const positionId = OID(req.params.positionId);
    const pos = await PcPosition.findOne(scoped(req, { _id: positionId })).select("_id").lean();
    if (!pos) return res.status(404).json({ error: "Poziție inexistentă." });
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nume fișier lipsă." });
    const doc = await PcPlanFile.create(stamp(req, { positionId, scope: "position", name, url: String(req.body?.url || "").trim(), kind: req.body?.kind || "upload" }));
    res.status(201).json({ id: doc._id, name: doc.name, url: doc.url || null, kind: doc.kind });
  } catch (err) { console.error("[pc] POST position file:", err.message); res.status(500).json({ error: "Eroare la fișier." }); }
});
router.delete("/positions/:positionId/files/:fileId", requireCan("services.schedule"), async (req, res) => {
  try {
    const f = await PcPlanFile.findOneAndUpdate(scoped(req, { _id: OID(req.params.fileId), positionId: OID(req.params.positionId) }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!f) return res.status(404).json({ error: "Fișier inexistent." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE position file:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── GET /:id/recommend — bara dreaptă: candidați pt. o poziție, cu „due" + conflicte ─────────
   Sortare: fără conflict întâi, apoi cei care n-au mai fost de mult pe poziție (due). FĂRĂ email. */
router.get("/:id/recommend", requireCan("services.schedule"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    const teamId = OID(req.query.teamId), positionId = OID(req.query.positionId);
    const plan = await PcPlan.findOne(scoped(req, { _id: planId })).select("sortDate serviceTypeId").lean();
    if (!plan) return res.status(404).json({ error: "Plan inexistent." });
    const planDate = new Date(plan.sortDate);
    const dayStart = new Date(planDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const pos = positionId ? await PcPosition.findOne(scoped(req, { _id: positionId })).lean() : null;
    // SIM-ul poziției = SIM-ul echipei (din nume, ex. „Asimilare (SIM 2)") → recomandăm întâi oamenii de pe acel SIM
    const teamR = teamId ? await PcTeam.findOne(scoped(req, { _id: teamId })).select("name").lean() : null;
    const teamSim = (() => { const m = String(teamR?.name || "").match(/\(\s*(?:sim\s*)?([12])\s*\)/i); return m ? m[1] : ""; })();

    // orele de serviciu ale planului (pt. selectorul de oră la asignare / split-teams)
    const tzR = await campusTz(req);
    const sTimesR = await PcPlanTime.find(scoped(req, { planId, type: "service" })).sort({ startsAt: 1 }).lean();
    const fmtTR = (d) => (d ? new Intl.DateTimeFormat("en-GB", { timeZone: tzR, hour: "2-digit", minute: "2-digit" }).format(new Date(d)) : "");
    const serviceTimes = sTimesR.map((t) => ({ id: String(t._id), label: t.name ? `${fmtTR(t.startsAt)} ${t.name}` : fmtTR(t.startsAt) }));

    // candidați: activi, disponibili (schedulingStatus available/gol). Gen/program NU se filtrează hard în
    // backend (datele de gen/program lipsesc din import → ar goli lista); se PRE-SELECTează în bară și se
    // aplică acolo (SIM din nume, gen doar dacă există date). Regula se întoarce în `defaults`.
    const q = String(req.query.q || "").trim();
    const filter = scoped(req, { status: "active", schedulingStatus: { $in: ["available", null] } });
    if (q) { const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); filter.$or = [{ firstName: rx }, { lastName: rx }, { nickname: rx }]; }
    const people = await PcPerson.find(filter).collation({ locale: "ro", strength: 1 }).limit(q ? 40 : 400).select("firstName lastName avatar gender programIntent").lean();
    const targetPerMonth = Number(pos?.recommendRule?.targetPerMonth) || 0;
    const monthStart = new Date(planDate); monthStart.setDate(monthStart.getDate() - 30);
    const pids = people.map((p) => p._id);

    // fereastră ±180z pt. recență + conflicte (bounded); + blockouts care acoperă ziua
    const winStart = new Date(planDate); winStart.setDate(winStart.getDate() - 180);
    const winEnd = new Date(planDate); winEnd.setDate(winEnd.getDate() + 180);
    const winPlans = await PcPlan.find(scoped(req, { sortDate: { $gte: winStart, $lte: winEnd } })).select("sortDate serviceTypeId").lean();
    const planDateById = Object.fromEntries(winPlans.map((p) => [String(p._id), new Date(p.sortDate)]));
    const planStById = Object.fromEntries(winPlans.map((p) => [String(p._id), String(p.serviceTypeId || "")]));
    const stAll = await PcServiceType.find(scoped(req)).select("name").lean();
    const stNames = Object.fromEntries(stAll.map((s) => [String(s._id), s.name]));
    const [assigns, blockouts] = await Promise.all([
      PcAssignment.find(scoped(req, { personId: { $in: pids }, planId: { $in: winPlans.map((p) => p._id) }, status: { $ne: "declined" } })).select("personId planId positionId").lean(),
      PcBlockout.find(scoped(req, { personId: { $in: pids } })).select("personId startDate endDate type reason").lean(),
    ]);
    const WEEK = 7 * 864e5;
    const byPerson = {}; assigns.forEach((a) => (byPerson[String(a.personId)] = byPerson[String(a.personId)] || []).push(a));
    const blkByPerson = {}; blockouts.forEach((b) => (blkByPerson[String(b.personId)] = blkByPerson[String(b.personId)] || []).push(b));
    const dayKey = dayStart.toISOString().slice(0, 10);

    const rows = people.map((p) => {
      const list = (byPerson[String(p._id)] || []).map((a) => ({ ...a, date: planDateById[String(a.planId)] })).filter((a) => a.date);
      // cea mai apropiată asignare (orice poziție) → badge săptămâni (semnat)
      let nearest = null, nearestAbs = Infinity;
      let lastAtPosWeeks = null; // de câte săpt. n-a mai fost pe poziția asta (pt. „due")
      let alreadyHere = false, sameDayCount = 0, monthCount = 0;
      for (const a of list) {
        const diff = a.date.getTime() - planDate.getTime();
        if (Math.abs(diff) < nearestAbs && String(a.planId) !== String(planId)) { nearestAbs = Math.abs(diff); nearest = diff; }
        if (positionId && String(a.positionId) === String(positionId)) {
          if (String(a.planId) === String(planId)) alreadyHere = true;
          else if (diff < 0) { const w = Math.round(-diff / WEEK); if (lastAtPosWeeks == null || w < lastAtPosWeeks) lastAtPosWeeks = w; }
          // de câte ori a fost pe poziția asta în ultimele 30 de zile (pt. „target/lună")
          if (a.date >= monthStart && a.date < planDate) monthCount++;
        }
        // conflict de timp: altă asignare în aceeași zi (alt plan)
        if (String(a.planId) !== String(planId) && a.date.toISOString().slice(0, 10) === dayKey) sameDayCount++;
      }
      const covers = (b) => (!b.startDate || b.startDate <= dayKey) && (!b.endDate || b.endDate >= dayKey);
      const myBlk = blkByPerson[String(p._id)] || [];
      // churchBlock (blocat de planificator / on-break) care acoperă ziua → persoana NU apare deloc în listă
      const churchBlocked = myBlk.some((b) => b.type === "churchBlock" && covers(b));
      const weeks = nearest == null ? null : Math.round(nearest / WEEK);
      const weeksLabel = weeks == null ? "" : (weeks >= 0 ? `+${weeks}w` : `${weeks}w`);
      // CONFLICTE — pot fi MAI MULTE simultan (deja planificat + blockout), cu motiv/dată.
      // „Deja planificat" = orice asignare în ACEEAȘI ZI, INCLUSIV alte poziții pe ACEST plan
      // (mai puțin poziția curentă). Așa apare galbenul chiar dacă e pus de 2-5 ori în aceeași săptămână.
      const conflicts = [];
      const sched = list.filter((a) => a.date.toISOString().slice(0, 10) === dayKey
        && !(String(a.planId) === String(planId) && String(a.positionId) === String(positionId)));
      if (sched.length) {
        const samePlan = sched.filter((a) => String(a.planId) === String(planId));
        const otherPlan = sched.filter((a) => String(a.planId) !== String(planId));
        const parts = [];
        if (otherPlan.length) { const sts = [...new Set(otherPlan.map((a) => stNames[planStById[String(a.planId)]]).filter(Boolean))]; if (sts.length) parts.push(sts.join(", ")); }
        if (samePlan.length) parts.push(`${samePlan.length} poziție(i) pe acest plan`);
        conflicts.push({ type: "time", label: "Deja planificat în aceeași zi", detail: parts.join(" · ") || `${sched.length} slujire(i)` });
      }
      const bk = myBlk.find((b) => b.type !== "churchBlock" && covers(b));
      if (bk) {
        const range = bk.startDate === bk.endDate ? bk.startDate : `${bk.startDate} → ${bk.endDate}`;
        conflicts.push({ type: "blockout", label: "Blockout (indisponibil)", detail: [range, bk.reason].filter(Boolean).join(" · ") });
      }
      const conflict = conflicts[0] || null; // compat sortare
      const belowTarget = targetPerMonth > 0 && monthCount < targetPerMonth;
      return {
        id: p._id, name: [p.firstName, p.lastName].filter(Boolean).join(" "),
        initials: `${(p.firstName || "").charAt(0)}${(p.lastName || "").charAt(0)}`.toUpperCase(), avatar: p.avatar || "",
        gender: p.gender || "", programIntent: p.programIntent || "", weeksLabel, dueSort: lastAtPosWeeks == null ? 9999 : lastAtPosWeeks,
        monthCount, targetPerMonth, belowTarget,
        targetLabel: targetPerMonth > 0 ? `${monthCount}/${targetPerMonth}` : "",
        conflict, conflicts, alreadyHere, churchBlocked,
      };
    }).filter((r) => !r.churchBlocked); // exclude din liste pe cei cu blocaj de biserică

    // prioritate SIM: dacă poziția e pe un program (SIM1/SIM2), oamenii de pe ACEL SIM apar primii
    // (atât fără conflict, cât și cu conflict). Fără marker de SIM → fără prioritate (0).
    const simRank = (r) => (teamSim && r.programIntent === teamSim ? 0 : 1);
    // grupare + sortare: fără conflict — întâi SIM-ul poziției, apoi sub target, apoi „due" (demult), apoi nume
    const noConf = rows.filter((r) => !r.conflict && !r.alreadyHere)
      .sort((a, b) => (simRank(a) - simRank(b)) || (b.belowTarget - a.belowTarget) || (b.dueSort - a.dueSort) || a.name.localeCompare(b.name));
    const withConf = rows.filter((r) => r.conflict && !r.alreadyHere).sort((a, b) => (simRank(a) - simRank(b)) || a.name.localeCompare(b.name));
    const here = rows.filter((r) => r.alreadyHere);
    const needed = positionId ? (await PcNeededPosition.findOne(scoped(req, { planId, positionId })).select("count").lean())?.count || 0 : 0;
    res.json({
      positionName: pos?.name || "",
      neededCount: needed,
      alreadyHere: here,
      defaults: { gender: pos?.defaultGender || "any", program: pos?.defaultProgram || "any", targetPerMonth },
      instructions: pos?.instructions || "",
      serviceTimes,
      groups: [
        { label: "FĂRĂ CONFLICT", people: noConf },
        ...(withConf.length ? [{ label: `${withConf.length} CU CONFLICT`, people: withConf }] : []),
      ],
    });
  } catch (err) {
    console.error("[pc] GET /plans/:id/recommend:", err.message);
    res.status(500).json({ error: "Eroare la recomandări: " + err.message });
  }
});

/* ───────── POST /:id/assignments/copy — replică asignările unei echipe pe alta (SIM1→SIM2) ─────────
   Potrivește pozițiile după NUME. Status unconfirmed, FĂRĂ email. Idempotent (nu dublează). */
router.post("/:id/assignments/copy", requireCan("services.schedule"), async (req, res) => {
  try {
    const crypto = require("crypto");
    const planId = OID(req.params.id);
    const fromTeamId = OID(req.body?.fromTeamId), toTeamId = OID(req.body?.toTeamId);
    if (!fromTeamId || !toTeamId) return res.status(400).json({ error: "fromTeamId și toTeamId sunt necesare." });
    const [fromPos, toPos, srcAssigns] = await Promise.all([
      PcPosition.find(scoped(req, { teamId: fromTeamId })).select("name").lean(),
      PcPosition.find(scoped(req, { teamId: toTeamId })).select("name").lean(),
      PcAssignment.find(scoped(req, { planId, teamId: fromTeamId, status: { $ne: "declined" } })).lean(),
    ]);
    const toByName = {}; toPos.forEach((p) => (toByName[(p.name || "").trim().toLowerCase()] = p._id));
    const fromNameById = {}; fromPos.forEach((p) => (fromNameById[String(p._id)] = (p.name || "").trim().toLowerCase()));
    let copied = 0;
    for (const a of srcAssigns) {
      const destPosId = a.positionId ? toByName[fromNameById[String(a.positionId)] || ""] : null;
      if (!destPosId) continue; // poziție fără corespondent în echipa țintă
      const exists = await PcAssignment.findOne(scoped(req, { planId, positionId: destPosId, personId: a.personId })).select("_id").lean();
      if (exists) continue;
      await PcAssignment.create(stamp(req, {
        planId, teamId: toTeamId, positionId: destPosId, personId: a.personId,
        timeIds: [], status: "unconfirmed", source: "copy", prepared: false,
        responseToken: crypto.randomBytes(18).toString("hex"),
      }));
      copied++;
    }
    res.json({ ok: true, copied });
  } catch (err) {
    console.error("[pc] POST /plans/:id/assignments/copy:", err.message);
    res.status(500).json({ error: "Eroare la copiere: " + err.message });
  }
});

/* ───────── PUT /:id/needed — setează câte persoane sunt necesare pe (echipă, poziție) ─────────
   Celula „Needed" din Matrix (−/N/+). Upsert PcNeededPosition. FĂRĂ email. */
router.put("/:id/needed", requireCan("services.schedule"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    const teamId = OID(req.body?.teamId), positionId = OID(req.body?.positionId);
    const timeId = OID(req.body?.timeId); // null = Needed pe tot planul (comportament vechi); setat = Needed pe o oră
    const count = Math.max(0, Math.min(99, parseInt(req.body?.count, 10) || 0));
    if (!teamId || !positionId) return res.status(400).json({ error: "teamId și positionId sunt necesare." });
    const filter = scoped(req, { planId, teamId, positionId, timeId: timeId || null });
    if (count === 0) {
      await PcNeededPosition.deleteMany(filter);
    } else {
      const existing = await PcNeededPosition.findOne(filter);
      if (existing) { existing.count = count; await existing.save(); }
      else await PcNeededPosition.create(stamp(req, { planId, teamId, positionId, timeId: timeId || null, count }));
    }
    res.json({ ok: true, count, timeId: timeId ? String(timeId) : null });
  } catch (err) {
    console.error("[pc] PUT /plans/:id/needed:", err.message);
    res.status(500).json({ error: "Eroare la Needed: " + err.message });
  }
});

/* ───────── POST /:id/send-schedule-emails — trimite emailurile de programare (PRIORITAR) ───────── */
router.post("/:id/send-schedule-emails", requireCan("services.schedule"), async (req, res) => {
  try {
    const { sendScheduleEmail } = require("../services/scheduleEmail");
    const planId = OID(req.params.id);
    const teamId = OID(req.body?.teamId); // opțional: doar o echipă
    const tz = await campusTz(req);

    const plan = await PcPlan.findOne(scoped(req, { _id: planId })).lean();
    if (!plan) return res.status(404).json({ error: "Plan inexistent." });
    const st = await PcServiceType.findOne(scoped(req, { _id: plan.serviceTypeId })).select("name").lean();
    const org = await PcOrg.findById(req.pcOrgId).select("name").lean();
    const dateLabel = fmtDate(plan.sortDate, tz);

    // assignments ne-trimise, ne-declinate
    const filter = scoped(req, { planId, notificationSentAt: null, status: { $ne: "declined" } });
    if (teamId) filter.teamId = teamId;
    const assigns = await PcAssignment.find(filter).lean();
    if (assigns.length === 0) return res.json({ ok: true, sent: 0 });

    const [people, positions, times] = await Promise.all([
      PcPerson.find(scoped(req, { _id: { $in: assigns.map((a) => a.personId) } })).select("firstName lastName emails").lean(),
      PcPosition.find(scoped(req, { _id: { $in: assigns.map((a) => a.positionId).filter(Boolean) } })).select("name").lean(),
      PcPlanTime.find(scoped(req, { planId })).lean(),
    ]);
    const personById = Object.fromEntries(people.map((p) => [String(p._id), p]));
    const posName = Object.fromEntries(positions.map((p) => [String(p._id), p.name]));
    const timeById = Object.fromEntries(times.map((t) => [String(t._id), t]));

    // grupează pe persoană
    const byPerson = {};
    assigns.forEach((a) => (byPerson[String(a.personId)] = byPerson[String(a.personId)] || []).push(a));

    let sent = 0;
    for (const [pid, list] of Object.entries(byPerson)) {
      const person = personById[pid];
      const email = person?.emails?.find((e) => e.primary)?.address || person?.emails?.[0]?.address;
      if (!email) continue;
      const assignments = list.map((a) => {
        const tLabels = (a.timeIds && a.timeIds.length ? a.timeIds : times.filter((t) => t.type === "service").map((t) => t._id))
          .map((tid) => timeById[String(tid)])
          .filter(Boolean)
          .map((t) => ({ label: `${t.type === "service" ? "Service" : t.name || t.type}: ${fmtDate(t.startsAt, tz)} ${fmtTime(t.startsAt, tz)}`, sub: "" }));
        return {
          positionName: a.isTemporaryPosition ? a.tempPositionName : (posName[String(a.positionId)] || "Poziție"),
          teamName: "",
          dateLabel,
          serviceTypeName: st?.name || "",
          timeLabels: tLabels,
          responseToken: a.responseToken,
        };
      });
      const result = await sendScheduleEmail({
        to: email,
        personName: [person.firstName, person.lastName].filter(Boolean).join(" "),
        assignments,
        repliesToName: org?.name,
        churchName: org?.name,
      });
      if (result && result.sent) {
        sent++;
        await PcAssignment.updateMany(scoped(req, { _id: { $in: list.map((a) => a._id) } }), { $set: { notificationSentAt: new Date(), prepared: false } });
        require("../services/messageService").logMessage(req.pcOrgId, {
          personId: OID(pid), direction: "received", read: false, relatedPlanId: planId,
          subject: `Planificare pentru ${st?.name || "serviciu"} — ${dateLabel}`,
          body: `Ai fost programat(ă) pentru: ${assignments.map((a) => a.positionName).join(", ")}. Confirmă în aplicație sau din email.`,
        });
      }
    }
    res.json({ ok: true, sent });
  } catch (err) {
    console.error("[pc] POST /plans/:id/send-schedule-emails:", err.message);
    res.status(500).json({ error: "Eroare la trimiterea emailurilor: " + err.message });
  }
});

/* ───────── GET /:id/times — ore (service/rehearsal/other) ───────── */
router.get("/:id/times", requireCan("people.view"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid" });
    const tz = await campusTz(req);
    const times = await PcPlanTime.find(scoped(req, { planId: id })).sort({ startsAt: 1 }).lean();
    const map = (t) => ({
      id: t._id, type: t.type, name: t.name || "",
      weekday: fmtWeekday(t.startsAt, tz),
      date: fmtFullDate(t.startsAt, tz),
      range: `${fmtTime(t.startsAt, tz)}${t.endsAt ? " - " + fmtTime(t.endsAt, tz) : ""}`,
    });
    res.json({
      service: times.filter((t) => t.type === "service").map(map),
      rehearsal: times.filter((t) => t.type === "rehearsal").map(map),
      other: times.filter((t) => t.type === "other").map(map),
    });
  } catch (err) {
    console.error("[pc] GET /plans/:id/times:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea orelor." });
  }
});

/* ───────── GET /:id/notes — note grupate pe categorii ───────── */
router.get("/:id/notes", requireCan("people.view"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid" });
    const notes = await PcPlanNote.find(scoped(req, { planId: id })).sort({ sortOrder: 1 }).lean();
    res.json({ notes: notes.map((n) => ({ id: n._id, category: n.categoryName, content: n.content })) });
  } catch (err) {
    console.error("[pc] GET /plans/:id/notes:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea notelor." });
  }
});

/* ───────── GET /:id/files — fișiere grupate pe scope ───────── */
router.get("/:id/files", requireCan("people.view"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid" });
    const plan = await PcPlan.findOne(scoped(req, { _id: id })).select("serviceTypeId").lean();
    // 1) Fișiere la nivel de plan / service type (PcPlanFile)
    const files = await PcPlanFile.find(
      scoped(req, { $or: [{ planId: id }, { serviceTypeId: plan?.serviceTypeId || null, scope: "serviceType" }] })
    ).sort({ sortOrder: 1 }).lean();
    // grupare pe groupLabel (sau scope)
    const groups = {};
    files.forEach((f) => {
      const label = f.groupLabel || (f.scope === "serviceType" ? "SERVICE TYPE" : f.scope === "plan" ? "PLAN" : "FILES");
      (groups[label] = groups[label] || []).push({ id: f._id, name: f.name, kind: f.kind, url: f.url || null });
    });
    // 2) Fișiere atașate CÂNTECELOR din plan (PcSongFile) → apar și la FILES, grupate pe cântec,
    //    nu doar la tab-ul SONG. Doar cele cu url (deschidebile); charturile generate rămân la Song.
    const items = await PcPlanItem.find(scoped(req, { planId: id, type: "song" })).sort({ sortOrder: 1 }).lean();
    const arrIds = [...new Set(items.map((i) => String(i.arrangementId)).filter((x) => x && x !== "null"))].map(OID).filter(Boolean);
    const songFiles = arrIds.length
      ? await PcSongFile.find(scoped(req, { arrangementId: { $in: arrIds }, url: { $nin: [null, ""] } })).lean()
      : [];
    //    Grupate pe cântec, sub-grupate ca în PCO: „Arrangement Attachments" (scope aranjament)
    //    + „Key Attachments" (scope cheie). Dinamic: orice fișier atașat cântecului apare aici.
    const pushTo = (label, f) => {
      (groups[label] = groups[label] || []).push({ id: f._id, name: f.name, kind: f.kind, url: f.url || null });
    };
    items.forEach((it) => {
      const af = songFiles.filter((f) => String(f.arrangementId) === String(it.arrangementId));
      if (!af.length) return;
      const title = (it.title || "CÂNTEC").toUpperCase();
      const arrFiles = af.filter((f) => f.scope !== "key");
      const keyFiles = af.filter((f) => f.scope === "key");
      arrFiles.forEach((f) => pushTo(`${title} · ARRANGEMENT ATTACHMENTS`, f));
      keyFiles.forEach((f) => pushTo(`${title} · KEY ATTACHMENTS`, f));
    });

    // 3) Fișiere per POZIȚIE (manual/instrucțiuni) — DUPĂ ROL: planificatorii văd toate pozițiile planului,
    //    userii doar pozițiile pe care sunt asignați pe acest plan.
    const isPlanner = await can(req, "services.schedule");
    let posIds = [];
    if (isPlanner) {
      const [aPos, nPos] = await Promise.all([
        PcAssignment.distinct("positionId", scoped(req, { planId: id })),
        PcNeededPosition.distinct("positionId", scoped(req, { planId: id })),
      ]);
      posIds = [...new Set([...aPos, ...nPos].map(String).filter((x) => x && x !== "null"))].map(OID).filter(Boolean);
    } else {
      const vpid = await viewerPersonId(req);
      if (vpid) posIds = [...new Set((await PcAssignment.distinct("positionId", scoped(req, { planId: id, personId: vpid, status: { $ne: "declined" } }))).map(String).filter((x) => x && x !== "null"))].map(OID).filter(Boolean);
    }
    if (posIds.length) {
      const [posFiles, posDocs] = await Promise.all([
        PcPlanFile.find(scoped(req, { positionId: { $in: posIds }, scope: "position" })).sort({ sortOrder: 1 }).lean(),
        PcPosition.find(scoped(req, { _id: { $in: posIds } })).select("name").lean(),
      ]);
      const posNm = Object.fromEntries(posDocs.map((p) => [String(p._id), p.name]));
      posFiles.forEach((f) => pushTo(`POZIȚIE · ${posNm[String(f.positionId)] || "—"}`, f));
    }

    res.json({ groups: Object.entries(groups).map(([label, items]) => ({ label, files: items })) });
  } catch (err) {
    console.error("[pc] GET /plans/:id/files:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea fișierelor." });
  }
});

/* ───────── POST /:id/duplicate — TEMPLATE: repetă planul pe N săptămâni (order + opțional teams) ─────────
   Copiază order items + timpii (decalați cu 7*i zile) + opțional echipele (ca cerere NOUĂ: unconfirmed,
   neprepared, fără token/notificare). Așa poți seta același serviciu pe tot anul (max 52 săpt.). */
router.post("/:id/duplicate", requireCan("services.editOrder"), async (req, res) => {
  try {
    const srcId = OID(req.params.id);
    if (!srcId) return res.status(400).json({ error: "ID invalid" });
    const src = await PcPlan.findOne(scoped(req, { _id: srcId })).lean();
    if (!src) return res.status(404).json({ error: "Plan inexistent." });

    const weeks = Math.max(1, Math.min(52, parseInt(req.body?.weeks, 10) || 1));
    const includeTeams = req.body?.includeTeams !== false; // implicit true
    const includeOrder = req.body?.includeOrder !== false; // implicit true

    const [srcItems, srcTimes, srcAssigns] = await Promise.all([
      includeOrder ? PcPlanItem.find(scoped(req, { planId: srcId })).sort({ sortOrder: 1 }).lean() : [],
      PcPlanTime.find(scoped(req, { planId: srcId })).lean(),
      includeTeams ? PcAssignment.find(scoped(req, { planId: srcId })).lean() : [],
    ]);

    const clean = (o) => { const { _id, planId, orgId, createdAt, updatedAt, __v, deletedAt, ...rest } = o; return rest; };
    const created = [];
    for (let i = 1; i <= weeks; i++) {
      const addDays = (dt) => { const d = new Date(dt); d.setDate(d.getDate() + 7 * i); return d; };
      const plan = await PcPlan.create(stamp(req, { serviceTypeId: src.serviceTypeId, title: src.title, sortDate: addDays(src.sortDate) }));

      // Timpii planului (decalați) + hartă vechi→nou pentru remaparea timeIds.
      const timeMap = {};
      for (const t of srcTimes) {
        const base = clean(t);
        const nt = await PcPlanTime.create(stamp(req, { ...base, planId: plan._id, startsAt: base.startsAt ? addDays(base.startsAt) : base.startsAt }));
        timeMap[String(t._id)] = nt._id;
      }
      const remap = (ids) => (ids || []).map((x) => timeMap[String(x)]).filter(Boolean);

      for (const it of srcItems) {
        const base = clean(it);
        await PcPlanItem.create(stamp(req, { ...base, planId: plan._id, timeIds: remap(base.timeIds) }));
      }
      if (includeTeams) for (const a of srcAssigns) {
        const base = clean(a);
        await PcAssignment.create(stamp(req, {
          ...base, planId: plan._id, timeIds: remap(base.timeIds),
          status: "unconfirmed", prepared: false, notificationSentAt: null, responseToken: null,
          acceptedAt: null, declinedAt: null, declinedAfterConfirm: false, declineReason: "", source: "template",
        }));
      }
      created.push(plan._id);
    }
    res.json({ ok: true, created: created.length, planIds: created });
  } catch (err) {
    console.error("[pc] POST /plans/:id/duplicate:", err.message);
    res.status(500).json({ error: "Eroare la duplicare: " + err.message });
  }
});

/* ───────── GET /:id/rehearse — cântecele planului asamblate pt. Media Player / Songbook / Music Stand ───────── */
router.get("/:id/rehearse", requireCan("people.view"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    if (!planId) return res.status(400).json({ error: "ID invalid" });
    const items = await PcPlanItem.find(scoped(req, { planId, type: "song" })).sort({ sortOrder: 1 }).lean();
    const arrIds = [...new Set(items.map((i) => String(i.arrangementId)).filter((x) => x && x !== "null"))].map(OID).filter(Boolean);
    const [arrs, files] = await Promise.all([
      arrIds.length ? PcArrangement.find(scoped(req, { _id: { $in: arrIds } })).lean() : [],
      arrIds.length ? PcSongFile.find(scoped(req, { arrangementId: { $in: arrIds } })).lean() : [],
    ]);
    const arrById = Object.fromEntries(arrs.map((a) => [String(a._id), a]));
    const songs = items.map((it) => {
      const arr = arrById[String(it.arrangementId)] || null;
      const af = files.filter((f) => String(f.arrangementId) === String(it.arrangementId));
      const master = af.find((f) => f.scope === "arrangement" && f.kind === "chordChart" && f.source === "chordpro");
      const audio = af.filter((f) => isAudioFile(f) && f.url).map((f) => ({ id: f._id, name: f.name, url: f.url }));
      const docs = af.filter((f) => !isAudioFile(f) && !(f.kind === "chordChart" && f.source === "chordpro")).map((f) => ({ id: f._id, name: f.name, kind: f.kind, url: f.url, source: f.source, pending: f.transposeStatus === "pending" || (!f.url && f.source === "multitracks") }));
      return {
        itemId: it._id, songId: it.songId, title: it.title, keyName: it.keyName || "",
        arrangementId: it.arrangementId, arrangementName: arr?.name || "", bpm: arr?.bpm || null,
        sequence: (it.sequence && it.sequence.length ? it.sequence : arr?.sequence) || [],
        audio, docs,
        hasChordChart: !!(master && (master.chordpro || "").trim()),
        chordpro: master?.chordpro || "", originalKey: master?.originalKey || "",
        notes: it.description || "",
      };
    });
    res.json({ planId, songs });
  } catch (err) {
    console.error("[pc] GET /plans/:id/rehearse:", err.message);
    res.status(500).json({ error: "Eroare la rehearse." });
  }
});

module.exports = router;
