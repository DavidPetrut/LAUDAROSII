/**
 * Rute AI Gateway. /api/pc/v1/ai/run — clientul trimite {feature, action, prompt, context, actions, rules}.
 * Authz: cere o capabilitate (editare) — AI acționează în contextul permisiunilor userului (§10).
 * Răspuns: { ok, text|message, proposedActions? }. Pentru editor „transform-lyrics", `text` = textul modificat.
 *
 * §5.4 — ANTRENARE: 👍/👎 pe propuneri → pc_aiLessons (global pe org). La promptul următor,
 * gateway-ul încarcă top-K lecții pentru suprafețele active și le injectează în system prompt.
 */
const express = require("express");
const mongoose = require("mongoose");
const { requireCan } = require("../core/permissions");
const { scoped, stamp } = require("../core/orgScope");
const { PcAiLesson, PcPerson } = require("../models");
const aiService = require("../services/aiService");

const router = express.Router();
const OID = (v) => { try { return new mongoose.Types.ObjectId(String(v)); } catch { return null; } };
const LESSONS_LIMIT = 40;

async function viewerPersonId(req) {
  const p = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
  return p?._id || null;
}

// Lecțiile relevante pentru suprafețele din catalog (cele mai recente; 👎 sunt cele mai valoroase pt. corecție).
async function lessonsForActions(req, actions) {
  const surfaces = [...new Set((actions || []).map((a) => a && a.surfaceId).filter(Boolean))];
  if (!surfaces.length) return [];
  const rows = await PcAiLesson.find(scoped(req, { surface: { $in: surfaces } }))
    .sort({ createdAt: -1 }).limit(LESSONS_LIMIT).lean();
  return rows.map((r) => ({ verdict: r.verdict, command: r.command || "", actionLabel: r.actionLabel || r.actionId || "", note: r.note || "" }));
}

router.post("/run", requireCan("songs.edit"), async (req, res) => {
  try {
    const { feature, action, prompt, context, actions, rules } = req.body || {};
    const useTools = Array.isArray(actions) && actions.length > 0 && action !== "transform-lyrics";
    let out;
    if (useTools) {
      const lessons = await lessonsForActions(req, actions);
      out = await aiService.propose({ prompt, context, actions, rules, lessons });
    } else {
      out = await aiService.run({ feature, action, prompt, context });
    }
    res.status(out.ok ? 200 : (out.notConfigured ? 503 : 400)).json(out);
  } catch (err) {
    console.error("[pc] POST /ai/run:", err.message);
    res.status(500).json({ ok: false, message: "Eroare la AI." });
  }
});

router.get("/status", requireCan("people.view"), (req, res) => res.json({ available: aiService.isConfigured() }));

/* ───────── Lecții AI (§5.4) ───────── */

// GET /ai/lessons?surface=order.studio — lecțiile org-ului pt. o suprafață (sau toate).
router.get("/lessons", requireCan("songs.edit"), async (req, res) => {
  try {
    const q = {};
    if (req.query.surface) q.surface = String(req.query.surface);
    const rows = await PcAiLesson.find(scoped(req, q)).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ lessons: rows.map((r) => ({ id: r._id, surface: r.surface, command: r.command, actionId: r.actionId, actionLabel: r.actionLabel, verdict: r.verdict, note: r.note, createdAt: r.createdAt })) });
  } catch (err) { console.error("[pc] GET /ai/lessons:", err.message); res.status(500).json({ error: "Eroare la lecții." }); }
});

// POST /ai/lesson — salvează un verdict 👍/👎 (+ notă). Global pe org.
router.post("/lesson", requireCan("songs.edit"), async (req, res) => {
  try {
    const b = req.body || {};
    const surface = String(b.surface || "").trim();
    const verdict = b.verdict === "down" ? "down" : (b.verdict === "up" ? "up" : "");
    if (!surface || !verdict) return res.status(400).json({ error: "surface și verdict (up|down) sunt obligatorii." });
    const createdByPersonId = await viewerPersonId(req);
    const row = await PcAiLesson.create(stamp(req, {
      surface, verdict,
      command: String(b.command || "").slice(0, 2000),
      actionId: String(b.actionId || ""), actionLabel: String(b.actionLabel || ""),
      note: String(b.note || "").slice(0, 2000),
      exampleContext: String(b.exampleContext || "").slice(0, 4000),
      createdByPersonId,
    }));
    res.status(201).json({ ok: true, id: row._id });
  } catch (err) { console.error("[pc] POST /ai/lesson:", err.message); res.status(500).json({ error: "Eroare la salvarea lecției." }); }
});

// DELETE /ai/lessons/:id — soft-delete o lecție.
router.delete("/lessons/:id", requireCan("songs.edit"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid" });
    await PcAiLesson.updateOne(scoped(req, { _id: id }), { $set: { deletedAt: new Date() } });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE /ai/lessons/:id:", err.message); res.status(500).json({ error: "Eroare la ștergerea lecției." }); }
});

module.exports = router;
