/**
 * Rute Teams — listă echipe + „grupuri de slujire" (ministryGroup) + MANAGEMENT (#9).
 * /api/pc/v1/teams.
 *
 * Grupurile de slujire = nivel 1 peste echipe (cele 5 mari la Vertical). `ministryGroup`
 * e string LIBER pe PcTeam (aditiv) → compatibil cu importul PCO: echipele fără grup cad
 * în „Fără grup"; un import din alt PCO cu alte grupuri le adaugă fără să strice feng-shui-ul.
 *
 * Teams management (#9): CRUD echipe + poziții la nivel de service type, exact ca în PCO
 * (Service Type → Teams). Toate câmpurile există deja pe modele (aditiv, import-ready):
 * flags (rehearsal/secure/split/tag), defaults de planificare (onDecline/scheduledViewerAccess/
 * defaultStatus/defaultPrepared/repliesToMode), poziții cu sortOrder. Ștergerea = soft-delete
 * (deletedAt) cu CASCADĂ reversibilă pe poziții/needed/asignări/membri. ZERO email — doar DB.
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcTeam, PcPosition, PcServiceType, PcNeededPosition, PcAssignment, PcTeamMember,
} = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);

// Cele 5 slujiri mari (default). Rămân disponibile mereu; restul se adaugă din date.
const DEFAULT_MINISTRY_GROUPS = ["Asimilare", "Laudă și Închinare", "Vertical Kids", "Media", "Creative"];

// enum-uri acceptate la defaults de planificare (anti-pollution; identice cu PcTeam)
const REPLIES_TO = ["currentScheduler", "allLeaders", "person"];
const ON_DECLINE = ["doNotReschedule", "manual", "replacement", "autoSchedule", "signup"];
const VIEWER_ACCESS = ["fullPlan", "myScheduleOnly"];
const DEF_STATUS = ["unconfirmed", "confirmed"];

/* ───────── GET /ministry-groups — grupurile (default + prezente) + nr. echipe ───────── */
router.get("/ministry-groups", requireCan("people.view"), async (req, res) => {
  try {
    const teams = await PcTeam.find(scoped(req, { archived: false })).select("ministryGroup").lean();
    const counts = {};
    let ungrouped = 0;
    for (const t of teams) {
      const g = (t.ministryGroup || "").trim();
      if (g) counts[g] = (counts[g] || 0) + 1; else ungrouped++;
    }
    const extra = Object.keys(counts).filter((g) => !DEFAULT_MINISTRY_GROUPS.includes(g));
    const names = [...DEFAULT_MINISTRY_GROUPS, ...extra];
    res.json({
      groups: names.map((name) => ({ name, teamCount: counts[name] || 0, isDefault: DEFAULT_MINISTRY_GROUPS.includes(name) })),
      ungroupedCount: ungrouped,
      defaults: DEFAULT_MINISTRY_GROUPS,
    });
  } catch (err) { console.error("[pc] GET /teams/ministry-groups:", err.message); res.status(500).json({ error: "Eroare la grupuri." }); }
});

/* ───────── GET /manage?serviceTypeId=… — echipe + poziții + config (ecranul Teams #9) ───────── */
router.get("/manage", requireCan("people.view"), async (req, res) => {
  try {
    const stId = OID(req.query.serviceTypeId);
    if (!stId) return res.status(400).json({ error: "serviceTypeId lipsește." });
    const st = await PcServiceType.findOne(scoped(req, { _id: stId })).select("name").lean();
    if (!st) return res.status(404).json({ error: "Service type inexistent." });

    const teams = await PcTeam.find(scoped(req, { serviceTypeId: stId, archived: false })).sort({ sortOrder: 1, name: 1 }).lean();
    const teamIds = teams.map((t) => t._id);
    const [positions, assigns] = await Promise.all([
      PcPosition.find(scoped(req, { teamId: { $in: teamIds } })).sort({ sortOrder: 1, name: 1 }).lean(),
      PcAssignment.find(scoped(req, { teamId: { $in: teamIds } })).select("teamId positionId").lean(),
    ]);
    // nr. asignări per echipă / per poziție (pt. avertismentul la ștergere)
    const perTeam = {}, perPos = {};
    for (const a of assigns) {
      perTeam[String(a.teamId)] = (perTeam[String(a.teamId)] || 0) + 1;
      if (a.positionId) perPos[String(a.positionId)] = (perPos[String(a.positionId)] || 0) + 1;
    }
    const posByTeam = {};
    for (const p of positions) (posByTeam[String(p.teamId)] = posByTeam[String(p.teamId)] || []).push(p);

    // grupurile de slujire disponibile (default + cele deja folosite)
    const usedGroups = [...new Set(teams.map((t) => (t.ministryGroup || "").trim()).filter(Boolean))];
    const groups = [...DEFAULT_MINISTRY_GROUPS, ...usedGroups.filter((g) => !DEFAULT_MINISTRY_GROUPS.includes(g))];

    res.json({
      serviceTypeId: st._id,
      serviceTypeName: st.name,
      ministryGroups: groups,
      teams: teams.map((t) => ({
        id: t._id,
        name: t.name,
        ministryGroup: t.ministryGroup || "",
        sortOrder: t.sortOrder || 0,
        flags: {
          rehearsal: !!t.flags?.rehearsal,
          secure: !!t.flags?.secure,
          split: !!t.flags?.split,
          tag: !!t.flags?.tag,
        },
        repliesToMode: t.repliesToMode || "currentScheduler",
        onDecline: t.onDecline || "manual",
        scheduledViewerAccess: t.scheduledViewerAccess || "myScheduleOnly",
        defaultStatus: t.defaultStatus || "unconfirmed",
        defaultPrepared: !!t.defaultPrepared,
        assignedCount: perTeam[String(t._id)] || 0,
        positions: (posByTeam[String(t._id)] || []).map((p) => ({
          id: p._id, name: p.name, sortOrder: p.sortOrder || 0, assignedCount: perPos[String(p._id)] || 0,
        })),
      })),
    });
  } catch (err) { console.error("[pc] GET /teams/manage:", err.message); res.status(500).json({ error: "Eroare la management-ul echipelor." }); }
});

/* ───────── GET / — listă echipe (pt. maparea pe grupuri + People) ───────── */
router.get("/", requireCan("people.view"), async (req, res) => {
  try {
    const [teams, sts] = await Promise.all([
      PcTeam.find(scoped(req, { archived: false })).sort({ sortOrder: 1, name: 1 }).lean(),
      PcServiceType.find(scoped(req)).select("name").lean(),
    ]);
    const stName = Object.fromEntries(sts.map((s) => [String(s._id), s.name]));
    res.json({
      teams: teams.map((t) => ({
        id: t._id, name: t.name,
        serviceTypeName: t.serviceTypeId ? stName[String(t.serviceTypeId)] || "" : "",
        ministryGroup: t.ministryGroup || "",
      })),
    });
  } catch (err) { console.error("[pc] GET /teams:", err.message); res.status(500).json({ error: "Eroare la echipe." }); }
});

/* ───────── POST / — creează o echipă într-un service type ───────── */
router.post("/", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const stId = OID(req.body?.serviceTypeId);
    const name = String(req.body?.name || "").trim().slice(0, 120);
    if (!stId) return res.status(400).json({ error: "serviceTypeId lipsește." });
    if (!name) return res.status(400).json({ error: "Numele echipei e obligatoriu." });
    const st = await PcServiceType.findOne(scoped(req, { _id: stId })).select("_id").lean();
    if (!st) return res.status(404).json({ error: "Service type inexistent." });
    const sortOrder = await PcTeam.countDocuments(scoped(req, { serviceTypeId: stId, archived: false }));
    const ministryGroup = String(req.body?.ministryGroup || "").trim().slice(0, 60);
    const t = await PcTeam.create(stamp(req, { name, serviceTypeId: stId, ministryGroup, sortOrder }));
    res.status(201).json({
      id: t._id, name: t.name, ministryGroup: t.ministryGroup || "", sortOrder: t.sortOrder || 0,
      flags: { rehearsal: false, secure: false, split: false, tag: false },
      repliesToMode: t.repliesToMode, onDecline: t.onDecline, scheduledViewerAccess: t.scheduledViewerAccess,
      defaultStatus: t.defaultStatus, defaultPrepared: !!t.defaultPrepared, assignedCount: 0, positions: [],
    });
  } catch (err) { console.error("[pc] POST /teams:", err.message); res.status(500).json({ error: "Eroare la crearea echipei." }); }
});

/* ───────── POST /reorder — reordonează echipele unui service type ───────── */
router.post("/reorder", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
    const ops = ids.map((id, i) => ({
      updateOne: { filter: scoped(req, { _id: OID(id) }), update: { $set: { sortOrder: i } } },
    })).filter((o) => o.updateOne.filter._id);
    if (ops.length) await PcTeam.bulkWrite(ops);
    res.json({ ok: true });
  } catch (err) { console.error("[pc] POST /teams/reorder:", err.message); res.status(500).json({ error: "Eroare la reordonare." }); }
});

/* ───────── PATCH /:teamId — redenumire / grup / flags / defaults de planificare ───────── */
router.patch("/:teamId", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const b = req.body || {};
    const set = {};
    if (b.name !== undefined) set.name = String(b.name).trim().slice(0, 120);
    if (b.ministryGroup !== undefined) set.ministryGroup = String(b.ministryGroup || "").trim().slice(0, 60);
    if (typeof b.sortOrder === "number") set.sortOrder = b.sortOrder;
    if (b.flags && typeof b.flags === "object") {
      for (const k of ["rehearsal", "secure", "split", "tag"]) {
        if (b.flags[k] !== undefined) set[`flags.${k}`] = !!b.flags[k];
      }
    }
    if (b.repliesToMode !== undefined && REPLIES_TO.includes(b.repliesToMode)) set.repliesToMode = b.repliesToMode;
    if (b.onDecline !== undefined && ON_DECLINE.includes(b.onDecline)) set.onDecline = b.onDecline;
    if (b.scheduledViewerAccess !== undefined && VIEWER_ACCESS.includes(b.scheduledViewerAccess)) set.scheduledViewerAccess = b.scheduledViewerAccess;
    if (b.defaultStatus !== undefined && DEF_STATUS.includes(b.defaultStatus)) set.defaultStatus = b.defaultStatus;
    if (b.defaultPrepared !== undefined) set.defaultPrepared = !!b.defaultPrepared;
    if (set.name !== undefined && !set.name) return res.status(400).json({ error: "Numele nu poate fi gol." });
    if (!Object.keys(set).length) return res.status(400).json({ error: "Nimic de salvat." });
    const t = await PcTeam.findOneAndUpdate(scoped(req, { _id: OID(req.params.teamId) }), { $set: set }, { new: true }).lean();
    if (!t) return res.status(404).json({ error: "Echipă inexistentă." });
    res.json({ ok: true, name: t.name, ministryGroup: t.ministryGroup || "" });
  } catch (err) { console.error("[pc] PATCH /teams/:teamId:", err.message); res.status(500).json({ error: "Eroare la salvare." }); }
});

/* ───────── DELETE /:teamId — soft-delete cu cascadă reversibilă (poziții/needed/asignări/membri) ───────── */
router.delete("/:teamId", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const teamId = OID(req.params.teamId);
    const t = await PcTeam.findOneAndUpdate(scoped(req, { _id: teamId }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!t) return res.status(404).json({ error: "Echipă inexistentă." });
    const now = new Date();
    await Promise.all([
      PcPosition.updateMany(scoped(req, { teamId }), { $set: { deletedAt: now } }),
      PcNeededPosition.updateMany(scoped(req, { teamId }), { $set: { deletedAt: now } }),
      PcAssignment.updateMany(scoped(req, { teamId }), { $set: { deletedAt: now } }),
      PcTeamMember.updateMany({ orgId: req.pcOrgId, teamId }, { $set: { deletedAt: now } }),
    ]);
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE /teams/:teamId:", err.message); res.status(500).json({ error: "Eroare la ștergere." }); }
});

/* ───────── POST /:teamId/positions — adaugă poziție ───────── */
router.post("/:teamId/positions", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const teamId = OID(req.params.teamId);
    const name = String(req.body?.name || "").trim().slice(0, 120);
    if (!name) return res.status(400).json({ error: "Numele poziției e obligatoriu." });
    const team = await PcTeam.findOne(scoped(req, { _id: teamId })).select("_id").lean();
    if (!team) return res.status(404).json({ error: "Echipă inexistentă." });
    const sortOrder = await PcPosition.countDocuments(scoped(req, { teamId }));
    const p = await PcPosition.create(stamp(req, { teamId, name, sortOrder }));
    res.status(201).json({ id: p._id, name: p.name, sortOrder: p.sortOrder || 0, assignedCount: 0 });
  } catch (err) { console.error("[pc] POST /teams/:teamId/positions:", err.message); res.status(500).json({ error: "Eroare la adăugarea poziției." }); }
});

/* ───────── PATCH /:teamId/positions/:positionId — redenumire poziție ───────── */
router.patch("/:teamId/positions/:positionId", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim().slice(0, 120);
    if (!name) return res.status(400).json({ error: "Numele nu poate fi gol." });
    const p = await PcPosition.findOneAndUpdate(
      scoped(req, { _id: OID(req.params.positionId), teamId: OID(req.params.teamId) }),
      { $set: { name } }, { new: true }
    ).select("_id name").lean();
    if (!p) return res.status(404).json({ error: "Poziție inexistentă." });
    res.json({ ok: true, name: p.name });
  } catch (err) { console.error("[pc] PATCH position:", err.message); res.status(500).json({ error: "Eroare la redenumire." }); }
});

/* ───────── DELETE /:teamId/positions/:positionId — soft-delete poziție + needed + asignări ───────── */
router.delete("/:teamId/positions/:positionId", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const teamId = OID(req.params.teamId), positionId = OID(req.params.positionId);
    const p = await PcPosition.findOneAndUpdate(scoped(req, { _id: positionId, teamId }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!p) return res.status(404).json({ error: "Poziție inexistentă." });
    const now = new Date();
    await Promise.all([
      PcNeededPosition.updateMany(scoped(req, { teamId, positionId }), { $set: { deletedAt: now } }),
      PcAssignment.updateMany(scoped(req, { teamId, positionId }), { $set: { deletedAt: now } }),
    ]);
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE position:", err.message); res.status(500).json({ error: "Eroare la ștergerea poziției." }); }
});

/* ───────── POST /:teamId/positions/reorder — reordonează pozițiile unei echipe ───────── */
router.post("/:teamId/positions/reorder", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const teamId = OID(req.params.teamId);
    const ids = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
    const ops = ids.map((id, i) => ({
      updateOne: { filter: scoped(req, { _id: OID(id), teamId }), update: { $set: { sortOrder: i } } },
    })).filter((o) => o.updateOne.filter._id);
    if (ops.length) await PcPosition.bulkWrite(ops);
    res.json({ ok: true });
  } catch (err) { console.error("[pc] POST positions/reorder:", err.message); res.status(500).json({ error: "Eroare la reordonare." }); }
});

module.exports = router;
