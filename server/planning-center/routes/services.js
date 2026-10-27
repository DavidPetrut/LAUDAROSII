/**
 * Rute Service Types — „Create a service" (wizard Name→Times→Teams). /api/pc/v1/service-types.
 * Creează service type + PRIMUL plan + service times + echipele conduse (viewer = lider).
 * Logica din transcriptul PCO: service type recurent; poate avea mai multe ore; teams în service type.
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcServiceType, PcPlan, PcPlanTime, PcTeam, PcTeamMember, PcPerson, PcOrg, PcCampus, PcNoteCategory,
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

/* Public View — cheile PCO (ce apare pe planul public). Default: tot pornit. */
const PUBLIC_VIEW_KEYS = [
  "dates", "serviceTimes", "planTitles", "series", "items", "itemLengths",
  "itemDescriptions", "songs", "songDetails", "media", "files", "teams",
  "scheduledPeople", "planNotes",
];
const defaultPublicView = () => Object.fromEntries(PUBLIC_VIEW_KEYS.map((k) => [k, true]));

/* ───────── GET /:id — setări service type (pt. ecranul Settings) ───────── */
router.get("/:id", requireCan("people.view"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    const st = await PcServiceType.findOne(scoped(req, { _id: id })).lean();
    if (!st) return res.status(404).json({ error: "Service type inexistent." });
    const noteCategories = await PcNoteCategory.find(scoped(req, { serviceTypeId: id }))
      .sort({ kind: 1, sortOrder: 1 }).lean();
    // publicView: pornim de la default (tot pornit) și suprascriem cu ce e salvat
    const pv = { ...defaultPublicView(), ...(st.publicView || {}) };
    res.json({
      id: st._id,
      name: st.name,
      frequency: st.frequency || "weekly",
      itemRowColors: (st.itemRowColors && st.itemRowColors.length) ? st.itemRowColors : DEFAULT_ITEM_ROW_COLORS,
      useCustomRowColors: st.useCustomRowColors !== false,
      scheduledPublish: !!st.scheduledPublish,
      limitedFileVisibility: !!st.limitedFileVisibility,
      publicView: pv,
      publicViewKeys: PUBLIC_VIEW_KEYS,
      itemTypes: Array.isArray(st.itemTypes) ? st.itemTypes.map((t) => ({ name: t.name, color: t.color || "" })) : [],
      noteCategories: noteCategories.map((c) => ({ id: c._id, kind: c.kind, name: c.name, frequentlyUsed: c.frequentlyUsed !== false })),
    });
  } catch (err) {
    console.error("[pc] GET /service-types/:id:", err.message);
    res.status(500).json({ error: "Eroare la citirea setărilor." });
  }
});

/* ───────── PATCH /:id — actualizează setări (general + „restul") ───────── */
router.patch("/:id", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const set = {};
    const b = req.body || {};
    if (b.name !== undefined) set.name = String(b.name).trim();
    if (b.frequency !== undefined) set.frequency = String(b.frequency);
    if (b.useCustomRowColors !== undefined) set.useCustomRowColors = !!b.useCustomRowColors;
    if (b.scheduledPublish !== undefined) set.scheduledPublish = !!b.scheduledPublish;
    if (b.limitedFileVisibility !== undefined) set.limitedFileVisibility = !!b.limitedFileVisibility;
    if (b.publicView && typeof b.publicView === "object") {
      // acceptăm DOAR cheile cunoscute, ca booleans (anti-pollution)
      set.publicView = Object.fromEntries(PUBLIC_VIEW_KEYS.map((k) => [k, !!b.publicView[k]]));
    }
    if (Array.isArray(b.itemTypes)) {
      set.itemTypes = b.itemTypes
        .filter((t) => t && String(t.name || "").trim())
        .map((t) => ({ name: String(t.name).trim().slice(0, 60), color: String(t.color || "").slice(0, 20) }));
    }
    if (Array.isArray(b.itemRowColors)) {
      set.itemRowColors = b.itemRowColors
        .filter((r) => r && r.match)
        .map((r) => ({ match: String(r.match), label: String(r.label || r.match), color: String(r.color || "") }));
    }
    if (!Object.keys(set).length) return res.status(400).json({ error: "Nimic de salvat." });
    const st = await PcServiceType.findOneAndUpdate(scoped(req, { _id: OID(req.params.id) }), { $set: set }, { new: true }).select("_id").lean();
    if (!st) return res.status(404).json({ error: "Service type inexistent." });
    res.json({ ok: true });
  } catch (err) {
    console.error("[pc] PATCH /service-types/:id:", err.message);
    res.status(500).json({ error: "Eroare la salvarea setărilor." });
  }
});

/* ───────── Categorii de note (item/plan) per service type ───────── */
router.post("/:id/note-categories", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const serviceTypeId = OID(req.params.id);
    const st = await PcServiceType.findOne(scoped(req, { _id: serviceTypeId })).select("_id").lean();
    if (!st) return res.status(404).json({ error: "Service type inexistent." });
    const kind = ["item", "plan"].includes(req.body?.kind) ? req.body.kind : "item";
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Numele categoriei lipsește." });
    const sortOrder = await PcNoteCategory.countDocuments(scoped(req, { serviceTypeId, kind }));
    const doc = await PcNoteCategory.create(stamp(req, { serviceTypeId, kind, name, sortOrder }));
    res.status(201).json({ id: doc._id, kind: doc.kind, name: doc.name, frequentlyUsed: true });
  } catch (err) {
    console.error("[pc] POST note-category:", err.message);
    res.status(500).json({ error: "Eroare la categoria de note." });
  }
});
router.delete("/:id/note-categories/:catId", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const cat = await PcNoteCategory.findOneAndUpdate(
      scoped(req, { _id: OID(req.params.catId), serviceTypeId: OID(req.params.id) }),
      { $set: { deletedAt: new Date() } }
    ).select("_id").lean();
    if (!cat) return res.status(404).json({ error: "Categorie inexistentă." });
    res.json({ ok: true });
  } catch (err) {
    console.error("[pc] DELETE note-category:", err.message);
    res.status(500).json({ error: "Eroare la ștergere." });
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
