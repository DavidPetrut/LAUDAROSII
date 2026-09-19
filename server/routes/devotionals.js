const express = require("express");
const { Devotional, DevotionalShare, User } = require("../models");
const { authMiddleware } = require("../middleware");

const router = express.Router();

const ICON_SETS = ["ionicons", "material", "feather", "fontawesome5"];
const HEX = /^#[0-9a-fA-F]{6}$/;

const safeColor = (c) => (HEX.test(String(c || "")) ? c : "#10b981");
const safeIconSet = (s) => (ICON_SETS.includes(s) ? s : "ionicons");
const safeStr = (s, max) => String(s || "").trim().slice(0, max);

/**
 * Curata si valideaza un devotional venit de la client (nume, iconita, culoare,
 * task-uri, zile). Nu are incredere in input: string-uri taiate, culori hex,
 * set de iconite din whitelist, durate/zile in limite.
 */
const sanitizeDevotional = (body) => {
  const tasks = Array.isArray(body.tasks) ? body.tasks : [];
  return {
    name: safeStr(body.name, 60) || "Devotional",
    icon: safeStr(body.icon, 40) || "book-outline",
    iconSet: safeIconSet(body.iconSet),
    color: safeColor(body.color),
    tasks: tasks.slice(0, 20).map((t) => ({
      title: safeStr(t.title, 60) || "Moment",
      icon: safeStr(t.icon, 40) || "flower-outline",
      iconSet: safeIconSet(t.iconSet),
      color: safeColor(t.color),
      durationMin: Math.min(180, Math.max(1, parseInt(t.durationMin, 10) || 5)),
    })),
    schedule: {
      weekdays: Array.isArray(body.schedule?.weekdays)
        ? [...new Set(body.schedule.weekdays.map(Number).filter((n) => n >= 1 && n <= 7))]
        : [],
    },
  };
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Adauga campurile derivate pentru client: daca e programat azi si daca a fost
 * deja terminat azi (pentru gating-ul butonului "Incepe devotional").
 */
const serialize = (d) => {
  const now = new Date();
  const todayWd = now.getDay() + 1;
  const dueToday = d.schedule?.weekdays?.includes(todayWd) || false;
  const completedToday = (d.completions || []).some((c) => sameDay(new Date(c), now));
  return {
    _id: d._id,
    name: d.name,
    icon: d.icon,
    iconSet: d.iconSet,
    color: d.color,
    tasks: d.tasks,
    schedule: d.schedule,
    isDefault: d.isDefault,
    dueToday,
    completedToday,
    completions: d.completions,
    createdAt: d.createdAt,
  };
};

/**
 * GET /devotionals - devotionalele mele.
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const items = await Devotional.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    res.json({ devotionals: items.map(serialize) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la incarcare" });
  }
});

/**
 * POST /devotionals - creeaza un devotional. Primul devine automat default.
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const data = sanitizeDevotional(req.body);
    const count = await Devotional.countDocuments({ ownerId: req.user.id });
    const devotional = await Devotional.create({
      ...data,
      ownerId: req.user.id,
      isDefault: count === 0,
    });
    res.status(201).json({ devotional: serialize(devotional) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la creare" });
  }
});

/**
 * PATCH /devotionals/:id - editeaza un devotional propriu.
 */
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const data = sanitizeDevotional(req.body);
    const devotional = await Devotional.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id },
      { $set: data },
      { new: true }
    );
    if (!devotional) return res.status(404).json({ error: "Devotional negasit" });
    res.json({ devotional: serialize(devotional) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la editare" });
  }
});

/**
 * DELETE /devotionals/:id - sterge un devotional propriu.
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Devotional.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user.id,
    });
    if (!deleted) return res.status(404).json({ error: "Devotional negasit" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Eroare la stergere" });
  }
});

/**
 * POST /devotionals/:id/default - seteaza acest devotional ca default (unic).
 */
router.post("/:id/default", authMiddleware, async (req, res) => {
  try {
    const target = await Devotional.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!target) return res.status(404).json({ error: "Devotional negasit" });
    await Devotional.updateMany({ ownerId: req.user.id }, { $set: { isDefault: false } });
    target.isDefault = true;
    await target.save();
    res.json({ devotional: serialize(target) });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * POST /devotionals/:id/complete - marcheaza devotionalul ca terminat azi.
 */
router.post("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const devotional = await Devotional.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!devotional) return res.status(404).json({ error: "Devotional negasit" });
    const now = new Date();
    const already = devotional.completions.some((c) => sameDay(new Date(c), now));
    if (!already) {
      devotional.completions.push(now);
      await devotional.save();
    }
    res.json({ devotional: serialize(devotional) });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * POST /devotionals/:id/share - trimite un snapshot al devotionalului catre alt user.
 */
router.post("/:id/share", authMiddleware, async (req, res) => {
  try {
    const { toUserId } = req.body;
    if (!toUserId) return res.status(400).json({ error: "Destinatar lipsa" });
    if (String(toUserId) === String(req.user.id))
      return res.status(400).json({ error: "Nu iti poti trimite tie" });

    const [devotional, recipient, me] = await Promise.all([
      Devotional.findOne({ _id: req.params.id, ownerId: req.user.id }),
      User.findById(toUserId).select("_id"),
      User.findById(req.user.id).select("personalData.fullName"),
    ]);
    if (!devotional) return res.status(404).json({ error: "Devotional negasit" });
    if (!recipient) return res.status(404).json({ error: "Utilizator negasit" });

    await DevotionalShare.create({
      fromUserId: req.user.id,
      fromUserName: me?.personalData?.fullName || "Cineva",
      toUserId,
      snapshot: {
        name: devotional.name,
        icon: devotional.icon,
        iconSet: devotional.iconSet,
        color: devotional.color,
        tasks: devotional.tasks.map((t) => ({
          title: t.title,
          icon: t.icon,
          iconSet: t.iconSet,
          color: t.color,
          durationMin: t.durationMin,
        })),
      },
    });
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Eroare la trimitere" });
  }
});

/**
 * GET /devotionals/shares/incoming - partajari primite in asteptare.
 */
router.get("/shares/incoming", authMiddleware, async (req, res) => {
  try {
    const shares = await DevotionalShare.find({
      toUserId: req.user.id,
      status: "pending",
    }).sort({ createdAt: -1 });
    res.json({ shares });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * POST /devotionals/shares/:id/accept - copiaza devotionalul primit in lista mea.
 */
router.post("/shares/:id/accept", authMiddleware, async (req, res) => {
  try {
    const share = await DevotionalShare.findOne({
      _id: req.params.id,
      toUserId: req.user.id,
      status: "pending",
    });
    if (!share) return res.status(404).json({ error: "Partajare negasita" });

    const count = await Devotional.countDocuments({ ownerId: req.user.id });
    const devotional = await Devotional.create({
      ownerId: req.user.id,
      name: share.snapshot.name,
      icon: share.snapshot.icon,
      iconSet: share.snapshot.iconSet,
      color: share.snapshot.color,
      tasks: share.snapshot.tasks,
      isDefault: count === 0,
    });
    share.status = "accepted";
    await share.save();
    res.json({ devotional: serialize(devotional) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la acceptare" });
  }
});

/**
 * POST /devotionals/shares/:id/decline - refuza o partajare primita.
 */
router.post("/shares/:id/decline", authMiddleware, async (req, res) => {
  try {
    const share = await DevotionalShare.findOneAndUpdate(
      { _id: req.params.id, toUserId: req.user.id, status: "pending" },
      { $set: { status: "declined" } }
    );
    if (!share) return res.status(404).json({ error: "Partajare negasita" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

module.exports = router;
