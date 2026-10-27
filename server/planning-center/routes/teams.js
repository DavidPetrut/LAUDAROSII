/**
 * Rute Teams — listă echipe + „grupuri de slujire" (ministryGroup). /api/pc/v1/teams.
 *
 * Grupurile de slujire = nivel 1 peste echipe (cele 5 mari la Vertical). `ministryGroup`
 * e string LIBER pe PcTeam (aditiv) → compatibil cu importul PCO: echipele fără grup cad
 * în „Fără grup"; un import din alt PCO cu alte grupuri le adaugă fără să strice feng-shui-ul.
 * ZERO email — doar DB. Baza și pentru Teams management (#9).
 */
const express = require("express");
const mongoose = require("mongoose");
const { PcTeam, PcServiceType } = require("../models");
const { scoped } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);

// Cele 5 slujiri mari (default). Rămân disponibile mereu; restul se adaugă din date.
const DEFAULT_MINISTRY_GROUPS = ["Asimilare", "Laudă și Închinare", "Vertical Kids", "Media", "Creative"];

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

/* ───────── GET / — listă echipe (pt. maparea pe grupuri + #9) ───────── */
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

/* ───────── PATCH /:teamId — setează grupul de slujire (admin) ───────── */
router.patch("/:teamId", requireCan("services.manageServiceTypes"), async (req, res) => {
  try {
    const set = {};
    if (req.body?.ministryGroup !== undefined) set.ministryGroup = String(req.body.ministryGroup || "").trim().slice(0, 60);
    if (req.body?.name !== undefined) set.name = String(req.body.name).trim().slice(0, 120);
    if (!Object.keys(set).length) return res.status(400).json({ error: "Nimic de salvat." });
    const t = await PcTeam.findOneAndUpdate(scoped(req, { _id: OID(req.params.teamId) }), { $set: set }, { new: true }).select("_id ministryGroup name").lean();
    if (!t) return res.status(404).json({ error: "Echipă inexistentă." });
    res.json({ ok: true, ministryGroup: t.ministryGroup || "", name: t.name });
  } catch (err) { console.error("[pc] PATCH /teams/:teamId:", err.message); res.status(500).json({ error: "Eroare la salvare." }); }
});

module.exports = router;
