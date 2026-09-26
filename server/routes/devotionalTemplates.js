const express = require("express");
const { DevotionalTemplate, User } = require("../models");
const { authMiddleware, requireAccess } = require("../middleware");

const router = express.Router();

const ICON_SETS = ["ionicons", "material", "feather", "fontawesome5"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const IMAGE_PRESETS = ["sim_duminica", "sim_duminica2", "war_room_1"];
const MAX_IMAGE_LEN = 900000;

const safeStr = (s, max) => String(s || "").trim().slice(0, max);
const safeColor = (c) => (HEX.test(String(c || "")) ? c : "#10b981");
const safeIconSet = (s) => (ICON_SETS.includes(s) ? s : "ionicons");
const safeImage = (v) => {
  const s = String(v || "");
  if (s.startsWith("preset:") && IMAGE_PRESETS.includes(s.slice(7))) return s;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/.test(s) && s.length <= MAX_IMAGE_LEN) return s;
  return "";
};

// Un moment de template: listele/muzica fixe private nu se pot transfera intre
// useri, deci private/prayroom devin automat "userul alege".
const sanitizeTask = (t) => {
  const kind = t?.prayerList?.kind;
  const chooseList = !!t?.chooseList || kind === "private" || kind === "prayroom";
  return {
    title: safeStr(t.title, 60) || "Moment",
    icon: safeStr(t.icon, 40) || "flower-outline",
    iconSet: safeIconSet(t.iconSet),
    color: safeColor(t.color),
    durationMin: Math.min(180, Math.max(1, parseInt(t.durationMin, 10) || 5)),
    music: {
      enabled: !!t.music?.enabled,
      category: t.music?.category === "lyrics" ? "lyrics" : "instrumental",
    },
    chooseMusic: !!t.chooseMusic,
    prayerList: chooseList
      ? { kind: null, boardId: null, roomId: null }
      : {
          kind: kind === "public" ? "public" : kind === "church" ? "church" : null,
          boardId: null,
          roomId: null,
        },
    chooseList,
    action: {
      required: !!t.action?.required,
      description: safeStr(t.action?.description, 300),
    },
  };
};

// Zilele recomandate + repetare, curatate (1..7, fara duplicate)
const sanitizeSchedule = (s) => ({
  weekdays: Array.isArray(s?.weekdays)
    ? [...new Set(s.weekdays.map(Number).filter((n) => n >= 1 && n <= 7))]
    : [],
  repeatWeekly: s?.repeatWeekly !== false,
});

// Notificarea recomandata de creator, curatata
const sanitizeNotification = (n) => ({
  enabled: !!n?.enabled,
  message: safeStr(n?.message, 160),
  hour: Math.min(23, Math.max(0, parseInt(n?.hour, 10) || 8)),
  minute: Math.min(59, Math.max(0, parseInt(n?.minute, 10) || 0)),
});

const browseFields = (t) => ({
  _id: t._id,
  name: t.name,
  icon: t.icon,
  iconSet: t.iconSet,
  color: t.color,
  image: t.image,
  tasksCount: t.tasks?.length || 0,
  createdByName: t.createdByName,
  createdAt: t.createdAt,
});

// GET /devotional-templates?q= — lista de template-uri (oricine logat)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const q = {};
    const search = safeStr(req.query.q, 60);
    if (search) q.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const items = await DevotionalTemplate.find(q).sort({ createdAt: -1 }).limit(100);
    res.json({ templates: items.map(browseFields) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la incarcare" });
  }
});

// GET /devotional-templates/:id — template complet (pentru import)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const t = await DevotionalTemplate.findById(req.params.id);
    if (!t) return res.status(404).json({ error: "Template negasit" });
    res.json({ template: t });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

// POST /devotional-templates — creeaza un template (necesita grant templates.manage)
router.post("/", authMiddleware, requireAccess("templates.manage"), async (req, res) => {
  try {
    const b = req.body || {};
    const tasks = Array.isArray(b.tasks) ? b.tasks.slice(0, 20).map(sanitizeTask) : [];
    if (!tasks.length) return res.status(400).json({ error: "Template-ul are nevoie de minim un moment" });

    const me = await User.findById(req.user.id).select("personalData.fullName");
    const t = await DevotionalTemplate.create({
      name: safeStr(b.name, 60) || "Template",
      icon: safeStr(b.icon, 40) || "book-outline",
      iconSet: safeIconSet(b.iconSet),
      color: safeColor(b.color),
      image: safeImage(b.image),
      tasks,
      schedule: sanitizeSchedule(b.schedule),
      notification: sanitizeNotification(b.notification),
      createdBy: req.user.id,
      createdByName: me?.personalData?.fullName || "",
    });
    res.status(201).json({ template: t });
  } catch (e) {
    res.status(500).json({ error: "Eroare la creare" });
  }
});

// DELETE /devotional-templates/:id — sterge un template (grant). Nu afecteaza
// devotionalele deja importate de useri.
router.delete("/:id", authMiddleware, requireAccess("templates.manage"), async (req, res) => {
  try {
    const deleted = await DevotionalTemplate.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Template negasit" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Eroare la stergere" });
  }
});

module.exports = router;
