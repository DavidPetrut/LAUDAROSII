/**
 * Rute AI Gateway. /api/pc/v1/ai/run — clientul trimite {feature, action, prompt, context}.
 * Authz: cere o capabilitate (editare) — AI acționează în contextul permisiunilor userului (§10).
 * Răspuns: { ok, text, message }. Pentru editor „transform-lyrics", `text` = textul modificat.
 */
const express = require("express");
const { requireCan } = require("../core/permissions");
const aiService = require("../services/aiService");

const router = express.Router();

router.post("/run", requireCan("songs.edit"), async (req, res) => {
  try {
    const { feature, action, prompt, context } = req.body || {};
    const out = await aiService.run({ feature, action, prompt, context });
    res.status(out.ok ? 200 : (out.notConfigured ? 503 : 400)).json(out);
  } catch (err) {
    console.error("[pc] POST /ai/run:", err.message);
    res.status(500).json({ ok: false, message: "Eroare la AI." });
  }
});

router.get("/status", requireCan("people.view"), (req, res) => res.json({ available: aiService.isConfigured() }));

module.exports = router;
