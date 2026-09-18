const express = require("express");
const { DevotionalPlan } = require("../models");
const { authMiddleware } = require("../middleware");

const router = express.Router();

const dayMs = 24 * 60 * 60 * 1000;

/**
 * Calculeaza scorul (%) al unei saptamani din completed/target, plafonat la 100.
 */
const weekScore = (week) => {
  if (!week || !week.target) return 0;
  return Math.min(100, Math.round((week.completed / week.target) * 100));
};

/**
 * Serializeaza planul pentru client: adauga scoruri pe saptamana, saptamana curenta
 * si scorul general (media saptamanilor incepute).
 */
const serializePlan = (plan) => {
  if (!plan) return null;
  const now = Date.now();
  const weeks = plan.weeks.map((w) => ({
    index: w.index,
    startDate: w.startDate,
    endDate: w.endDate,
    target: w.target,
    completed: w.completed,
    score: weekScore(w),
    isCurrent: now >= w.startDate.getTime() && now < w.endDate.getTime(),
  }));
  const started = weeks.filter((w) => now >= new Date(w.startDate).getTime());
  const overallScore = started.length
    ? Math.round(started.reduce((s, w) => s + w.score, 0) / started.length)
    : 0;
  return {
    _id: plan._id,
    period: plan.period,
    weeklyGoal: plan.weeklyGoal,
    focusAreas: plan.focusAreas,
    startDate: plan.startDate,
    endDate: plan.endDate,
    active: plan.active,
    weeks,
    overallScore,
    createdAt: plan.createdAt,
  };
};

const findCurrentWeek = (plan) => {
  const now = Date.now();
  return plan.weeks.find(
    (w) => now >= w.startDate.getTime() && now < w.endDate.getTime()
  );
};

/**
 * GET /devotional-plans/active - planul activ al userului (sau null).
 */
router.get("/active", authMiddleware, async (req, res) => {
  try {
    const plan = await DevotionalPlan.findOne({
      ownerId: req.user.id,
      active: true,
    });
    res.json({ plan: serializePlan(plan) });
  } catch (error) {
    res.status(500).json({ error: "Eroare la incarcarea planului" });
  }
});

/**
 * POST /devotional-plans - creeaza un plan lunar nou (dezactiveaza planul anterior).
 * Body: { weeklyGoal, focusAreas? }.
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const weeklyGoal = parseInt(req.body.weeklyGoal, 10);
    if (!Number.isInteger(weeklyGoal) || weeklyGoal < 1 || weeklyGoal > 50) {
      return res.status(400).json({ error: "Obiectiv saptamanal invalid (1-50)" });
    }
    const focusAreas = Array.isArray(req.body.focusAreas)
      ? req.body.focusAreas
          .filter((s) => typeof s === "string")
          .map((s) => s.trim().slice(0, 40))
          .filter(Boolean)
          .slice(0, 10)
      : [];

    await DevotionalPlan.updateMany(
      { ownerId: req.user.id, active: true },
      { $set: { active: false } }
    );

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate.getTime() + 28 * dayMs);
    const weeks = DevotionalPlan.buildWeeks(startDate, endDate, weeklyGoal);

    const plan = await DevotionalPlan.create({
      ownerId: req.user.id,
      period: "monthly",
      weeklyGoal,
      focusAreas,
      startDate,
      endDate,
      weeks,
    });

    res.status(201).json({ plan: serializePlan(plan) });
  } catch (error) {
    res.status(500).json({ error: "Eroare la crearea planului" });
  }
});

/**
 * DELETE /devotional-plans/:id - sterge (dezactiveaza) planul propriu.
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const plan = await DevotionalPlan.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
    });
    if (!plan) return res.status(404).json({ error: "Plan negasit" });
    plan.active = false;
    await plan.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Eroare la stergere" });
  }
});

/**
 * POST /devotional-plans/log-session - inregistreaza o sesiune terminata in saptamana curenta.
 */
router.post("/log-session", authMiddleware, async (req, res) => {
  try {
    const plan = await DevotionalPlan.findOne({
      ownerId: req.user.id,
      active: true,
    });
    if (!plan) return res.json({ plan: null, logged: false });

    const week = findCurrentWeek(plan);
    if (!week) return res.json({ plan: serializePlan(plan), logged: false });

    week.completed += 1;
    await plan.save();
    res.json({ plan: serializePlan(plan), logged: true });
  } catch (error) {
    res.status(500).json({ error: "Eroare la inregistrarea sesiunii" });
  }
});

/**
 * GET /devotional-plans/history - saptamanile incepute cu scorurile lor (pt chart/istoric).
 */
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const plan = await DevotionalPlan.findOne({
      ownerId: req.user.id,
      active: true,
    });
    const serialized = serializePlan(plan);
    if (!serialized) return res.json({ weeks: [], overallScore: 0 });
    const now = Date.now();
    const weeks = serialized.weeks.filter(
      (w) => now >= new Date(w.startDate).getTime()
    );
    res.json({ weeks, overallScore: serialized.overallScore });
  } catch (error) {
    res.status(500).json({ error: "Eroare la incarcarea istoricului" });
  }
});

module.exports = router;
