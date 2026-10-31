/**
 * Scene de lumini pentru Order-ul Producției (pc_lightScenes). /api/pc/v1/production-scenes.
 * List / create / update / delete, org-scoped. La prima accesare seed-ează cele 7 scene standard
 * (din meeting-ul cu Paula). Aditiv — nu atinge Order/plan. Gate: read producători, write idem.
 */
const express = require("express");
const mongoose = require("mongoose");
const { PcLightScene, PcPerson } = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { requireCan, requireAny } = require("../core/permissions");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);
const F = PcLightScene.FIXTURES;
const PROD_WRITE = ["services.viewRehearsal", "services.editOrder"];

// Cele 7 scene standard (culori implicite rezonabile — producătorii le ajustează).
const STANDARD = [
  { name: "Intrare sală", note: "Intensitate generală, caldă", c: { par: "#e2a03f", led: "#ffffff", tobe: "#e2a03f", laterale: "#e2a03f" } },
  { name: "Worship", note: "Cele 4 culori", c: { par: "#2f81f7", led: "#ffffff", tobe: "#f0d94d", laterale: "#e5534b" } },
  { name: "Worship cină", note: "Teatrale mai jos", c: { par: "#3a5a9f", led: "#cfd8e3", tobe: "#d6a427", laterale: "#9b3b36" } },
  { name: "Anunțuri", note: "Scenă anunțuri", c: { led: "#ffffff", par: "#8b949e" } },
  { name: "Filmuleț", note: "Intensitate mică", c: { par: "#1b2430", led: "#2a3344", tobe: "#1b2430", laterale: "#1b2430" } },
  { name: "Predică", note: "Scenă predică", c: { led: "#ffffff", par: "#e8e2d0" } },
  { name: "Moment de rugăciune", note: "Intensitate mai jos (buffer după predică)", c: { par: "#7a5a30", led: "#c9a26a" } },
];
function toFixtures(c) { return F.filter((f) => c[f]).map((f) => ({ fixture: f, color: c[f] })); }

async function ensureSeed(req) {
  const n = await PcLightScene.countDocuments(scoped(req));
  if (n > 0) return;
  let i = 0;
  const docs = STANDARD.map((s) => stamp(req, { name: s.name, intensityNote: s.note, isStandard: true, sortOrder: i++, fixtures: toFixtures(s.c) }));
  try { await PcLightScene.insertMany(docs, { ordered: false }); } catch (e) { /* race-safe */ }
}

const dto = (s) => ({ id: s._id, name: s.name, fixtures: s.fixtures || [], intensityNote: s.intensityNote || "", isStandard: !!s.isStandard, sortOrder: s.sortOrder || 0 });

/* GET / — scenele org-ului (seed la prima accesare) */
router.get("/", requireCan("people.view"), async (req, res) => {
  try {
    await ensureSeed(req);
    const list = await PcLightScene.find(scoped(req)).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ fixtures: F, scenes: list.map(dto) });
  } catch (err) { console.error("[pc] GET production-scenes:", err.message); res.status(500).json({ error: "Eroare la scene." }); }
});

/* POST / — { name, fixtures:[{fixture,color}], intensityNote } */
router.post("/", requireAny(PROD_WRITE), async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || "").trim();
    if (!name) return res.status(400).json({ error: "Dă un nume scenei." });
    const fixtures = (Array.isArray(b.fixtures) ? b.fixtures : []).filter((x) => F.includes(x.fixture) && x.color).map((x) => ({ fixture: x.fixture, color: String(x.color) }));
    const me = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
    const max = await PcLightScene.find(scoped(req)).sort({ sortOrder: -1 }).limit(1).select("sortOrder").lean();
    const doc = await PcLightScene.create(stamp(req, { name, fixtures, intensityNote: String(b.intensityNote || ""), sortOrder: (max[0]?.sortOrder || 0) + 1, createdByPersonId: me?._id || null }));
    res.status(201).json(dto(doc));
  } catch (err) { console.error("[pc] POST production-scene:", err.message); res.status(500).json({ error: "Eroare la salvare." }); }
});

/* PATCH /:id — { name?, fixtures?, intensityNote? } */
router.patch("/:id", requireAny(PROD_WRITE), async (req, res) => {
  try {
    const b = req.body || {}; const set = {};
    if (typeof b.name === "string" && b.name.trim()) set.name = b.name.trim();
    if (Array.isArray(b.fixtures)) set.fixtures = b.fixtures.filter((x) => F.includes(x.fixture) && x.color).map((x) => ({ fixture: x.fixture, color: String(x.color) }));
    if (typeof b.intensityNote === "string") set.intensityNote = b.intensityNote;
    const doc = await PcLightScene.findOneAndUpdate(scoped(req, { _id: OID(req.params.id) }), { $set: set }, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: "Scenă inexistentă." });
    res.json(dto(doc));
  } catch (err) { console.error("[pc] PATCH production-scene:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* DELETE /:id (soft) */
router.delete("/:id", requireAny(PROD_WRITE), async (req, res) => {
  try {
    const d = await PcLightScene.findOneAndUpdate(scoped(req, { _id: OID(req.params.id) }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!d) return res.status(404).json({ error: "Scenă inexistentă." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE production-scene:", err.message); res.status(500).json({ error: "Eroare." }); }
});

module.exports = router;
