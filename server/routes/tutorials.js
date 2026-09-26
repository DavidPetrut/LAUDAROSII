const express = require("express");
const { Tutorial, TutorialConfig, User } = require("../models");
const { authMiddleware, requireRole } = require("../middleware");

const router = express.Router();

// Autorul tutorialelor: doar super-admin si developer.
const isAuthor = requireRole("superadmin", "developer");

const safeStr = (s, max) => String(s || "").trim().slice(0, max);

const sanitizeSteps = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .slice(0, 40)
    .map((s) => ({
      targetId: safeStr(s.targetId, 80),
      label: safeStr(s.label, 80),
      instruction: safeStr(s.instruction, 240),
      screen: safeStr(s.screen, 80),
    }))
    .filter((s) => s.targetId);

const serialize = (t) => ({
  _id: t._id,
  name: t.name,
  description: t.description,
  steps: t.steps,
  active: t.active,
  order: t.order,
  createdByName: t.createdByName,
  createdAt: t.createdAt,
});

/**
 * GET /tutorials/config - flag-ul de autor (oricine logat; clientul verifica si rolul).
 */
router.get("/config", authMiddleware, async (req, res) => {
  try {
    let cfg = await TutorialConfig.findOne({ key: "singleton" });
    if (!cfg) cfg = await TutorialConfig.create({ key: "singleton" });
    res.json({ authoringEnabled: cfg.authoringEnabled });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * PUT /tutorials/config - comuta modul de autor (din dashboard). Doar autor.
 */
router.put("/config", authMiddleware, isAuthor, async (req, res) => {
  try {
    const cfg = await TutorialConfig.findOneAndUpdate(
      { key: "singleton" },
      { authoringEnabled: !!req.body.authoringEnabled },
      { new: true, upsert: true }
    );
    res.json({ authoringEnabled: cfg.authoringEnabled });
  } catch (e) {
    res.status(500).json({ error: "Eroare la salvare" });
  }
});

/**
 * GET /tutorials - tutorialele active (oricine logat). ?all=1 pentru autor (si inactive).
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const isPriv = req.user.role === "superadmin" || req.user.role === "developer";
    const q = req.query.all === "1" && isPriv ? {} : { active: true };
    const items = await Tutorial.find(q).sort({ order: 1, createdAt: -1 });
    res.json({ tutorials: items.map(serialize) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la incarcare" });
  }
});

/**
 * GET /tutorials/:id - un tutorial complet.
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const t = await Tutorial.findById(req.params.id);
    if (!t) return res.status(404).json({ error: "Tutorial negasit" });
    res.json({ tutorial: serialize(t) });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * POST /tutorials - creeaza un tutorial. Doar autor.
 */
router.post("/", authMiddleware, isAuthor, async (req, res) => {
  try {
    const name = safeStr(req.body.name, 80);
    if (!name) return res.status(400).json({ error: "Numele e obligatoriu" });
    const steps = sanitizeSteps(req.body.steps);
    if (!steps.length) return res.status(400).json({ error: "Tutorialul are nevoie de minim un pas" });

    const me = await User.findById(req.user.id).select("personalData.fullName");
    const t = await Tutorial.create({
      name,
      description: safeStr(req.body.description, 240),
      steps,
      active: req.body.active !== false,
      order: parseInt(req.body.order, 10) || 0,
      createdBy: req.user.id,
      createdByName: me?.personalData?.fullName || "",
    });
    res.status(201).json({ tutorial: serialize(t) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la creare" });
  }
});

/**
 * PATCH /tutorials/:id - editeaza un tutorial. Doar autor.
 */
router.patch("/:id", authMiddleware, isAuthor, async (req, res) => {
  try {
    const t = await Tutorial.findById(req.params.id);
    if (!t) return res.status(404).json({ error: "Tutorial negasit" });
    if (req.body.name !== undefined) {
      const name = safeStr(req.body.name, 80);
      if (!name) return res.status(400).json({ error: "Numele e obligatoriu" });
      t.name = name;
    }
    if (req.body.description !== undefined) t.description = safeStr(req.body.description, 240);
    if (req.body.steps !== undefined) t.steps = sanitizeSteps(req.body.steps);
    if (req.body.active !== undefined) t.active = !!req.body.active;
    if (req.body.order !== undefined) t.order = parseInt(req.body.order, 10) || 0;
    await t.save();
    res.json({ tutorial: serialize(t) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la editare" });
  }
});

/**
 * DELETE /tutorials/:id - sterge un tutorial. Doar autor.
 */
router.delete("/:id", authMiddleware, isAuthor, async (req, res) => {
  try {
    const deleted = await Tutorial.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Tutorial negasit" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Eroare la stergere" });
  }
});

module.exports = router;
