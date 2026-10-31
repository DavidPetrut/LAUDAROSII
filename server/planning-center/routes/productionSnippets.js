/**
 * Șabloane de note ale producătorului (pc_productionSnippets). /api/pc/v1/production-snippets.
 * Per-owner: fiecare producător își vede/gestionează propriile snippet-uri. Aditiv, org-scoped.
 */
const express = require("express");
const mongoose = require("mongoose");
const { PcProductionSnippet, PcPerson } = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { requireCan, requireAny } = require("../core/permissions");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);
const PROD_WRITE = ["services.viewRehearsal", "services.editOrder"];

async function me(req) {
  const p = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
  return p?._id || null;
}

/* GET / — snippet-urile MELE */
router.get("/", requireCan("people.view"), async (req, res) => {
  try {
    const owner = await me(req);
    const list = owner ? await PcProductionSnippet.find(scoped(req, { ownerId: owner })).sort({ sortOrder: 1, createdAt: 1 }).lean() : [];
    res.json({ snippets: list.map((s) => ({ id: s._id, text: s.text })) });
  } catch (err) { console.error("[pc] GET production-snippets:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* POST / — { text } */
router.post("/", requireAny(PROD_WRITE), async (req, res) => {
  try {
    const owner = await me(req);
    if (!owner) return res.status(400).json({ error: "Niciun profil asociat contului." });
    const text = String((req.body || {}).text || "").trim();
    if (!text) return res.status(400).json({ error: "Șablonul e gol." });
    const max = await PcProductionSnippet.find(scoped(req, { ownerId: owner })).sort({ sortOrder: -1 }).limit(1).select("sortOrder").lean();
    const doc = await PcProductionSnippet.create(stamp(req, { ownerId: owner, text, sortOrder: (max[0]?.sortOrder || 0) + 1 }));
    res.status(201).json({ id: doc._id, text: doc.text });
  } catch (err) { console.error("[pc] POST production-snippet:", err.message); res.status(500).json({ error: "Eroare la salvare." }); }
});

/* DELETE /:id (doar al meu) */
router.delete("/:id", requireAny(PROD_WRITE), async (req, res) => {
  try {
    const owner = await me(req);
    const d = await PcProductionSnippet.findOneAndUpdate(scoped(req, { _id: OID(req.params.id), ownerId: owner }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!d) return res.status(404).json({ error: "Șablon inexistent." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE production-snippet:", err.message); res.status(500).json({ error: "Eroare." }); }
});

module.exports = router;
