/**
 * Rute Service Types — „Create a service" (wizard Name→Times→Teams). /api/pc/v1/service-types.
 * Creează service type + PRIMUL plan + service times + echipele conduse (viewer = lider).
 * Logica din transcriptul PCO: service type recurent; poate avea mai multe ore; teams în service type.
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcServiceType, PcPlan, PcPlanTime, PcTeam, PcTeamMember, PcPerson, PcOrg, PcCampus,
} = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");
const { wallToUtc } = require("../lib/time");
const { DEFAULT_ITEM_ROW_COLORS } = require("../lib/orderColors");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);

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

/* ───────── POST / — creează service type + primul plan (wizard) ───────── */
router.post("/", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || "").trim();
    if (!name) return res.status(400).json({ error: "Numele service type-ului e obligatoriu." });
    if (!b.firstDate) return res.status(400).json({ error: "Alege prima dată de planificare." });
    const serviceTimes = (Array.isArray(b.serviceTimes) ? b.serviceTimes : []).filter((t) => t && t.start);
    if (serviceTimes.length === 0) return res.status(400).json({ error: "Adaugă cel puțin o oră de serviciu." });

    const tz = await campusTz(req);
    const sortOrder = await PcServiceType.countDocuments(scoped(req));

    const st = await PcServiceType.create(stamp(req, {
      name,
      frequency: b.frequency || "weekly",
      serviceTimeTemplate: serviceTimes.map((t) => ({ start: t.start, end: t.end || "" })),
      itemRowColors: DEFAULT_ITEM_ROW_COLORS,
      sortOrder,
    }));

    // primul plan la firstDate, cu prima oră ca sortDate
    const sortDate = wallToUtc(b.firstDate, serviceTimes[0].start, tz) || new Date(b.firstDate);
    const plan = await PcPlan.create(stamp(req, { serviceTypeId: st._id, sortDate }));

    for (const t of serviceTimes) {
      await PcPlanTime.create(stamp(req, {
        planId: plan._id, type: "service", name: "",
        startsAt: wallToUtc(b.firstDate, t.start, tz) || sortDate,
        endsAt: t.end ? wallToUtc(b.firstDate, t.end, tz) : null,
      }));
    }

    // echipele conduse (viewer = lider)
    const viewer = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
    const teamNames = (Array.isArray(b.teams) ? b.teams : []).map((s) => String(s).trim()).filter(Boolean);
    for (const tn of teamNames) {
      let team = await PcTeam.findOne(scoped(req, { name: tn, serviceTypeId: st._id }));
      if (!team) team = await PcTeam.create(stamp(req, { name: tn, serviceTypeId: st._id }));
      if (viewer) {
        await PcTeamMember.updateOne(
          { orgId: req.pcOrgId, teamId: team._id, personId: viewer._id },
          { $setOnInsert: { orgId: req.pcOrgId, teamId: team._id, personId: viewer._id, isLeader: true } },
          { upsert: true }
        );
      }
    }

    res.status(201).json({ serviceTypeId: st._id, planId: plan._id });
  } catch (err) {
    console.error("[pc] POST /service-types:", err.message);
    res.status(500).json({ error: "Eroare la crearea service type-ului: " + err.message });
  }
});

/* ───────── GET /:id — setări service type (pt. ecranul Settings) ───────── */
router.get("/:id", requireCan("people.view"), async (req, res) => {
  try {
    const st = await PcServiceType.findOne(scoped(req, { _id: OID(req.params.id) })).lean();
    if (!st) return res.status(404).json({ error: "Service type inexistent." });
    res.json({
      id: st._id,
      name: st.name,
      frequency: st.frequency || "weekly",
      itemRowColors: (st.itemRowColors && st.itemRowColors.length) ? st.itemRowColors : DEFAULT_ITEM_ROW_COLORS,
      useCustomRowColors: st.useCustomRowColors !== false,
    });
  } catch (err) {
    console.error("[pc] GET /service-types/:id:", err.message);
    res.status(500).json({ error: "Eroare la citirea setărilor." });
  }
});

/* ───────── PATCH /:id — actualizează setări (nume/frequency/itemRowColors) ───────── */
router.patch("/:id", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const set = {};
    const b = req.body || {};
    if (b.name !== undefined) set.name = String(b.name).trim();
    if (b.frequency !== undefined) set.frequency = String(b.frequency);
    if (b.useCustomRowColors !== undefined) set.useCustomRowColors = !!b.useCustomRowColors;
    if (Array.isArray(b.itemRowColors)) {
      set.itemRowColors = b.itemRowColors
        .filter((r) => r && r.match)
        .map((r) => ({ match: String(r.match), label: String(r.label || r.match), color: String(r.color || "") }));
    }
    const st = await PcServiceType.findOneAndUpdate(scoped(req, { _id: OID(req.params.id) }), { $set: set }, { new: true }).select("_id").lean();
    if (!st) return res.status(404).json({ error: "Service type inexistent." });
    res.json({ ok: true });
  } catch (err) {
    console.error("[pc] PATCH /service-types/:id:", err.message);
    res.status(500).json({ error: "Eroare la salvarea setărilor." });
  }
});

/* ───────── DELETE /:id — șterge service type + planurile lui (soft-delete) ───────── */
router.delete("/:id", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    const st = await PcServiceType.findOneAndUpdate(scoped(req, { _id: id }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!st) return res.status(404).json({ error: "Service type inexistent." });
    // cascade: planurile lui (soft-delete) + echipele
    await PcPlan.updateMany(scoped(req, { serviceTypeId: id }), { $set: { deletedAt: new Date() } });
    await PcTeam.updateMany(scoped(req, { serviceTypeId: id }), { $set: { deletedAt: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    console.error("[pc] DELETE /service-types/:id:", err.message);
    res.status(500).json({ error: "Eroare la ștergere." });
  }
});

module.exports = router;
