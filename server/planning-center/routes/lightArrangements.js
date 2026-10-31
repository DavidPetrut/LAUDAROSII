/**
 * Aranjamente de lumini (pc_lightArrangements). /api/pc/v1/light-arrangements.
 * Reutilizabile pe tranziții: nume + culori. List / create / delete. Aditiv — nu atinge order/plan.
 */
const express = require("express");
const mongoose = require("mongoose");
const { PcLightArrangement, PcPerson } = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);

/* GET / — toate aranjamentele org-ului */
router.get("/", requireCan("people.view"), async (req, res) => {
  try {
    const list = await PcLightArrangement.find(scoped(req)).sort({ name: 1 }).lean();
    res.json({ arrangements: list.map((a) => ({ id: a._id, name: a.name, colors: a.colors || [] })) });
  } catch (err) { console.error("[pc] GET light-arrangements:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* POST / — salvează un aranjament nou: { name, colors[] } */
router.post("/", requireCan("services.editOrder"), async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || "").trim();
    if (!name) return res.status(400).json({ error: "Dă un nume aranjamentului." });
    const colors = (Array.isArray(b.colors) ? b.colors : []).map((c) => String(c || "").trim()).filter(Boolean);
    if (!colors.length) return res.status(400).json({ error: "Aranjamentul n-are nicio culoare." });
    const me = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
    const doc = await PcLightArrangement.create(stamp(req, { name, colors, createdByPersonId: me?._id || null }));
    res.status(201).json({ id: doc._id, name: doc.name, colors: doc.colors });
  } catch (err) { console.error("[pc] POST light-arrangement:", err.message); res.status(500).json({ error: "Eroare la salvare." }); }
});

/* DELETE /:id */
router.delete("/:id", requireCan("services.editOrder"), async (req, res) => {
  try {
    const a = await PcLightArrangement.findOneAndUpdate(scoped(req, { _id: OID(req.params.id) }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!a) return res.status(404).json({ error: "Aranjament inexistent." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE light-arrangement:", err.message); res.status(500).json({ error: "Eroare." }); }
});

module.exports = router;
