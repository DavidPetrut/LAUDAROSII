/**
 * Rute Services — Plan page (felia Services core, read). /api/pc/v1/plans.
 * Header + Order + Teams + Times + Notes + Files + Item detail. Org-scoped + authz.
 * UI = app/planning-center/screens/plans/* (identic cu screenshot-urile).
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcPlan, PcPlanTime, PcPlanItem, PcAssignment, PcNeededPosition, PcPlanNote, PcPlanFile, PcItemNote,
  PcAlert, PcAlertAck, PcNoteView, PcPositionGuestLog,
  PcServiceType, PcOrderTemplate, PcTeam, PcPosition, PcTeamMember, PcPerson, PcOrg, PcCampus, PcSong,
  PcArrangement, PcKey, PcSongFile, PcBlockout,
} = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { requireCan, requireAny, can, CAN_VIEW_MATRIX, CAN_ASSIGN, CAN_MOVE, CAN_NEEDED, CAN_POSITION_RULES } = require("../core/permissions");
const { wallToUtc } = require("../lib/time");
const { DEFAULT_ITEM_ROW_COLORS, rowColorFor } = require("../lib/orderColors");
const { sendAlertPush } = require("../services/alertNotify");

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
// Ora în format 24h FĂRĂ AM/PM (cerință David), ex. „22:10".
const fmt24 = (d, tz) => (d ? new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(d)) : "");
// Ziua săptămânii, 3 litere RO + o culoare specifică (7 culori, cerință David).
const RO_WD = { Sun: { ro: "DUM", color: "#57b98a" }, Mon: { ro: "LUN", color: "#2f81f7" }, Tue: { ro: "MAR", color: "#a371f7" }, Wed: { ro: "MIE", color: "#e3934f" }, Thu: { ro: "JOI", color: "#3fb6b2" }, Fri: { ro: "VIN", color: "#e85aad" }, Sat: { ro: "SÂM", color: "#d6a427" } };
const weekdayRo = (d, tz) => { if (!d) return { ro: "", color: "#8b949e" }; const w = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date(d)); return RO_WD[w] || { ro: w.toUpperCase(), color: "#8b949e" }; };
const isoDateTz = (d, tz) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d)) : "");
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
    const minusDaysStr = (ds, n) => { const [y, m, d] = ds.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() - (n || 0)); return dt.toISOString().slice(0, 10); };

    let srcTimes = null, srcDateStr = null;
    const srcTimesPlanId = copyTimesId || templateId;
    if (srcTimesPlanId) {
      const pl = await PcPlan.findOne(scoped(req, { _id: srcTimesPlanId, serviceTypeId: stId })).select("sortDate").lean();
      if (pl) { srcTimes = await PcPlanTime.find(scoped(req, { planId: srcTimesPlanId })).lean(); srcDateStr = dateStrOf(pl.sortDate); }
    }
    // STRUCTURA (Needed per poziție) din planul „template"
    const srcNeeded = templateId ? await PcNeededPosition.find(scoped(req, { planId: templateId })).lean() : null;
    // Șablon de ORDER (pc_orderTemplates) — recreează itemii ordinii pe fiecare plan nou.
    const orderTpl = OID(req.body?.orderTemplateId) ? await PcOrderTemplate.findOne(scoped(req, { _id: OID(req.body.orderTemplateId) })).lean() : null;

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
        // Repetiție din template (zi = slujbă - dayOffset); doar la creare fresh (la copiere e deja în srcTimes).
        const rt = st.rehearsalTemplate;
        if (rt && rt.enabled && /^\d{2}:\d{2}$/.test(String(rt.start || ""))) {
          const rehDayStr = minusDaysStr(dayStr, Number.isFinite(rt.dayOffset) ? rt.dayOffset : 1);
          const rStart = wallToUtc(rehDayStr, rt.start, tz);
          if (rStart) times.push({ type: "rehearsal", name: "Repetiție", startsAt: rStart, endsAt: /^\d{2}:\d{2}$/.test(String(rt.end || "")) ? wallToUtc(rehDayStr, rt.end, tz) : null });
        }
      }
      const plan = await PcPlan.create(stamp(req, { serviceTypeId: stId, sortDate }));
      for (const t of times) await PcPlanTime.create(stamp(req, { ...t, planId: plan._id }));
      if (srcNeeded) for (const n of srcNeeded) await PcNeededPosition.create(stamp(req, { ...clean(n), planId: plan._id }));
      if (orderTpl) { let so = 0; for (const it of (orderTpl.items || [])) { const { _id, ...rest } = it; await PcPlanItem.create(stamp(req, { ...rest, planId: plan._id, sortOrder: so++ })); } }
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

    // avatarul viewerului (pt. „Rolul meu")
    let me = null;
    if (vpid) { const vp = await PcPerson.findOne(scoped(req, { _id: vpid })).select("firstName lastName avatar").lean(); if (vp) me = personMini(vp); }

    res.json({
      id: plan._id,
      title: plan.title || st?.name || "Plan",
      serviceTypeId: plan.serviceTypeId,   // #5: lipsea → butonul Matrix dădea „ID invalid"
      serviceTypeName: st?.name || "",
      dateLabel: plan.sortDate ? new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(plan.sortDate)) : "",
      prevId: prev?._id || null,
      nextId: next?._id || null,
      myAssignments, me,
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

const VOICE_ROLES = ["lead", "support", "alto", "tenor", "soprano", "bass", "custom"];
/** Rezolvă vocile structurate (lead/S/A/T…) pt. o listă de itemi → map itemId → [{role,name,initials,avatar,personId?}]. */
async function resolveVoices(req, items) {
  const personIds = [];
  for (const it of items) for (const v of it.voices || []) if (v.personId) personIds.push(v.personId);
  const persons = personIds.length ? await PcPerson.find(scoped(req, { _id: { $in: personIds } })).select("firstName lastName avatar").lean() : [];
  const byId = Object.fromEntries(persons.map((p) => [String(p._id), p]));
  const map = {};
  for (const it of items) {
    map[String(it._id)] = (it.voices || []).map((v) => {
      const role = VOICE_ROLES.includes(v.role) ? v.role : "lead";
      if (v.personId && byId[String(v.personId)]) { const m = personMini(byId[String(v.personId)]); return { role, name: m.name, initials: m.initials, avatar: m.avatar, personId: String(v.personId) }; }
      return { role, name: v.name || "", initials: (v.name || "").slice(0, 2).toUpperCase(), avatar: "" };
    }).filter((v) => v.name);
  }
  return map;
}

// „Alte slujiri" pe un item: slujiri non-vocale din Matrix-ul săptămânii. Mapare kind → pattern poziție (pt. pool/predicatori).
const MINISTRY_KINDS = ["host", "communion", "prayer", "preach"];
const MINISTRY_POS_RX = { host: /gazd/i, communion: /cin[ăa]|comuniune|\beuharist/i, prayer: /\b(indemn|îndemn)|rug[ăa]ciune/i, preach: /predic|cuv[âa]nt|mesaj/i };

async function resolveMinistries(req, items) {
  const personIds = [];
  for (const it of items) for (const m of it.ministries || []) if (m.personId) personIds.push(m.personId);
  const persons = personIds.length ? await PcPerson.find(scoped(req, { _id: { $in: personIds } })).select("firstName lastName avatar").lean() : [];
  const byId = Object.fromEntries(persons.map((p) => [String(p._id), p]));
  const map = {};
  for (const it of items) {
    map[String(it._id)] = (it.ministries || []).map((m) => {
      if (m.personId && byId[String(m.personId)]) { const mm = personMini(byId[String(m.personId)]); return { kind: m.kind || "", personId: String(m.personId), name: mm.name, initials: mm.initials, avatar: mm.avatar }; }
      return { kind: m.kind || "", personId: null, name: m.name || "", initials: (m.name || "").slice(0, 2).toUpperCase(), avatar: "" };
    }).filter((m) => m.kind);
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
    const voicesMap = await resolveVoices(req, items);
    const ministriesMap = await resolveMinistries(req, items);
    // reguli de culoare din service type
    const plan = await PcPlan.findOne(scoped(req, { _id: id })).select("serviceTypeId").lean();
    const st = plan ? await PcServiceType.findOne(scoped(req, { _id: plan.serviceTypeId })).select("itemRowColors useCustomRowColors").lean() : null;
    const rules = st && st.useCustomRowColors === false ? [] : (st && st.itemRowColors && st.itemRowColors.length ? st.itemRowColors : DEFAULT_ITEM_ROW_COLORS);
    // ── nr. fișiere per item (paperclip): fișiere item-scope + fișierele cântecului (aranjament + cheia aleasă) ──
    const itemIds = items.map((i) => i._id);
    const arrIds = items.filter((i) => i.arrangementId).map((i) => i.arrangementId);
    const [planFiles, songFiles] = await Promise.all([
      PcPlanFile.find(scoped(req, { itemId: { $in: itemIds } })).select("itemId").lean(),
      arrIds.length ? PcSongFile.find(scoped(req, { arrangementId: { $in: arrIds } })).select("arrangementId keyId").lean() : [],
    ]);
    const planFileCount = {};
    for (const f of planFiles) planFileCount[String(f.itemId)] = (planFileCount[String(f.itemId)] || 0) + 1;
    const songFileCount = (it) => {
      if (!it.arrangementId) return 0;
      const aid = String(it.arrangementId), kid = it.keyId ? String(it.keyId) : null;
      let n = 0;
      for (const f of songFiles) { if (String(f.arrangementId) !== aid) continue; if (!f.keyId || (kid && String(f.keyId) === kid)) n++; }
      return n;
    };
    // ── total timp: Σ lengthSec, EXCLUZÂND headers, tranziții și placements before/after (ca PCO) ──
    let totalSec = 0;
    for (const it of items) {
      if (it.type === "header" || it.isTransition) continue;
      if ((it.placement || "during") !== "during") continue;
      totalSec += it.lengthSec || 0;
    }
    res.json({
      totalSec,
      totalLabel: fmtLen(totalSec),
      items: items.map((it) => ({
        id: it._id,
        type: it.type,
        title: it.title,
        description: it.description || "",
        lengthLabel: fmtLen(it.lengthSec),
        keyName: it.keyName || "",
        rowColor: rowColorFor(it, rules),
        isTransition: !!it.isTransition,
        medleyCount: Array.isArray(it.medley) ? it.medley.length : 0,
        fileCount: (planFileCount[String(it._id)] || 0) + songFileCount(it),
        voices: voicesMap[String(it._id)] || [],
        ministries: ministriesMap[String(it._id)] || [],
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
    const voicesMap = await resolveVoices(req, [it]);
    const ministriesMap = await resolveMinistries(req, [it]);
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
      htmlDetails: it.htmlDetails || "",
      isTransition: !!it.isTransition,
      // Linkaj song (pt. tab-ul SONG / Edit a song from a plan + Sequence):
      songId: it.songId ? String(it.songId) : null,
      arrangementId: it.arrangementId ? String(it.arrangementId) : null,
      keyId: it.keyId ? String(it.keyId) : null,
      sequence: Array.isArray(it.sequence) ? it.sequence : [],
      duringLabel: (it.placement && it.placement !== "during") ? `${it.placement[0].toUpperCase()}${it.placement.slice(1)} All` : (it.duringAll !== false ? "During All" : `${(it.timeIds || []).length} time(s)`),
      leaders: leadersMap[String(it._id)] || [],
      voices: voicesMap[String(it._id)] || [],
      ministries: ministriesMap[String(it._id)] || [],
      medley: (it.medley || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((c) => ({
        songId: c.songId ? String(c.songId) : null, arrangementId: c.arrangementId ? String(c.arrangementId) : null,
        keyId: c.keyId ? String(c.keyId) : null, keyName: c.keyName || "", title: c.title || "",
        sequence: c.sequence || [], lengthSec: c.lengthSec || 0, lengthLabel: fmtLen(c.lengthSec), note: c.note || "", sortOrder: c.sortOrder || 0,
      })),
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
    const type = ["item", "header", "song", "media", "medley"].includes(b.type) ? b.type : "item";

    const doc = {
      planId, type,
      title: String(b.title || (type === "header" ? "Header" : type === "song" ? "New Song" : type === "media" ? "New Media" : type === "medley" ? "Medley" : "New Item")).trim(),
      description: b.description || "",
      lengthSec: Number(b.lengthSec) || 0,
      placement: ["before", "during", "after"].includes(b.placement) ? b.placement : "during",
      duringAll: b.duringAll !== false,
      timeIds: Array.isArray(b.timeIds) ? b.timeIds.map(OID).filter(Boolean) : [],
      keyName: b.keyName || "",
    };
    // Song din bibliotecă (+ aranjament/cheie opțional, ca să nu mai fie nevoie de un PATCH ulterior).
    if (type === "song" && b.songId) {
      const song = await PcSong.findOne(scoped(req, { _id: OID(b.songId) })).lean();
      if (song) { doc.songId = song._id; doc.title = song.title; doc.keyName = b.keyName || song.defaultKey || ""; if (!doc.lengthSec) doc.lengthSec = song.lengthSec || 0; }
      if (b.arrangementId) { const arr = await PcArrangement.findOne(scoped(req, { _id: OID(b.arrangementId) })).select("_id lengthSec").lean(); if (arr) { doc.arrangementId = arr._id; if (!doc.lengthSec) doc.lengthSec = arr.lengthSec || 0; } }
      if (b.keyId) { const key = await PcKey.findOne(scoped(req, { _id: OID(b.keyId) })).select("startKey").lean(); if (key) { doc.keyId = key._id; doc.keyName = key.startKey || doc.keyName; } }
    }
    // Media din bibliotecă
    if (type === "media" && b.mediaItemId) { const oid = OID(b.mediaItemId); if (oid) doc.mediaItemId = oid; }

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
    if (b.htmlDetails !== undefined) set.htmlDetails = String(b.htmlDetails);
    if (b.isTransition !== undefined) set.isTransition = !!b.isTransition;
    // Leagă (sau dezleagă) un cântec de un item existent (din tab-ul Song → „+ cântec").
    if (b.songId !== undefined) {
      const sid = OID(b.songId);
      set.songId = sid;
      if (sid) {
        const song = await PcSong.findOne(scoped(req, { _id: sid })).select("title defaultKey").lean();
        if (!song) return res.status(400).json({ error: "Cântec inexistent." });
        set.type = "song";
        if (b.keyName === undefined && b.keyId === undefined) set.keyName = song.defaultKey || "";
      } else { set.arrangementId = null; set.keyId = null; set.keyName = ""; }
    }
    // Voci structurate (lead/S/A/T…): [{ role, personId?, name? }]
    if (Array.isArray(b.voices)) {
      set.voices = b.voices.map((v) => ({
        role: VOICE_ROLES.includes(v.role) ? v.role : "lead",
        personId: v.personId ? OID(v.personId) : null,
        name: v.personId ? "" : String(v.name || ""),
      })).filter((v) => v.personId || v.name);
    }
    if (Array.isArray(b.ministries)) {
      set.ministries = b.ministries.map((m) => ({
        kind: MINISTRY_KINDS.includes(m.kind) ? m.kind : "",
        personId: m.personId ? OID(m.personId) : null,
        name: m.personId ? "" : String(m.name || ""),
      })).filter((m) => m.kind);
    }
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

/* ───────── POST /:id/items/medley — creează un item MEDLEY din iteme existente SAU din cântece ───────── */
router.post("/:id/items/medley", requireCan("services.editOrder"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    if (!planId) return res.status(400).json({ error: "ID invalid" });
    const b = req.body || {};
    const itemIds = Array.isArray(b.itemIds) ? b.itemIds.map(OID).filter(Boolean) : [];
    const songIds = Array.isArray(b.songIds) ? b.songIds.map(OID).filter(Boolean) : [];
    const children = [];
    let anchorSort = null;
    if (itemIds.length) {
      const its = await PcPlanItem.find(scoped(req, { _id: { $in: itemIds }, planId })).lean();
      const byId = Object.fromEntries(its.map((i) => [String(i._id), i]));
      let k = 0;
      for (const idv of itemIds) {
        const it = byId[String(idv)]; if (!it) continue;
        if (anchorSort === null) anchorSort = it.sortOrder;
        children.push({ songId: it.songId || null, arrangementId: it.arrangementId || null, keyId: it.keyId || null, keyName: it.keyName || "", title: it.title || "", sequence: it.sequence || [], lengthSec: it.lengthSec || 0, note: "", sortOrder: k++ });
      }
      await PcPlanItem.updateMany(scoped(req, { _id: { $in: itemIds } }), { $set: { deletedAt: new Date() } });
    } else if (songIds.length) {
      const songs = await PcSong.find(scoped(req, { _id: { $in: songIds } })).lean();
      const byId = Object.fromEntries(songs.map((s) => [String(s._id), s]));
      let k = 0;
      for (const sid of songIds) { const s = byId[String(sid)]; if (!s) continue; children.push({ songId: s._id, arrangementId: null, keyId: null, keyName: s.defaultKey || "", title: s.title, sequence: [], lengthSec: s.lengthSec || 0, note: "", sortOrder: k++ }); }
    }
    if (!children.length) return res.status(400).json({ error: "Trimite itemIds sau songIds." });
    const title = String(b.title || children.map((c) => c.title).filter(Boolean).slice(0, 3).join(" / ") || "Medley");
    const totalLen = children.reduce((s, c) => s + (c.lengthSec || 0), 0);
    let sortOrder;
    if (anchorSort !== null) sortOrder = anchorSort;
    else if (b.afterItemId) { const after = await PcPlanItem.findOne(scoped(req, { _id: OID(b.afterItemId) })).select("sortOrder").lean(); const at = after ? after.sortOrder : 0; await PcPlanItem.updateMany(scoped(req, { planId, sortOrder: { $gt: at } }), { $inc: { sortOrder: 1 } }); sortOrder = at + 1; }
    else { const last = await PcPlanItem.findOne(scoped(req, { planId })).sort({ sortOrder: -1 }).select("sortOrder").lean(); sortOrder = last ? last.sortOrder + 1 : 0; }
    const item = await PcPlanItem.create(stamp(req, { planId, type: "medley", title, lengthSec: totalLen, medley: children, sortOrder }));
    res.status(201).json({ id: item._id });
  } catch (err) { console.error("[pc] POST medley:", err.message); res.status(500).json({ error: "Eroare la medley: " + err.message }); }
});

/* ───────── PATCH /:id/items/:itemId/medley — actualizează copiii (add/remove/reorder/edit snippet) ───────── */
router.patch("/:id/items/:itemId/medley", requireCan("services.editOrder"), async (req, res) => {
  try {
    const itemId = OID(req.params.itemId);
    const arr = Array.isArray(req.body?.medley) ? req.body.medley : [];
    const medley = arr.map((c, i) => ({
      songId: c.songId ? OID(c.songId) : null, arrangementId: c.arrangementId ? OID(c.arrangementId) : null, keyId: c.keyId ? OID(c.keyId) : null,
      keyName: String(c.keyName || ""), title: String(c.title || ""), sequence: Array.isArray(c.sequence) ? c.sequence.map(String) : [], lengthSec: Number(c.lengthSec) || 0, note: String(c.note || ""), sortOrder: i,
    }));
    const totalLen = medley.reduce((s, c) => s + (c.lengthSec || 0), 0);
    const p = await PcPlanItem.findOneAndUpdate(scoped(req, { _id: itemId }), { $set: { medley, lengthSec: totalLen } }).select("_id").lean();
    if (!p) return res.status(404).json({ error: "Item inexistent" });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] PATCH medley:", err.message); res.status(500).json({ error: "Eroare la medley." }); }
});

/* ───────── POST /:id/ai/order-suggest — SEAM (neimplementat) pt. sugestii AI pe ordine/voci/tranziții/medley ─────────
   Date structurate (voices/isTransition/medley) sunt consumabile de AI; aici e portița, fără implementare (§10/§17). */
router.post("/:id/ai/order-suggest", requireCan("services.editOrder"), async (req, res) => {
  res.status(501).json({ seam: true, error: "AI order-suggest: seam neimplementat (vezi secțiunea 17 din PLANNING_CENTER_ARCHITECTURE.md)." });
});

/* ───────── GET /:id/voices-pool — oamenii programați pe plan (vocaliști întâi) pt. pickerul de voci ───────── */
router.get("/:id/voices-pool", requireCan("people.view"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    if (!planId) return res.status(400).json({ error: "ID invalid" });
    const assigns = await PcAssignment.find(scoped(req, { planId, status: { $ne: "declined" } })).lean();
    const personIds = [...new Set(assigns.map((a) => String(a.personId)).filter(Boolean))];
    const positionIds = [...new Set(assigns.map((a) => a.positionId).filter(Boolean).map(String))];
    const teamIds = [...new Set(assigns.map((a) => a.teamId).filter(Boolean).map(String))];
    const [persons, positions, teams] = await Promise.all([
      PcPerson.find(scoped(req, { _id: { $in: personIds.map(OID) } })).select("firstName lastName avatar").lean(),
      PcPosition.find(scoped(req, { _id: { $in: positionIds.map(OID) } })).select("name teamId").lean(),
      PcTeam.find(scoped(req, { _id: { $in: teamIds.map(OID) } })).select("name").lean(),
    ]);
    const personById = Object.fromEntries(persons.map((p) => [String(p._id), p]));
    const posById = Object.fromEntries(positions.map((p) => [String(p._id), p]));
    const teamById = Object.fromEntries(teams.map((t) => [String(t._id), t]));
    const VOCAL_RX = /vocal/i; // DOAR poziția „Vocalisti" (nu Bass/instrumente care conțineau alto/tenor/bass)
    const byPerson = {};
    for (const a of assigns) {
      const pid = String(a.personId); if (!pid || !personById[pid]) continue;
      const pos = posById[String(a.positionId)], team = teamById[String(a.teamId)];
      const isVoc = VOCAL_RX.test(pos?.name || "");
      if (!byPerson[pid]) { const m = personMini(personById[pid]); byPerson[pid] = { personId: pid, name: m.name, avatar: m.avatar, initials: m.initials, positionName: pos?.name || "", teamName: team?.name || "", isVocalist: isVoc }; }
      else if (isVoc && !byPerson[pid].isVocalist) { byPerson[pid].isVocalist = true; byPerson[pid].positionName = pos?.name || byPerson[pid].positionName; }
    }
    // DOAR vocaliștii săptămânii (poziția „Vocalisti" din Matrix), nu toți oamenii programați (cerință David).
    const people = Object.values(byPerson).filter((p) => p.isVocalist).sort((a, b) => a.name.localeCompare(b.name, "ro"));
    res.json({ people });
  } catch (err) {
    console.error("[pc] GET /plans/:id/voices-pool:", err.message);
    res.status(500).json({ error: "Eroare la pool-ul de voci." });
  }
});

/* ───────── GET /:id/ministry-pool — pt. „Alte slujiri": week (toți programații) + preachers (roster Predică) ───────── */
router.get("/:id/ministry-pool", requireCan("people.view"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    if (!planId) return res.status(400).json({ error: "ID invalid" });
    const assigns = await PcAssignment.find(scoped(req, { planId, status: { $ne: "declined" } })).lean();
    const personIds = [...new Set(assigns.map((a) => String(a.personId)).filter(Boolean))];
    const positionIds = [...new Set(assigns.map((a) => a.positionId).filter(Boolean).map(String))];
    const [persons, positions] = await Promise.all([
      PcPerson.find(scoped(req, { _id: { $in: personIds.map(OID) } })).select("firstName lastName avatar").lean(),
      PcPosition.find(scoped(req, { _id: { $in: positionIds.map(OID) } })).select("name").lean(),
    ]);
    const personById = Object.fromEntries(persons.map((p) => [String(p._id), p]));
    const posById = Object.fromEntries(positions.map((p) => [String(p._id), p]));
    const byPerson = {};
    const byKind = { host: {}, communion: {}, prayer: {}, preach: {} }; // cine e programat pe slujirea respectivă săpt. asta
    for (const a of assigns) {
      const pid = String(a.personId); if (!pid || !personById[pid]) continue;
      const m = personMini(personById[pid]);
      const posName = (posById[String(a.positionId)] || {}).name || "";
      if (!byPerson[pid]) byPerson[pid] = { personId: pid, name: m.name, avatar: m.avatar, initials: m.initials, positionName: posName };
      for (const k of MINISTRY_KINDS) if (MINISTRY_POS_RX[k].test(posName)) byKind[k][pid] = { personId: pid, name: m.name, avatar: m.avatar, initials: m.initials, positionName: posName };
    }
    const week = Object.values(byPerson).sort((a, b) => a.name.localeCompare(b.name, "ro"));
    const byKindOut = {}; for (const k of MINISTRY_KINDS) byKindOut[k] = Object.values(byKind[k]).sort((a, b) => a.name.localeCompare(b.name, "ro"));
    // preachers = rosterul pozițiilor de tip „Predică" (pt. căutarea extra, dacă nu e programat în Matrix)
    const allPos = await PcPosition.find(scoped(req, {})).select("name").lean();
    const preachPosIds = allPos.filter((p) => MINISTRY_POS_RX.preach.test(p.name || "")).map((p) => p._id);
    let preachers = [];
    if (preachPosIds.length) {
      const members = await PcTeamMember.find(scoped(req, { positionIds: { $in: preachPosIds } })).select("personId").lean();
      const prIds = [...new Set(members.map((m) => String(m.personId)).filter(Boolean))].map(OID);
      const prPersons = prIds.length ? await PcPerson.find(scoped(req, { _id: { $in: prIds } })).select("firstName lastName avatar").lean() : [];
      preachers = prPersons.map((p) => { const m = personMini(p); return { personId: String(p._id), name: m.name, avatar: m.avatar, initials: m.initials }; }).sort((a, b) => a.name.localeCompare(b.name, "ro"));
    }
    res.json({ week, preachers, byKind: byKindOut });
  } catch (err) { console.error("[pc] GET ministry-pool:", err.message); res.status(500).json({ error: "Eroare la pool." }); }
});

/* ───────── Fișiere per ITEM (tab Files din drawer „View item") — scope:"item" ───────── */
router.post("/:id/items/:itemId/files", requireCan("services.editOrder"), async (req, res) => {
  try {
    const planId = OID(req.params.id), itemId = OID(req.params.itemId);
    const it = await PcPlanItem.findOne(scoped(req, { _id: itemId, planId })).select("_id").lean();
    if (!it) return res.status(404).json({ error: "Item inexistent." });
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nume fișier lipsă." });
    const doc = await PcPlanFile.create(stamp(req, { planId, itemId, scope: "item", name, url: String(req.body?.url || "").trim(), kind: req.body?.kind || "upload" }));
    res.status(201).json({ id: doc._id, name: doc.name, url: doc.url || null, kind: doc.kind });
  } catch (err) { console.error("[pc] POST item file:", err.message); res.status(500).json({ error: "Eroare la fișier." }); }
});
router.delete("/:id/items/:itemId/files/:fileId", requireCan("services.editOrder"), async (req, res) => {
  try {
    const f = await PcPlanFile.findOneAndUpdate(scoped(req, { _id: OID(req.params.fileId), itemId: OID(req.params.itemId), scope: "item" }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!f) return res.status(404).json({ error: "Fișier inexistent." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE item file:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── Note per ITEM (tab Notes din drawer) — PcItemNote ───────── */
router.get("/:id/items/:itemId/notes", requireCan("people.view"), async (req, res) => {
  try {
    const notes = await PcItemNote.find(scoped(req, { planItemId: OID(req.params.itemId) })).sort({ createdAt: 1 }).lean();
    res.json({ notes: notes.map((n) => ({ id: n._id, content: n.content || "", category: n.categoryName || "" })) });
  } catch (err) { console.error("[pc] GET item notes:", err.message); res.status(500).json({ error: "Eroare." }); }
});
router.post("/:id/items/:itemId/notes", requireCan("services.editOrder"), async (req, res) => {
  try {
    const planId = OID(req.params.id), planItemId = OID(req.params.itemId);
    const it = await PcPlanItem.findOne(scoped(req, { _id: planItemId, planId })).select("_id").lean();
    if (!it) return res.status(404).json({ error: "Item inexistent." });
    const n = await PcItemNote.create(stamp(req, { planId, planItemId, content: String(req.body?.content || ""), categoryName: String(req.body?.category || "") }));
    res.status(201).json({ id: n._id });
  } catch (err) { console.error("[pc] POST item note:", err.message); res.status(500).json({ error: "Eroare la notă." }); }
});
router.patch("/:id/items/:itemId/notes/:noteId", requireCan("services.editOrder"), async (req, res) => {
  try {
    const set = {};
    if (req.body?.content !== undefined) set.content = String(req.body.content);
    if (req.body?.category !== undefined) set.categoryName = String(req.body.category);
    const n = await PcItemNote.findOneAndUpdate(scoped(req, { _id: OID(req.params.noteId), planItemId: OID(req.params.itemId) }), { $set: set }).select("_id").lean();
    if (!n) return res.status(404).json({ error: "Notă inexistentă." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] PATCH item note:", err.message); res.status(500).json({ error: "Eroare." }); }
});
router.delete("/:id/items/:itemId/notes/:noteId", requireCan("services.editOrder"), async (req, res) => {
  try {
    const n = await PcItemNote.findOneAndUpdate(scoped(req, { _id: OID(req.params.noteId), planItemId: OID(req.params.itemId) }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!n) return res.status(404).json({ error: "Notă inexistentă." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE item note:", err.message); res.status(500).json({ error: "Eroare." }); }
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
router.get("/:id/schedulable", requireAny(CAN_VIEW_MATRIX), async (req, res) => {
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
router.post("/:id/assignments", requireAny(CAN_ASSIGN), async (req, res) => {
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
    // află ÎNTÂI dacă există un slot „Needed" liber (count>0) pe poziție — ca să-l putem RESTAURA simetric la ștergere.
    // întâi al orei la care e asignat (dacă există target pe acea oră), altfel plan-wide.
    let np = null;
    if (positionId) {
      const tid = (doc.timeIds && doc.timeIds[0]) || null;
      np = tid ? await PcNeededPosition.findOne(scoped(req, { planId, teamId, positionId, timeId: tid, count: { $gt: 0 } })) : null;
      if (!np) np = await PcNeededPosition.findOne(scoped(req, { planId, teamId, positionId, timeId: null, count: { $gt: 0 } }));
      if (!np) np = await PcNeededPosition.findOne(scoped(req, { planId, teamId, positionId, count: { $gt: 0 } }));
    }
    doc.filledNeed = !!np; // a consumat un slot real → la X îl punem la loc (needed-ul reapare)

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
    // consumă slotul „Needed" (dacă exista unul liber)
    if (np) { np.count -= 1; await np.save(); }
    // „fit the position?" — e persoana în rosterul OFICIAL al poziției? (double-check autoritar, server-side).
    // Frontend-ul decide, pe baza asta, dacă arată modalul guest/permanent. Invitații clasici NU declanșează.
    let inPositionRoster = true;
    if (positionId && !isGuest) {
      const mem = await PcTeamMember.findOne(scoped(req, { positionIds: positionId, personId })).select("_id").lean();
      inPositionRoster = !!mem;
    }
    res.status(201).json({ id: assignment._id, inPositionRoster });
  } catch (err) {
    console.error("[pc] POST /plans/:id/assignments:", err.message);
    res.status(500).json({ error: "Eroare la programare: " + err.message });
  }
});

/* ───────── POST /:id/guest-log — loghează un om REAL pus ca GUEST (o zi) pe o poziție din care NU face parte ─────────
   Nu atinge asignarea (aia e deja creată) și NU-l adaugă în roster. Doar jurnal → „de câte ori a fost guest aici". */
router.post("/:id/guest-log", requireAny(CAN_ASSIGN), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    const b = req.body || {};
    const personId = OID(b.personId), positionId = OID(b.positionId), teamId = OID(b.teamId);
    if (!personId || !positionId) return res.status(400).json({ error: "personId și positionId sunt necesare." });
    const [plan, pos, team] = await Promise.all([
      PcPlan.findOne(scoped(req, { _id: planId })).select("sortDate").lean(),
      PcPosition.findOne(scoped(req, { _id: positionId })).select("name").lean(),
      teamId ? PcTeam.findOne(scoped(req, { _id: teamId })).select("name").lean() : null,
    ]);
    const doc = await PcPositionGuestLog.create(stamp(req, {
      personId, positionId, teamId: teamId || null, planId: planId || null,
      date: plan?.sortDate || null, positionName: pos?.name || "", teamName: team?.name || "",
    }));
    res.status(201).json({ id: doc._id });
  } catch (err) {
    console.error("[pc] POST /plans/:id/guest-log:", err.message);
    res.status(500).json({ error: "Eroare la logul de guest: " + err.message });
  }
});

/* ───────── PATCH /:id/assignments/:aid — editează o asignare (status/poziție/note/times) ─────────
   Modalul „Editing Scheduled Person". NU trimite email (schimbarea de status e locală). */
router.patch("/:id/assignments/:aid", requireAny(CAN_ASSIGN), async (req, res) => {
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
router.delete("/:id/assignments/:aid", requireAny(CAN_MOVE), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    const cur = await PcAssignment.findOne(scoped(req, { _id: OID(req.params.aid) })).select("positionId teamId status filledNeed deletedAt").lean();
    if (!cur || cur.deletedAt) return res.status(404).json({ error: "Programare inexistentă." });
    await PcAssignment.updateOne(scoped(req, { _id: OID(req.params.aid) }), { $set: { deletedAt: new Date() } });
    // X = scoate DOAR persoana. Dacă umplea un slot „Needed" (și NU era declinat — declinul l-a restaurat deja),
    // slotul REVINE (needed-ul reapare). Needed se reduce DOAR din butonul minus, niciodată din ștergere.
    // fără upsert: dacă nevoia a fost ștearsă explicit (minus la 0), nu o reînviem.
    if (cur.positionId && cur.teamId && cur.status !== "declined" && cur.filledNeed !== false) {
      await PcNeededPosition.findOneAndUpdate(scoped(req, { planId, teamId: cur.teamId, positionId: cur.positionId }), { $inc: { count: 1 } });
    }
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
router.patch("/positions/:positionId/rules", requireAny(CAN_POSITION_RULES), async (req, res) => {
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
router.post("/positions/:positionId/files", requireAny(CAN_POSITION_RULES), async (req, res) => {
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
router.delete("/positions/:positionId/files/:fileId", requireAny(CAN_POSITION_RULES), async (req, res) => {
  try {
    const f = await PcPlanFile.findOneAndUpdate(scoped(req, { _id: OID(req.params.fileId), positionId: OID(req.params.positionId) }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!f) return res.status(404).json({ error: "Fișier inexistent." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE position file:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── GET /positions/:positionId/roster — cine e în rosterul poziției (pt. „+ adaugă pe poziție") ───────── */
router.get("/positions/:positionId/roster", requireAny(CAN_VIEW_MATRIX), async (req, res) => {
  try {
    const positionId = OID(req.params.positionId);
    if (!positionId) return res.status(400).json({ error: "ID invalid." });
    const mems = await PcTeamMember.find(scoped(req, { positionIds: positionId })).select("personId").lean();
    const ids = [...new Set(mems.map((m) => String(m.personId)))].map(OID);
    const people = await PcPerson.find(scoped(req, { _id: { $in: ids }, status: "active" }))
      .collation({ locale: "ro", strength: 1 }).sort({ firstName: 1 }).select("firstName lastName avatar programIntent").lean();
    res.json({ people: people.map((p) => ({
      id: p._id, name: [p.firstName, p.lastName].filter(Boolean).join(" "), avatar: p.avatar || "",
      initials: `${(p.firstName || "").charAt(0)}${(p.lastName || "").charAt(0)}`.toUpperCase(), programIntent: p.programIntent || "",
    })) });
  } catch (err) { console.error("[pc] GET position roster:", err.message); res.status(500).json({ error: "Eroare la roster." }); }
});

/* ───────── GET /positions/:positionId/is-roster?personId=X — face persoana parte din rosterul poziției? ─────────
   Check rapid ÎNAINTE de asignare: dacă NU → frontend-ul cere întâi decizia (guest/permanent) și scrie
   în DB DOAR după alegere. Așa, X/Escape/refresh NU lasă persoana asignată. */
router.get("/positions/:positionId/is-roster", requireAny(CAN_VIEW_MATRIX), async (req, res) => {
  try {
    const positionId = OID(req.params.positionId);
    const personId = OID(req.query.personId);
    if (!positionId || !personId) return res.status(400).json({ error: "positionId și personId necesare." });
    const mem = await PcTeamMember.findOne(scoped(req, { positionIds: positionId, personId })).select("_id").lean();
    res.json({ inRoster: !!mem });
  } catch (err) { console.error("[pc] GET is-roster:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── GET /:id/recommend — bara dreaptă: candidați pt. o poziție, cu „due" + conflicte ─────────
   Sortare: fără conflict întâi, apoi cei care n-au mai fost de mult pe poziție (due). FĂRĂ email. */
router.get("/:id/recommend", requireAny(CAN_VIEW_MATRIX), async (req, res) => {
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
    const [assigns, blockouts, rosterMembers] = await Promise.all([
      PcAssignment.find(scoped(req, { personId: { $in: pids }, planId: { $in: winPlans.map((p) => p._id) }, status: { $ne: "declined" } })).select("personId planId positionId").lean(),
      PcBlockout.find(scoped(req, { personId: { $in: pids } })).select("personId startDate endDate type reason").lean(),
      // ROSTERUL poziției: cine slujește oficial pe ACEASTĂ poziție (pc_team_members) → apare primul
      positionId ? PcTeamMember.find(scoped(req, { positionIds: positionId })).select("personId").lean() : [],
    ]);
    const inRoster = new Set(rosterMembers.map((m) => String(m.personId)));
    const WEEK = 7 * 864e5;
    const byPerson = {}; assigns.forEach((a) => (byPerson[String(a.personId)] = byPerson[String(a.personId)] || []).push(a));
    const blkByPerson = {}; blockouts.forEach((b) => (blkByPerson[String(b.personId)] = blkByPerson[String(b.personId)] || []).push(b));
    const dayKey = dayStart.toISOString().slice(0, 10);

    // „-Nw" = acum câte săptămâni a fost persoana ULTIMA dată pe ACEASTĂ poziție — FĂRĂ limita de ±180z
    // (poate fi oricât de vechi, ex. acum un an = -48w). Doar TRECUT (înainte de planul selectat).
    const lastPosWeeksByPerson = {};
    if (positionId) {
      const posAssigns = await PcAssignment.find(scoped(req, { positionId, personId: { $in: pids }, status: { $ne: "declined" } })).select("personId planId").lean();
      const posPlanIds = [...new Set(posAssigns.map((a) => String(a.planId)))].map(OID).filter(Boolean);
      const posPlans = await PcPlan.find(scoped(req, { _id: { $in: posPlanIds } })).select("sortDate").lean();
      const posPlanDate = Object.fromEntries(posPlans.map((p) => [String(p._id), new Date(p.sortDate)]));
      const lastDate = {};
      posAssigns.forEach((a) => {
        const d = posPlanDate[String(a.planId)]; if (!d || d.getTime() >= planDate.getTime()) return; // doar trecut
        const pid = String(a.personId); if (!lastDate[pid] || d > lastDate[pid]) lastDate[pid] = d;
      });
      for (const [pid, d] of Object.entries(lastDate)) lastPosWeeksByPerson[pid] = Math.max(1, Math.round((planDate.getTime() - d.getTime()) / WEEK));
    }

    const rows = people.map((p) => {
      const list = (byPerson[String(p._id)] || []).map((a) => ({ ...a, date: planDateById[String(a.planId)] })).filter((a) => a.date);
      let alreadyHere = false, sameDayCount = 0, monthCount = 0;
      for (const a of list) {
        if (positionId && String(a.positionId) === String(positionId)) {
          if (String(a.planId) === String(planId)) alreadyHere = true;
          // de câte ori a fost pe poziția asta în ultimele 30 de zile (pt. „target/lună")
          if (a.date >= monthStart && a.date < planDate) monthCount++;
        }
        // conflict de timp: altă asignare în aceeași zi (alt plan)
        if (String(a.planId) !== String(planId) && a.date.toISOString().slice(0, 10) === dayKey) sameDayCount++;
      }
      // acum câte săptămâni a fost ULTIMA dată pe ACEASTĂ poziție (fără limită de vârstă, doar trecut)
      const lastPosW = positionId ? (lastPosWeeksByPerson[String(p._id)] != null ? lastPosWeeksByPerson[String(p._id)] : null) : null;
      const covers = (b) => (!b.startDate || b.startDate <= dayKey) && (!b.endDate || b.endDate >= dayKey);
      const myBlk = blkByPerson[String(p._id)] || [];
      // ORICE blockout (on-break SAU indisponibilitate personală) care acoperă ziua → persoana NU apare în
      // Fără/Cu conflict, ci SEPARAT în tabul „Blockout" (identic cu Listă live): distincție clară.
      const bkCover = myBlk.find((b) => covers(b));
      const dayBlocked = !!bkCover;
      // niciodată 0 sau „+", gol dacă n-a mai fost vreodată pe poziție
      const weeksLabel = lastPosW == null ? "" : `-${lastPosW}w`;
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
      // (fără conflict de blockout: cei cu blockout în acea zi sunt EXCLUȘI mai jos, nu afișați cu semn)
      const conflict = conflicts[0] || null; // compat sortare
      const belowTarget = targetPerMonth > 0 && monthCount < targetPerMonth;
      return {
        id: p._id, name: [p.firstName, p.lastName].filter(Boolean).join(" "),
        initials: `${(p.firstName || "").charAt(0)}${(p.lastName || "").charAt(0)}`.toUpperCase(), avatar: p.avatar || "",
        gender: p.gender || "", programIntent: p.programIntent || "", weeksLabel, dueSort: lastPosW == null ? 9999 : lastPosW,
        monthCount, targetPerMonth, belowTarget, inRoster: inRoster.has(String(p._id)),
        targetLabel: targetPerMonth > 0 ? `${monthCount}/${targetPerMonth}` : "",
        conflict, conflicts, alreadyHere, dayBlocked,
        blockout: bkCover ? { label: bkCover.startDate === bkCover.endDate ? bkCover.startDate : `${bkCover.startDate} → ${bkCover.endDate}`, reason: bkCover.reason || "" } : null,
      };
    });
    // cei cu blockout în acea zi → separați în tabul „Blockout"; restul în Fără/Cu conflict
    const live = rows.filter((r) => !r.dayBlocked);
    const blocked = rows.filter((r) => r.dayBlocked);

    // prioritate SIM: dacă poziția e pe un program (SIM1/SIM2), oamenii de pe ACEL SIM apar primii
    // (atât fără conflict, cât și cu conflict). Fără marker de SIM → fără prioritate (0).
    // prioritate: ROSTERUL poziției întâi (cei care slujesc oficial pe ea), apoi SIM-ul poziției
    const rosterRank = (r) => (positionId && r.inRoster ? 0 : 1);
    const simRank = (r) => (teamSim && r.programIntent === teamSim ? 0 : 1);
    // grupare + sortare: fără conflict — întâi rosterul, apoi SIM-ul poziției, apoi sub target, apoi „due" (demult), apoi nume
    const noConf = live.filter((r) => !r.conflict && !r.alreadyHere)
      .sort((a, b) => (rosterRank(a) - rosterRank(b)) || (simRank(a) - simRank(b)) || (b.belowTarget - a.belowTarget) || (b.dueSort - a.dueSort) || a.name.localeCompare(b.name));
    const withConf = live.filter((r) => r.conflict && !r.alreadyHere).sort((a, b) => (rosterRank(a) - rosterRank(b)) || (simRank(a) - simRank(b)) || a.name.localeCompare(b.name));
    const here = live.filter((r) => r.alreadyHere);
    const blockoutPeople = blocked.sort((a, b) => (rosterRank(a) - rosterRank(b)) || (simRank(a) - simRank(b)) || a.name.localeCompare(b.name));
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
        ...(withConf.length ? [{ label: "CU CONFLICT", people: withConf }] : []),
      ],
      // tab separat „Blockout" (ultimul) — oamenii cu blockout în acea zi (pe săptămâna selectată)
      blockout: blockoutPeople,
    });
  } catch (err) {
    console.error("[pc] GET /plans/:id/recommend:", err.message);
    res.status(500).json({ error: "Eroare la recomandări: " + err.message });
  }
});

/* ───────── GET /:id/person-conflicts — detaliul conflictelor unei persoane pe ziua planului ─────────
   Conflicte de SLUJIRE (unde MAI e asignată în aceeași zi) + BLOCKOUT-uri care acoperă ziua.
   Pt. modalul „Verifică": întoarce assignmentId/teamId/positionId → reassign/remove direct. FĂRĂ email. */
router.get("/:id/person-conflicts", requireAny(CAN_VIEW_MATRIX), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    const personId = OID(req.query.personId);
    const positionId = OID(req.query.positionId); // poziția curentă (se exclude din conflicte)
    if (!personId) return res.status(400).json({ error: "personId necesar." });
    const plan = await PcPlan.findOne(scoped(req, { _id: planId })).select("sortDate").lean();
    if (!plan) return res.status(404).json({ error: "Plan inexistent." });
    const tz = await campusTz(req);
    const planDate = new Date(plan.sortDate);
    const dayStart = new Date(planDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const dayKey = dayStart.toISOString().slice(0, 10);
    const person = await PcPerson.findOne(scoped(req, { _id: personId })).select("firstName lastName avatar").lean();

    // planurile din aceeași ZI (orice service type) → asignare acolo = conflict de slujire
    const dayPlans = await PcPlan.find(scoped(req, { sortDate: { $gte: dayStart, $lt: dayEnd } })).select("serviceTypeId sortDate").lean();
    const planStById = Object.fromEntries(dayPlans.map((p) => [String(p._id), String(p.serviceTypeId || "")]));
    const assigns = await PcAssignment.find(scoped(req, { personId, planId: { $in: dayPlans.map((p) => p._id) }, status: { $ne: "declined" } }))
      .select("planId teamId positionId status isGuest").lean();
    // exclude poziția curentă pe planul curent (aia nu e conflict)
    const confAssigns = assigns.filter((a) => !(String(a.planId) === String(planId) && String(a.positionId) === String(positionId)));
    const [teams, positions, sts] = await Promise.all([
      PcTeam.find(scoped(req, { _id: { $in: [...new Set(confAssigns.map((a) => String(a.teamId)).filter(Boolean))] } })).select("name").lean(),
      PcPosition.find(scoped(req, { _id: { $in: [...new Set(confAssigns.map((a) => String(a.positionId)).filter(Boolean))] } })).select("name").lean(),
      PcServiceType.find(scoped(req, { _id: { $in: [...new Set(Object.values(planStById).filter(Boolean))] } })).select("name").lean(),
    ]);
    const teamN = Object.fromEntries(teams.map((t) => [String(t._id), t.name]));
    const posN = Object.fromEntries(positions.map((p) => [String(p._id), p.name]));
    const stN = Object.fromEntries(sts.map((s) => [String(s._id), s.name]));
    const dateLabel = `${fmtWeekday(planDate, tz)} ${fmtDate(planDate, tz)}`;
    const conflicts = confAssigns.map((a) => ({
      assignmentId: a._id, planId: a.planId, teamId: a.teamId || null, positionId: a.positionId || null,
      status: a.status, isGuest: !!a.isGuest, dateLabel,
      serviceTypeName: stN[planStById[String(a.planId)]] || "",
      teamName: teamN[String(a.teamId)] || "",
      positionName: a.positionId ? (posN[String(a.positionId)] || "Poziție") : (a.isGuest ? "Invitat" : "Poziție"),
    }));

    // blockouts care acoperă ziua (exclude churchBlock — ăla scoate persoana oricum)
    const covers = (b) => (!b.startDate || b.startDate <= dayKey) && (!b.endDate || b.endDate >= dayKey);
    const blk = await PcBlockout.find(scoped(req, { personId })).select("startDate endDate type reason").lean();
    const blockouts = blk.filter((b) => b.type !== "churchBlock" && covers(b)).map((b) => ({
      label: b.startDate === b.endDate ? b.startDate : `${b.startDate} → ${b.endDate}`, startDate: b.startDate, endDate: b.endDate, reason: b.reason || "",
    }));

    res.json({
      person: person ? { id: person._id, name: [person.firstName, person.lastName].filter(Boolean).join(" "), avatar: person.avatar || "",
        initials: `${(person.firstName || "").charAt(0)}${(person.lastName || "").charAt(0)}`.toUpperCase() } : null,
      dayLabel: dateLabel, conflicts, blockouts,
    });
  } catch (err) {
    console.error("[pc] GET /plans/:id/person-conflicts:", err.message);
    res.status(500).json({ error: "Eroare la conflicte: " + err.message });
  }
});

/* ───────── POST /:id/assignments/copy — replică asignările unei echipe pe alta (SIM1→SIM2) ─────────
   Potrivește pozițiile după NUME. Status unconfirmed, FĂRĂ email. Idempotent (nu dublează). */
router.post("/:id/assignments/copy", requireAny(CAN_MOVE), async (req, res) => {
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
router.put("/:id/needed", requireAny(CAN_NEEDED), async (req, res) => {
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
    const plan = await PcPlan.findOne(scoped(req, { _id: id })).select("serviceTypeId sortDate").lean();
    const st = plan ? await PcServiceType.findOne(scoped(req, { _id: plan.serviceTypeId })).select("name rehearsalTemplate timePresets").lean() : null;
    const rt = (st && st.rehearsalTemplate) || {};
    const times = await PcPlanTime.find(scoped(req, { planId: id })).sort({ startsAt: 1 }).lean();
    const map = (t) => {
      const wd = weekdayRo(t.startsAt, tz);
      return {
        id: t._id, type: t.type, name: t.name || "",
        weekday: wd.ro, weekdayColor: wd.color,          // 3 litere RO + culoare
        date: fmtFullDate(t.startsAt, tz),
        dateISO: isoDateTz(t.startsAt, tz),              // pt. editor (YYYY-MM-DD)
        startTime: fmt24(t.startsAt, tz),                // 24h, fără AM/PM
        endTime: t.endsAt ? fmt24(t.endsAt, tz) : "",
        range: `${fmt24(t.startsAt, tz)}${t.endsAt ? " - " + fmt24(t.endsAt, tz) : ""}`,
      };
    };

    // ── Acces repetiție: restricționată DOAR dacă templateul are echipe sau capability; altfel vizibilă tuturor ──
    const restricted = (rt.visibleToTeamIds && rt.visibleToTeamIds.length) || !!rt.visibleCapability;
    let canSeeReh = true;
    if (restricted) {
      canSeeReh = can(req, "services.editOrder") || (rt.visibleCapability && can(req, rt.visibleCapability));
      if (!canSeeReh && rt.visibleToTeamIds && rt.visibleToTeamIds.length) {
        const vpid = await viewerPersonId(req);
        if (vpid) {
          const myTeams = (await PcTeamMember.find(scoped(req, { personId: vpid })).select("teamId").lean()).map((m) => String(m.teamId));
          canSeeReh = rt.visibleToTeamIds.some((t) => myTeams.includes(String(t)));
        } else canSeeReh = false;
      }
    }

    // ── Sugestii pt. modalul de Times (dată slujbă = sortDate; repetiție = slujbă - dayOffset) ──
    const svcDateISO = plan ? isoDateTz(plan.sortDate, tz) : "";
    let rehDateISO = "";
    if (svcDateISO && Number.isFinite(rt.dayOffset)) {
      const [y, m, d] = svcDateISO.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d));
      dt.setUTCDate(dt.getUTCDate() - (rt.dayOffset || 0)); rehDateISO = dt.toISOString().slice(0, 10);
    }
    const timePresets = (st && Array.isArray(st.timePresets) && st.timePresets.length)
      ? st.timePresets.map((p) => ({ label: p.label || "", start: p.start || "", end: p.end || "" }))
      : [{ label: "SIM 1", start: "10:00", end: "12:00" }, { label: "SIM 2", start: "12:00", end: "14:00" }];

    res.json({
      service: times.filter((t) => t.type === "service").map(map),
      rehearsal: canSeeReh ? times.filter((t) => t.type === "rehearsal").map(map) : [],
      other: times.filter((t) => t.type === "other").map(map),
      canSeeRehearsal: canSeeReh,
      canEdit: can(req, "services.editOrder"),
      suggestedServiceDate: svcDateISO,
      suggestedRehearsalDate: rehDateISO,
      defaultServiceName: (st && st.name) || "",
      rehearsalTemplate: { enabled: !!rt.enabled, start: rt.start || "", end: rt.end || "", dayOffset: Number.isFinite(rt.dayOffset) ? rt.dayOffset : 1 },
      timePresets,
    });
  } catch (err) {
    console.error("[pc] GET /plans/:id/times:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea orelor." });
  }
});

/* ───────── POST /:id/times — adaugă o oră (service/rehearsal/other), 24h ───────── */
router.post("/:id/times", requireCan("services.editOrder"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    if (!planId) return res.status(400).json({ error: "ID invalid" });
    const b = req.body || {};
    const type = ["service", "rehearsal", "other"].includes(b.type) ? b.type : "rehearsal";
    const date = String(b.date || ""), start = String(b.startTime || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start)) return res.status(400).json({ error: "Dată/oră invalidă (YYYY-MM-DD, HH:MM)." });
    const tz = await campusTz(req);
    const startsAt = wallToUtc(date, start, tz);
    const endsAt = /^\d{2}:\d{2}$/.test(String(b.endTime || "")) ? wallToUtc(date, b.endTime, tz) : null;
    const doc = await PcPlanTime.create(stamp(req, { planId, type, name: String(b.name || ""), startsAt, endsAt }));
    res.status(201).json({ id: doc._id });
  } catch (err) { console.error("[pc] POST time:", err.message); res.status(500).json({ error: "Eroare la adăugarea orei." }); }
});

/* ───────── PATCH /:id/times/:timeId — editează o oră (dată + oră 24h + nume) ───────── */
router.patch("/:id/times/:timeId", requireCan("services.editOrder"), async (req, res) => {
  try {
    const timeId = OID(req.params.timeId);
    const t = await PcPlanTime.findOne(scoped(req, { _id: timeId })).lean();
    if (!t) return res.status(404).json({ error: "Oră inexistentă." });
    const b = req.body || {}, tz = await campusTz(req), set = {};
    if (b.name !== undefined) set.name = String(b.name);
    if (b.type !== undefined && ["service", "rehearsal", "other"].includes(b.type)) set.type = b.type;
    const date = b.date !== undefined ? String(b.date) : isoDateTz(t.startsAt, tz);
    if (b.startTime !== undefined) { if (!/^\d{2}:\d{2}$/.test(String(b.startTime))) return res.status(400).json({ error: "Oră invalidă." }); set.startsAt = wallToUtc(date, b.startTime, tz); }
    else if (b.date !== undefined) set.startsAt = wallToUtc(date, fmt24(t.startsAt, tz), tz);
    if (b.endTime !== undefined) set.endsAt = /^\d{2}:\d{2}$/.test(String(b.endTime)) ? wallToUtc(date, b.endTime, tz) : null;
    await PcPlanTime.updateOne(scoped(req, { _id: timeId }), { $set: set });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] PATCH time:", err.message); res.status(500).json({ error: "Eroare la editarea orei." }); }
});

/* ───────── DELETE /:id/times/:timeId ───────── */
router.delete("/:id/times/:timeId", requireCan("services.editOrder"), async (req, res) => {
  try {
    const t = await PcPlanTime.findOneAndUpdate(scoped(req, { _id: OID(req.params.timeId) }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!t) return res.status(404).json({ error: "Oră inexistentă." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE time:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── POST /:id/times/apply-rehearsal-template — setează repetiția din template-ul service-type-ului ───────── */
router.post("/:id/times/apply-rehearsal-template", requireCan("services.editOrder"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    if (!planId) return res.status(400).json({ error: "ID invalid" });
    const plan = await PcPlan.findOne(scoped(req, { _id: planId })).select("serviceTypeId sortDate").lean();
    if (!plan) return res.status(404).json({ error: "Plan inexistent." });
    const st = await PcServiceType.findOne(scoped(req, { _id: plan.serviceTypeId })).select("rehearsalTemplate").lean();
    const rt = st && st.rehearsalTemplate;
    if (!rt || !rt.enabled || !/^\d{2}:\d{2}$/.test(String(rt.start || ""))) return res.status(400).json({ error: "Service type-ul nu are un template de repetiție setat." });
    const exists = await PcPlanTime.findOne(scoped(req, { planId, type: "rehearsal" })).select("_id").lean();
    if (exists) return res.json({ ok: true, skipped: true });
    const tz = await campusTz(req);
    const svcISO = isoDateTz(plan.sortDate, tz);
    const [y, m, d] = svcISO.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - (Number.isFinite(rt.dayOffset) ? rt.dayOffset : 1));
    const rehISO = dt.toISOString().slice(0, 10);
    const startsAt = wallToUtc(rehISO, rt.start, tz);
    const endsAt = /^\d{2}:\d{2}$/.test(String(rt.end || "")) ? wallToUtc(rehISO, rt.end, tz) : null;
    const doc = await PcPlanTime.create(stamp(req, { planId, type: "rehearsal", name: "Repetiție", startsAt, endsAt }));
    res.status(201).json({ ok: true, id: doc._id });
  } catch (err) { console.error("[pc] POST apply-rehearsal-template:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ═════════ Planning Center ALERTS (tab Alerts, doar cine are editOrder) ═════════ */
async function alertStats(req, planId, al) {
  // destinatari = oameni programați (ne-declinați) în echipele-țintă pe acest plan
  const recipients = al.teamIds?.length
    ? await PcAssignment.distinct("personId", scoped(req, { planId, teamId: { $in: al.teamIds }, status: { $ne: "declined" } }))
    : [];
  const ackedIds = new Set((await PcAlertAck.find(scoped(req, { alertId: al._id })).select("personId").lean()).map((a) => String(a.personId)));
  const recIds = recipients.map(String);
  return { recipientCount: recIds.length, ackCount: ackedIds.size, recipientIds: recIds, ackedIds: [...ackedIds] };
}

/* GET /:id/alerts — lista alertelor planului (+ contoare citire) */
router.get("/:id/alerts", requireCan("services.editOrder"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    const alerts = await PcAlert.find(scoped(req, { planId })).sort({ createdAt: -1 }).lean();
    const teams = await PcTeam.find(scoped(req, { _id: { $in: alerts.flatMap((a) => a.teamIds || []) } })).select("name").lean();
    const tName = Object.fromEntries(teams.map((t) => [String(t._id), t.name]));
    const stats = [];
    for (const a of alerts) stats.push({ a, s: await alertStats(req, planId, a) });
    // un singur fetch de persoane pentru toate alertele (seen/not-seen cu nume + avatar)
    const allPids = [...new Set(stats.flatMap(({ s }) => s.recipientIds))].map(OID).filter(Boolean);
    const people = allPids.length ? await PcPerson.find(scoped(req, { _id: { $in: allPids } })).select("firstName lastName avatar").lean() : [];
    const pById = Object.fromEntries(people.map((p) => [String(p._id), personMini(p)]));
    const out = stats.map(({ a, s }) => {
      const ackedSet = new Set(s.ackedIds);
      const ackedPeople = s.recipientIds.filter((id) => ackedSet.has(id)).map((id) => pById[id]).filter(Boolean);
      const pendingPeople = s.recipientIds.filter((id) => !ackedSet.has(id)).map((id) => pById[id]).filter(Boolean);
      return {
        id: a._id, title: a.title, body: a.body, status: a.status, scheduledAt: a.scheduledAt, sentAt: a.sentAt,
        teamIds: (a.teamIds || []).map(String), teamNames: (a.teamIds || []).map((t) => tName[String(t)] || "—"),
        attachments: a.attachments || [], links: a.links || [],
        recipientCount: s.recipientCount, ackCount: s.ackCount, ackedPeople, pendingPeople,
      };
    });
    res.json({ alerts: out });
  } catch (err) { console.error("[pc] GET alerts:", err.message); res.status(500).json({ error: "Eroare la alerte." }); }
});

/* POST /:id/alerts — creează (trimite acum sau programează) */
router.post("/:id/alerts", requireCan("services.editOrder"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    const b = req.body || {};
    const title = String(b.title || "").trim();
    if (!title) return res.status(400).json({ error: "Titlul alertei e obligatoriu." });
    const teamIds = Array.isArray(b.teamIds) ? b.teamIds.map(OID).filter(Boolean) : [];
    if (!teamIds.length) return res.status(400).json({ error: "Alege cel puțin o echipă căreia îi trimiți." });
    const me = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
    const schedule = b.scheduledAt ? new Date(b.scheduledAt) : null;
    const status = schedule && schedule > new Date() ? "scheduled" : "sent";
    const doc = await PcAlert.create(stamp(req, {
      planId, createdByPersonId: me?._id || null, title, body: String(b.body || ""),
      teamIds, attachments: Array.isArray(b.attachments) ? b.attachments : [], links: Array.isArray(b.links) ? b.links : [],
      status, scheduledAt: status === "scheduled" ? schedule : null, sentAt: status === "sent" ? new Date() : null,
      pushedAt: status === "sent" ? new Date() : null,
    }));
    // Push la destinatari DOAR dacă e „sent" acum (gated de env PC_ALERTS_PUSH — altfel no-op). Fire-and-forget.
    if (status === "sent") sendAlertPush(req.pcOrgId, doc.toObject()).catch((e) => console.error("[pc] alert push:", e.message));
    res.status(201).json({ id: doc._id, status });
  } catch (err) { console.error("[pc] POST alert:", err.message); res.status(500).json({ error: "Eroare la crearea alertei." }); }
});

/* PATCH /:id/alerts/:alertId — editează (util mai ales pt. cele programate) */
router.patch("/:id/alerts/:alertId", requireCan("services.editOrder"), async (req, res) => {
  try {
    const alertId = OID(req.params.alertId);
    const b = req.body || {}, set = {};
    if (b.title !== undefined) set.title = String(b.title);
    if (b.body !== undefined) set.body = String(b.body);
    if (Array.isArray(b.teamIds)) set.teamIds = b.teamIds.map(OID).filter(Boolean);
    if (Array.isArray(b.attachments)) set.attachments = b.attachments;
    if (Array.isArray(b.links)) set.links = b.links;
    let becameSent = false;
    if (b.scheduledAt !== undefined) {
      const schedule = b.scheduledAt ? new Date(b.scheduledAt) : null;
      if (schedule && schedule > new Date()) { set.status = "scheduled"; set.scheduledAt = schedule; set.sentAt = null; }
      else { set.status = "sent"; set.scheduledAt = null; set.sentAt = new Date(); set.pushedAt = new Date(); becameSent = true; }
    }
    const a = await PcAlert.findOneAndUpdate(scoped(req, { _id: alertId }), { $set: set }, { new: true }).lean();
    if (!a) return res.status(404).json({ error: "Alertă inexistentă." });
    // Push doar la tranziția programat→trimite-acum (gated de env). Fire-and-forget.
    if (becameSent) sendAlertPush(req.pcOrgId, a).catch((e) => console.error("[pc] alert push:", e.message));
    res.json({ ok: true });
  } catch (err) { console.error("[pc] PATCH alert:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* DELETE /:id/alerts/:alertId */
router.delete("/:id/alerts/:alertId", requireCan("services.editOrder"), async (req, res) => {
  try {
    const a = await PcAlert.findOneAndUpdate(scoped(req, { _id: OID(req.params.alertId) }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!a) return res.status(404).json({ error: "Alertă inexistentă." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE alert:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* GET /:id/link-meta?url= — titlu auto pt. link-uri (YouTube oEmbed, fără CORS/cheie) */
router.get("/:id/link-meta", requireCan("services.editOrder"), async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();
    if (!/^https?:\/\//i.test(url) || !/(youtube\.com|youtu\.be)/i.test(url)) return res.json({ title: "" });
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!r.ok) return res.json({ title: "" });
    const j = await r.json();
    res.json({ title: j.title || "", author: j.author_name || "" });
  } catch { res.json({ title: "" }); }
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

/* ═════════ Note de plan cu VIEW-URI țintite (PcNoteView) ═════════ */

/** Echipele/pozițiile/oamenii de pe plan — sursă pt. pickerul de audiență al view-urilor. */
async function notePicker(req, planId) {
  const assigns = await PcAssignment.find(scoped(req, { planId, status: { $ne: "declined" } })).lean();
  const teamIds = [...new Set(assigns.map((a) => String(a.teamId)).filter(Boolean))].map(OID);
  const posIds = [...new Set(assigns.map((a) => String(a.positionId)).filter(Boolean))].map(OID);
  const perIds = [...new Set(assigns.map((a) => String(a.personId)).filter(Boolean))].map(OID);
  const [teams, positions, people] = await Promise.all([
    PcTeam.find(scoped(req, { _id: { $in: teamIds } })).select("name").lean(),
    PcPosition.find(scoped(req, { _id: { $in: posIds } })).select("name teamId").lean(),
    PcPerson.find(scoped(req, { _id: { $in: perIds } })).select("firstName lastName avatar").lean(),
  ]);
  const tName = Object.fromEntries(teams.map((t) => [String(t._id), t.name]));
  const posById = Object.fromEntries(positions.map((p) => [String(p._id), p]));
  const perById = Object.fromEntries(people.map((p) => [String(p._id), p]));
  const byTeam = {};
  for (const a of assigns) {
    const tid = String(a.teamId); if (!tid) continue;
    byTeam[tid] = byTeam[tid] || { teamId: tid, name: tName[tid] || "Echipă", roles: new Set(), people: {} };
    const pos = posById[String(a.positionId)]; if (pos?.name) byTeam[tid].roles.add(pos.name);
    const per = perById[String(a.personId)];
    if (per) {
      const pid = String(per._id);
      byTeam[tid].people[pid] = byTeam[tid].people[pid] || { personId: pid, name: [per.firstName, per.lastName].filter(Boolean).join(" "), avatar: per.avatar || "", roles: new Set() };
      if (pos?.name) byTeam[tid].people[pid].roles.add(pos.name); // rolul exact pe care-l are pe acest plan (pt. filtrare)
    }
  }
  return Object.values(byTeam).map((t) => ({ teamId: t.teamId, name: t.name, roles: [...t.roles], people: Object.values(t.people).map((p) => ({ personId: p.personId, name: p.name, avatar: p.avatar, roles: [...p.roles] })) }));
}

/* GET /:id/my-note — nota aplicabilă MIE (un singur view: cel mai prioritar care mă prinde) */
router.get("/:id/my-note", requireCan("people.view"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    const me = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
    if (!me) return res.json({ note: null });
    const meId = String(me._id);
    const myAssigns = await PcAssignment.find(scoped(req, { planId: id, personId: me._id, status: { $ne: "declined" } })).select("teamId positionId").lean();
    const myTeams = new Set(myAssigns.map((a) => String(a.teamId)));
    const positions = await PcPosition.find(scoped(req, { _id: { $in: myAssigns.map((a) => a.positionId).filter(Boolean) } })).select("name").lean();
    const myRoles = new Set(positions.map((p) => p.name));
    const views = await PcNoteView.find(scoped(req, { planId: id })).sort({ priority: -1 }).lean();
    const pinned = views.filter((v) => v.pinned && (v.specificPersonIds || []).some((p) => String(p) === meId)).sort((a, b) => b.priority - a.priority);
    const role = views.filter((v) => !v.pinned && (v.teamIds || []).some((t) => myTeams.has(String(t))) && (v.roleNames || []).some((r) => myRoles.has(r))).sort((a, b) => b.priority - a.priority);
    const v = pinned[0] || role[0] || null;
    res.json({ note: v ? { id: v._id, title: v.title, content: v.content } : null });
  } catch (err) { console.error("[pc] GET my-note:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* GET /:id/note-views — toate view-urile + picker (doar coordonatori/editOrder) */
router.get("/:id/note-views", requireCan("services.editOrder"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    const views = await PcNoteView.find(scoped(req, { planId: id })).sort({ pinned: -1, priority: -1 }).lean();
    const perIds = [...new Set(views.flatMap((v) => (v.specificPersonIds || []).map(String)))].map(OID);
    const people = perIds.length ? await PcPerson.find(scoped(req, { _id: { $in: perIds } })).select("firstName lastName").lean() : [];
    const pName = Object.fromEntries(people.map((p) => [String(p._id), [p.firstName, p.lastName].filter(Boolean).join(" ")]));
    res.json({
      views: views.map((v) => ({ id: v._id, title: v.title, content: v.content, teamIds: (v.teamIds || []).map(String), roleNames: v.roleNames || [], specificPersonIds: (v.specificPersonIds || []).map(String), specificNames: (v.specificPersonIds || []).map((p) => pName[String(p)] || "—"), pinned: !!v.pinned, priority: v.priority || 0 })),
      picker: await notePicker(req, id),
    });
  } catch (err) { console.error("[pc] GET note-views:", err.message); res.status(500).json({ error: "Eroare." }); }
});

const sanitizeView = (b) => {
  const spec = Array.isArray(b.specificPersonIds) ? b.specificPersonIds.map(OID).filter(Boolean) : [];
  return {
    title: String(b.title || ""), content: String(b.content || ""),
    teamIds: Array.isArray(b.teamIds) ? b.teamIds.map(OID).filter(Boolean) : [],
    roleNames: Array.isArray(b.roleNames) ? b.roleNames.map(String) : [],
    specificPersonIds: spec, pinned: spec.length > 0,
  };
};
router.post("/:id/note-views", requireCan("services.editOrder"), async (req, res) => {
  try {
    const planId = OID(req.params.id);
    const last = await PcNoteView.findOne(scoped(req, { planId })).sort({ priority: -1 }).select("priority").lean();
    const doc = await PcNoteView.create(stamp(req, { planId, createdByPersonId: (await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean())?._id || null, priority: (last?.priority || 0) + 1, ...sanitizeView(req.body || {}) }));
    res.status(201).json({ id: doc._id });
  } catch (err) { console.error("[pc] POST note-view:", err.message); res.status(500).json({ error: "Eroare la view." }); }
});
router.patch("/:id/note-views/:viewId", requireCan("services.editOrder"), async (req, res) => {
  try {
    const v = await PcNoteView.findOneAndUpdate(scoped(req, { _id: OID(req.params.viewId) }), { $set: sanitizeView(req.body || {}) }).select("_id").lean();
    if (!v) return res.status(404).json({ error: "View inexistent." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] PATCH note-view:", err.message); res.status(500).json({ error: "Eroare." }); }
});
router.delete("/:id/note-views/:viewId", requireCan("services.editOrder"), async (req, res) => {
  try {
    const v = await PcNoteView.findOneAndUpdate(scoped(req, { _id: OID(req.params.viewId) }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!v) return res.status(404).json({ error: "View inexistent." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE note-view:", err.message); res.status(500).json({ error: "Eroare." }); }
});
/* reorder: ordinea view-urilor NEPINNED (prioritate); pinned rămân mereu deasupra */
router.post("/:id/note-views/reorder", requireCan("services.editOrder"), async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.viewIds) ? req.body.viewIds : [];
    // primul din listă = cel mai prioritar → priority mare
    for (let i = 0; i < ids.length; i++) { const oid = OID(ids[i]); if (oid) await PcNoteView.updateOne(scoped(req, { _id: oid }), { $set: { priority: ids.length - i } }); }
    res.json({ ok: true });
  } catch (err) { console.error("[pc] reorder note-views:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── GET /:id/calendar-prefill — evenimente precompletate pt. „adaugă în calendar" ───────── */
router.get("/:id/calendar-prefill", requireCan("people.view"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    const plan = await PcPlan.findOne(scoped(req, { _id: id })).select("serviceTypeId sortDate").lean();
    if (!plan) return res.status(404).json({ error: "Plan inexistent." });
    const st = await PcServiceType.findOne(scoped(req, { _id: plan.serviceTypeId })).select("name").lean();
    const times = await PcPlanTime.find(scoped(req, { planId: id })).sort({ startsAt: 1 }).lean();
    const stName = st?.name || "Slujire";
    const addH = (d, h) => new Date(new Date(d).getTime() + h * 3600000).toISOString();
    const events = times.filter((t) => t.startsAt).map((t) => ({
      summary: t.type === "rehearsal" ? `${stName} — Repetiție` : (t.type === "other" ? `${stName} — ${t.name || "Alt timp"}` : stName),
      start: new Date(t.startsAt).toISOString(),
      end: t.endsAt ? new Date(t.endsAt).toISOString() : addH(t.startsAt, 1.5),
      description: `${stName}${t.name ? ` · ${t.name}` : ""}`,
    }));
    if (!events.length && plan.sortDate) events.push({ summary: stName, start: new Date(plan.sortDate).toISOString(), end: addH(plan.sortDate, 1.5), description: stName });
    res.json({ serviceType: stName, events });
  } catch (err) { console.error("[pc] calendar-prefill:", err.message); res.status(500).json({ error: "Eroare." }); }
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
