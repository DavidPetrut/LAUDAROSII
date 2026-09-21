const express = require("express");
const { PrayerBoard } = require("../models");
const { authMiddleware } = require("../middleware");

const router = express.Router();

const MAX_BOARDS = 3;
const MAX_IMAGE_LEN = 900000;
const IMAGE_PRESETS = ["sim_duminica", "sim_duminica2", "war_room_1"];
const MOODS = [
  "tulburat",
  "incredere",
  "eliberare",
  "voia_lui",
  "persistent",
  "nelinistit",
  "astept",
];

const safeStr = (s, max) => String(s || "").trim().slice(0, max);
const safeMood = (m) => (MOODS.includes(m) ? m : null);

/**
 * Accepta doar o cheie de preset din whitelist sau un data URI de imagine sub o
 * limita de marime. Orice altceva devine "" (fara imagine).
 */
const safeImage = (v) => {
  const s = String(v || "");
  if (s.startsWith("preset:") && IMAGE_PRESETS.includes(s.slice(7))) return s;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/.test(s) && s.length <= MAX_IMAGE_LEN) return s;
  return "";
};

/**
 * Transforma numarul de zile ales (30/90/180/custom) intr-o data de expirare.
 * Fara zile valide -> null (fara expirare).
 */
const computeExpiry = (durationDays) => {
  const days = parseInt(durationDays, 10);
  if (!days || days < 1 || days > 3650) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Serializeaza o lista pentru client, adaugand flag-ul derivat `expired`.
 */
const serialize = (b) => ({
  _id: b._id,
  title: b.title,
  image: b.image,
  expiresAt: b.expiresAt,
  expired: !!b.expiresAt && new Date(b.expiresAt).getTime() < Date.now(),
  prayers: b.prayers,
  createdAt: b.createdAt,
});

/**
 * GET /prayer-boards - listele private ale userului.
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const boards = await PrayerBoard.find({ ownerId: req.user.id }).sort({ createdAt: 1 });
    res.json({ boards: boards.map(serialize) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la incarcare" });
  }
});

/**
 * POST /prayer-boards - creeaza o lista privata (max 3 per user).
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const count = await PrayerBoard.countDocuments({ ownerId: req.user.id });
    if (count >= MAX_BOARDS)
      return res.status(400).json({ error: "Ai atins limita de 3 liste private" });

    const title = safeStr(req.body.title, 60);
    if (!title) return res.status(400).json({ error: "Titlul este obligatoriu" });

    const board = await PrayerBoard.create({
      ownerId: req.user.id,
      title,
      image: safeImage(req.body.image),
      expiresAt: computeExpiry(req.body.durationDays),
    });
    res.status(201).json({ board: serialize(board) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la creare" });
  }
});

/**
 * PATCH /prayer-boards/:id - editeaza titlul/imaginea unei liste proprii.
 */
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const board = await PrayerBoard.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!board) return res.status(404).json({ error: "Lista negasita" });
    if (req.body.title !== undefined) {
      const title = safeStr(req.body.title, 60);
      if (!title) return res.status(400).json({ error: "Titlul este obligatoriu" });
      board.title = title;
    }
    if (req.body.image !== undefined) board.image = safeImage(req.body.image);
    await board.save();
    res.json({ board: serialize(board) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la editare" });
  }
});

/**
 * DELETE /prayer-boards/:id - sterge lista si toate motivele ei (cascade).
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await PrayerBoard.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user.id,
    });
    if (!deleted) return res.status(404).json({ error: "Lista negasita" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Eroare la stergere" });
  }
});

/**
 * POST /prayer-boards/:id/renew - prelungeste o lista expirata cu o noua durata,
 * pastrand motivele existente.
 */
router.post("/:id/renew", authMiddleware, async (req, res) => {
  try {
    const board = await PrayerBoard.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!board) return res.status(404).json({ error: "Lista negasita" });
    board.expiresAt = computeExpiry(req.body.durationDays);
    await board.save();
    res.json({ board: serialize(board) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la reincarcare" });
  }
});

/**
 * POST /prayer-boards/:id/prayers - adauga un motiv in lista privata.
 */
router.post("/:id/prayers", authMiddleware, async (req, res) => {
  try {
    const text = safeStr(req.body.text, 1000);
    if (!text) return res.status(400).json({ error: "Motivul este obligatoriu" });
    const board = await PrayerBoard.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!board) return res.status(404).json({ error: "Lista negasita" });
    board.prayers.push({
      text,
      isUrgent: !!req.body.isUrgent,
      mood: safeMood(req.body.mood),
    });
    await board.save();
    res.status(201).json({ board: serialize(board) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la adaugare" });
  }
});

/**
 * PATCH /prayer-boards/:id/prayers/:prayerId - editeaza un motiv (raspuns/urgent/stare).
 */
router.patch("/:id/prayers/:prayerId", authMiddleware, async (req, res) => {
  try {
    const board = await PrayerBoard.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!board) return res.status(404).json({ error: "Lista negasita" });
    const prayer = board.prayers.id(req.params.prayerId);
    if (!prayer) return res.status(404).json({ error: "Motiv negasit" });
    if (req.body.answered !== undefined) prayer.answered = !!req.body.answered;
    if (req.body.isUrgent !== undefined) prayer.isUrgent = !!req.body.isUrgent;
    if (req.body.mood !== undefined) prayer.mood = safeMood(req.body.mood);
    await board.save();
    res.json({ board: serialize(board) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la editare" });
  }
});

/**
 * DELETE /prayer-boards/:id/prayers/:prayerId - sterge un motiv din lista.
 */
router.delete("/:id/prayers/:prayerId", authMiddleware, async (req, res) => {
  try {
    const board = await PrayerBoard.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!board) return res.status(404).json({ error: "Lista negasita" });
    board.prayers.pull(req.params.prayerId);
    await board.save();
    res.json({ board: serialize(board) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la stergere" });
  }
});

module.exports = router;
