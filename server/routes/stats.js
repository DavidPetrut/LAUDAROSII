const express = require("express");
const router = express.Router();
const UserStats = require("../models/UserStats");
const { authMiddleware } = require("../middleware/auth");

// GET /api/stats - Get user stats
router.get("/", authMiddleware, async (req, res) => {
  try {
    const stats = await UserStats.getOrCreate(req.user._id);
    res.json(stats);
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({ error: "Eroare la obținerea statisticilor" });
  }
});

// POST /api/stats/winstreak - Update winstreak count
router.post("/winstreak", authMiddleware, async (req, res) => {
  try {
    const { count } = req.body;
    const stats = await UserStats.updateWinstreak(req.user._id, count);
    res.json(stats);
  } catch (error) {
    console.error("Error updating winstreak:", error);
    res.status(500).json({ error: "Eroare la actualizarea winstreak" });
  }
});

// POST /api/stats/reset-winstreak - Reset winstreak
router.post("/reset-winstreak", authMiddleware, async (req, res) => {
  try {
    const stats = await UserStats.resetWinstreak(req.user._id);
    res.json(stats);
  } catch (error) {
    console.error("Error resetting winstreak:", error);
    res.status(500).json({ error: "Eroare la resetarea winstreak" });
  }
});

// POST /api/stats/prayer-added - Increment prayers added
router.post("/prayer-added", authMiddleware, async (req, res) => {
  try {
    const stats = await UserStats.incrementPrayersAdded(req.user._id);
    res.json(stats);
  } catch (error) {
    console.error("Error incrementing prayers:", error);
    res.status(500).json({ error: "Eroare" });
  }
});

// POST /api/stats/prayer-answered - Increment prayers answered
router.post("/prayer-answered", authMiddleware, async (req, res) => {
  try {
    const stats = await UserStats.incrementPrayersAnswered(req.user._id);
    res.json(stats);
  } catch (error) {
    console.error("Error incrementing answered:", error);
    res.status(500).json({ error: "Eroare" });
  }
});

module.exports = router;
