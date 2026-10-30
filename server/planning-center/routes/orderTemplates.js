/**
 * Șabloane de ORDER (pc_orderTemplates). /api/pc/v1/order-templates.
 * Save as Template (snapshot din plan), listă per service type (+ globale), rename/default, delete.
 * Aplicarea unui șablon la crearea planului se face în routes/plans.js (POST /plans, `orderTemplateId`).
 */
const express = require("express");
const mongoose = require("mongoose");
const { PcOrderTemplate, PcPlanItem, PcPlan, PcPerson } = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);

const SNAP_FIELDS = ["type", "title", "description", "lengthSec", "keyName", "placement", "duringAll", "rowColor", "isTransition", "voices", "ministries", "leaders", "songId", "arrangementId", "keyId", "sequence", "medley"];
const snapItem = (it, i) => { const o = { sortOrder: i }; for (const f of SNAP_FIELDS) if (it[f] !== undefined) o[f] = it[f]; return o; };

/* GET / — șabloane pt. un service type (+ globale) */
router.get("/", requireCan("people.view"), async (req, res) => {
  try {
    const stId = OID(req.query.serviceTypeId);
    const filter = stId ? { $or: [{ serviceTypeId: stId }, { serviceTypeId: null }] } : {};
    const tpls = await PcOrderTemplate.find(scoped(req, filter)).sort({ isDefault: -1, name: 1 }).lean();
    res.json({ templates: tpls.map((t) => ({ id: t._id, name: t.name, isDefault: !!t.isDefault, serviceTypeId: t.serviceTypeId ? String(t.serviceTypeId) : null, itemCount: (t.items || []).length })) });
  } catch (err) { console.error("[pc] GET order-templates:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* GET /:tid — detaliu (items pt. preview) */
router.get("/:tid", requireCan("people.view"), async (req, res) => {
  try {
    const t = await PcOrderTemplate.findOne(scoped(req, { _id: OID(req.params.tid) })).lean();
    if (!t) return res.status(404).json({ error: "Șablon inexistent." });
    res.json({
      id: t._id, name: t.name, isDefault: !!t.isDefault, serviceTypeId: t.serviceTypeId ? String(t.serviceTypeId) : null,
      items: (t.items || []).map((it) => ({ type: it.type, title: it.title || "", keyName: it.keyName || "", lengthSec: it.lengthSec || 0, isTransition: !!it.isTransition })),
    });
  } catch (err) { console.error("[pc] GET order-template:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* POST / — Save as Template din planul curent: { planId, name, serviceTypeId?, isDefault?, itemIds? } */
router.post("/", requireCan("services.editOrder"), async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || "").trim();
    if (!name) return res.status(400).json({ error: "Dă un nume șablonului." });
    const planId = OID(b.planId);
    if (!planId) return res.status(400).json({ error: "planId invalid." });
    const plan = await PcPlan.findOne(scoped(req, { _id: planId })).select("serviceTypeId").lean();
    if (!plan) return res.status(404).json({ error: "Plan inexistent." });
    const items = await PcPlanItem.find(scoped(req, { planId })).sort({ sortOrder: 1 }).lean();
    let ordered = items;
    if (Array.isArray(b.itemIds) && b.itemIds.length) {
      const byId = Object.fromEntries(items.map((it) => [String(it._id), it]));
      ordered = b.itemIds.map((id) => byId[String(id)]).filter(Boolean);
    }
    const snap = ordered.map(snapItem);
    const serviceTypeId = b.serviceTypeId === null ? null : (OID(b.serviceTypeId) || plan.serviceTypeId || null);
    const me = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
    if (b.isDefault && serviceTypeId) await PcOrderTemplate.updateMany(scoped(req, { serviceTypeId }), { $set: { isDefault: false } });
    const doc = await PcOrderTemplate.create(stamp(req, { name, serviceTypeId, isDefault: !!b.isDefault, createdByPersonId: me?._id || null, items: snap }));
    res.status(201).json({ id: doc._id });
  } catch (err) { console.error("[pc] POST order-template:", err.message); res.status(500).json({ error: "Eroare la salvarea șablonului." }); }
});

/* PATCH /:tid — rename / default */
router.patch("/:tid", requireCan("services.editOrder"), async (req, res) => {
  try {
    const tid = OID(req.params.tid); const b = req.body || {}; const set = {};
    if (b.name !== undefined) set.name = String(b.name).trim();
    if (b.isDefault !== undefined) set.isDefault = !!b.isDefault;
    const cur = await PcOrderTemplate.findOne(scoped(req, { _id: tid })).select("serviceTypeId").lean();
    if (!cur) return res.status(404).json({ error: "Șablon inexistent." });
    if (set.isDefault && cur.serviceTypeId) await PcOrderTemplate.updateMany(scoped(req, { serviceTypeId: cur.serviceTypeId, _id: { $ne: tid } }), { $set: { isDefault: false } });
    await PcOrderTemplate.updateOne(scoped(req, { _id: tid }), { $set: set });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] PATCH order-template:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* DELETE /:tid */
router.delete("/:tid", requireCan("services.editOrder"), async (req, res) => {
  try {
    const t = await PcOrderTemplate.findOneAndUpdate(scoped(req, { _id: OID(req.params.tid) }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!t) return res.status(404).json({ error: "Șablon inexistent." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE order-template:", err.message); res.status(500).json({ error: "Eroare." }); }
});

module.exports = router;
