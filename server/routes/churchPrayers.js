const express = require("express");
const { ChurchPrayer } = require("../models");
const { MOODS } = require("../models/ChurchPrayer");
const { authMiddleware, requireAccess } = require("../middleware");

const router = express.Router();

const safeStr = (s, max) => String(s || "").trim().slice(0, max);
const safeMood = (m) => (MOODS.includes(m) ? m : null);

const serialize = (p) => ({
  _id: p._id,
  text: p.text,
  isUrgent: p.isUrgent,
  mood: p.mood,
  answered: p.answered,
  createdAt: p.createdAt,
});

/**
 * GET /church-prayers - lista de motive a bisericii (vizibila oricui logat).
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const prayers = await ChurchPrayer.find({ answered: false }).sort({ createdAt: -1 });
    res.json(prayers.map(serialize));
  } catch (e) {
    res.status(500).json({ error: "Eroare la incarcare" });
  }
});

/**
 * POST /church-prayers - adauga un motiv (necesita church_prayers.manage).
 */
router.post("/", authMiddleware, requireAccess("church_prayers.manage"), async (req, res) => {
  try {
    const text = safeStr(req.body.text, 1000);
    if (!text) return res.status(400).json({ error: "Motivul este obligatoriu" });
    const prayer = await ChurchPrayer.create({
      text,
      isUrgent: !!req.body.isUrgent,
      mood: safeMood(req.body.mood),
      createdBy: req.user.id,
    });
    res.status(201).json(serialize(prayer));
  } catch (e) {
    res.status(500).json({ error: "Eroare la adaugare" });
  }
});

/**
 * PATCH /church-prayers/:id - editeaza un motiv (raspuns/urgent/stare).
 */
router.patch("/:id", authMiddleware, requireAccess("church_prayers.manage"), async (req, res) => {
  try {
    const prayer = await ChurchPrayer.findById(req.params.id);
    if (!prayer) return res.status(404).json({ error: "Motiv negasit" });
    if (req.body.answered !== undefined) prayer.answered = !!req.body.answered;
    if (req.body.isUrgent !== undefined) prayer.isUrgent = !!req.body.isUrgent;
    if (req.body.mood !== undefined) prayer.mood = safeMood(req.body.mood);
    await prayer.save();
    res.json(serialize(prayer));
  } catch (e) {
    res.status(500).json({ error: "Eroare la editare" });
  }
});

/**
 * DELETE /church-prayers/:id - sterge un motiv (necesita church_prayers.manage).
 */
router.delete("/:id", authMiddleware, requireAccess("church_prayers.manage"), async (req, res) => {
  try {
    const deleted = await ChurchPrayer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Motiv negasit" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Eroare la stergere" });
  }
});

module.exports = router;
