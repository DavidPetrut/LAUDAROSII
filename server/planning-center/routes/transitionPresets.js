/**
 * Preseturi de tranziție pentru mashup (pc_transitionPresets). /api/pc/v1/transition-presets.
 * GLOBALE pe organizație (D8) — toți le văd. La prima citire, dacă org-ul nu are niciunul, se seed-ează default-urile.
 */
const express = require("express");
const mongoose = require("mongoose");
const { PcTransitionPreset, PcPerson } = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);
const slugify = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

async function me(req) {
  const p = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
  return p?._id || null;
}
const out = (p) => ({ id: p._id, label: p.label, slug: p.slug || "", note: p.note || "", isStandard: !!p.isStandard, sortOrder: p.sortOrder || 0 });

/* GET / — preseturile org-ului (seed default la prima rulare) */
router.get("/", requireCan("people.view"), async (req, res) => {
  try {
    let list = await PcTransitionPreset.find(scoped(req)).sort({ sortOrder: 1, createdAt: 1 }).lean();
    if (!list.length) {
      await PcTransitionPreset.insertMany((PcTransitionPreset.DEFAULTS || []).map((d) => stamp(req, { ...d, isStandard: true })));
      list = await PcTransitionPreset.find(scoped(req)).sort({ sortOrder: 1, createdAt: 1 }).lean();
    }
    res.json({ presets: list.map(out) });
  } catch (err) { console.error("[pc] GET transition-presets:", err.message); res.status(500).json({ error: "Eroare la preseturi." }); }
});

/* POST / — { label, note? } (custom, salvabil) */
router.post("/", requireCan("services.editOrder"), async (req, res) => {
  try {
    const b = req.body || {};
    const label = String(b.label || "").trim();
    if (!label) return res.status(400).json({ error: "Numele presetului e gol." });
    const owner = await me(req);
    const max = await PcTransitionPreset.find(scoped(req)).sort({ sortOrder: -1 }).limit(1).select("sortOrder").lean();
    const doc = await PcTransitionPreset.create(stamp(req, {
      label, slug: slugify(b.slug || label), note: String(b.note || "").trim(),
      isStandard: false, sortOrder: (max[0]?.sortOrder || 0) + 1, createdByPersonId: owner || null,
    }));
    res.status(201).json(out(doc));
  } catch (err) { console.error("[pc] POST transition-preset:", err.message); res.status(500).json({ error: "Eroare la salvare." }); }
});

/* DELETE /:id — doar preseturile custom (nu cele standard) */
router.delete("/:id", requireCan("services.editOrder"), async (req, res) => {
  try {
    const d = await PcTransitionPreset.findOneAndUpdate(
      scoped(req, { _id: OID(req.params.id), isStandard: { $ne: true } }), { $set: { deletedAt: new Date() } }
    ).select("_id").lean();
    if (!d) return res.status(404).json({ error: "Preset inexistent sau standard (nu se poate șterge)." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE transition-preset:", err.message); res.status(500).json({ error: "Eroare." }); }
});

module.exports = router;
