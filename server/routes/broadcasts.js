const express = require("express");
const {
  Broadcast,
  BroadcastTemplate,
  NotificationTag,
  User,
} = require("../models");
const { authMiddleware, requireAccess } = require("../middleware");
const { countAudience, deliverBroadcast } = require("../services");

const router = express.Router();

const ROLES = ["user", "admin", "superadmin", "developer"];
const s = (v, max) => String(v || "").trim().slice(0, max);
const arrStr = (v, max) =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, max) : [];

// Toate rutele sunt doar pentru super-admini.
router.use(authMiddleware, requireAccess("broadcasts.manage"));

/**
 * GET /admin/broadcasts/tags - catalogul de statusuri/etichete.
 */
router.get("/tags", async (req, res) => {
  try {
    const tags = await NotificationTag.find().sort({ name: 1 });
    res.json({ tags });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * POST /admin/broadcasts/tags - creeaza un status nou.
 */
router.post("/tags", async (req, res) => {
  try {
    const name = s(req.body.name, 40);
    if (!name) return res.status(400).json({ error: "Nume lipsa" });
    const existing = await NotificationTag.findOne({ name });
    if (existing) return res.json({ tag: existing });
    const tag = await NotificationTag.create({ name, createdBy: req.user.id });
    res.status(201).json({ tag });
  } catch (e) {
    res.status(500).json({ error: "Eroare la creare" });
  }
});

/**
 * DELETE /admin/broadcasts/tags/:id - sterge un status din catalog si de la useri.
 */
router.delete("/tags/:id", async (req, res) => {
  try {
    const tag = await NotificationTag.findByIdAndDelete(req.params.id);
    if (tag) await User.updateMany({ tags: tag.name }, { $pull: { tags: tag.name } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * GET /admin/broadcasts/users - cauta useri (nume) pentru atribuirea de statusuri.
 */
router.get("/users", async (req, res) => {
  try {
    const q = s(req.query.q, 60);
    const filter = {};
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter["personalData.fullName"] = { $regex: escaped, $options: "i" };
    }
    const users = await User.find(filter)
      .select("_id personalData.fullName tags role")
      .limit(30);
    res.json({
      users: users.map((u) => ({
        _id: u._id,
        fullName: u.personalData?.fullName || "Utilizator",
        tags: u.tags || [],
        role: u.role,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: "Eroare la cautare" });
  }
});

/**
 * PATCH /admin/broadcasts/users/:id/tags - seteaza statusurile unui user.
 */
router.patch("/users/:id/tags", async (req, res) => {
  try {
    const tags = arrStr(req.body.tags, 20);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { tags } },
      { new: true }
    ).select("_id personalData.fullName tags role");
    if (!user) return res.status(404).json({ error: "Utilizator negasit" });
    res.json({
      user: { _id: user._id, fullName: user.personalData?.fullName || "Utilizator", tags: user.tags, role: user.role },
    });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * GET /admin/broadcasts/audience - numarul de destinatari pentru un segment.
 */
router.get("/audience", async (req, res) => {
  try {
    const targetTags = s(req.query.tags, 300) ? req.query.tags.split(",").map((x) => x.trim()).filter(Boolean) : [];
    const targetRoles = s(req.query.roles, 100) ? req.query.roles.split(",").map((x) => x.trim()).filter((r) => ROLES.includes(r)) : [];
    const count = await countAudience({ targetTags, targetRoles });
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * GET /admin/broadcasts/templates - mesajele salvate ale super-adminului.
 */
router.get("/templates", async (req, res) => {
  try {
    const templates = await BroadcastTemplate.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    res.json({ templates });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * POST /admin/broadcasts/templates - salveaza un mesaj reutilizabil.
 */
router.post("/templates", async (req, res) => {
  try {
    const title = s(req.body.title, 60);
    const message = s(req.body.message, 500);
    if (!title || !message) return res.status(400).json({ error: "Titlu si mesaj obligatorii" });
    const template = await BroadcastTemplate.create({ ownerId: req.user.id, title, message });
    res.status(201).json({ template });
  } catch (e) {
    res.status(500).json({ error: "Eroare la salvare" });
  }
});

/**
 * DELETE /admin/broadcasts/templates/:id - sterge un mesaj salvat propriu.
 */
router.delete("/templates/:id", async (req, res) => {
  try {
    await BroadcastTemplate.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * GET /admin/broadcasts - lista notificarilor (programate + trimise).
 */
router.get("/", async (req, res) => {
  try {
    const broadcasts = await Broadcast.find().sort({ sendAt: -1 }).limit(100);
    res.json({ broadcasts });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * POST /admin/broadcasts - creeaza o notificare; trimite imediat sau o programeaza.
 */
router.post("/", async (req, res) => {
  try {
    const message = s(req.body.message, 500);
    if (!message) return res.status(400).json({ error: "Mesaj obligatoriu" });
    const title = s(req.body.title, 80);
    const targetTags = arrStr(req.body.targetTags, 20);
    const targetRoles = arrStr(req.body.targetRoles, 10).filter((r) => ROLES.includes(r));
    const sendEmail = !!req.body.sendEmail;

    let sendAt = new Date(req.body.sendAt);
    if (isNaN(sendAt.getTime())) sendAt = new Date();

    const me = await User.findById(req.user.id).select("personalData.fullName");
    const broadcast = await Broadcast.create({
      fromUserId: req.user.id,
      fromName: me?.personalData?.fullName || "Super-admin",
      title,
      message,
      targetTags,
      targetRoles,
      sendEmail,
      sendAt,
    });

    if (sendAt.getTime() <= Date.now()) await deliverBroadcast(broadcast);

    res.status(201).json({ broadcast });
  } catch (e) {
    res.status(500).json({ error: "Eroare la trimitere" });
  }
});

/**
 * DELETE /admin/broadcasts/:id - anuleaza o notificare programata (inca netrimisa).
 */
router.delete("/:id", async (req, res) => {
  try {
    const b = await Broadcast.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { $set: { status: "canceled" } }
    );
    if (!b) return res.status(404).json({ error: "Negasit sau deja trimis" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

module.exports = router;
