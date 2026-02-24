const express = require("express");
const { Notification, User } = require("../models");
const { authMiddleware } = require("../middleware");

const router = express.Router();

/**
 * GET /notifications/counts
 * Returnează numărul de notificări nevăzute pe categorii
 */
router.get("/counts", authMiddleware, async (req, res) => {
  try {
    const counts = await Notification.getUnseenCounts(req.user.id);
    res.json(counts);
  } catch (error) {
    console.error("Error getting notification counts:", error);
    res.status(500).json({ error: "Eroare la încărcare" });
  }
});

/**
 * GET /notifications
 * Returnează toate notificările utilizatorului (opțional filtrate)
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { category, seen, limit = 50 } = req.query;
    const query = { userId: req.user.id };

    if (category) query.category = category;
    if (seen !== undefined) query.seen = seen === "true";

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(notifications);
  } catch (error) {
    console.error("Error getting notifications:", error);
    res.status(500).json({ error: "Eroare la încărcare" });
  }
});

/**
 * POST /notifications/seen/:category
 * Marchează toate notificările dintr-o categorie ca văzute
 */
router.post("/seen/:category", authMiddleware, async (req, res) => {
  try {
    const { category } = req.params;
    const validCategories = ["personal", "church", "more", "system"];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: "Categorie invalidă" });
    }

    const result = await Notification.markAsSeen(req.user.id, category);
    res.json({ marked: result.modifiedCount });
  } catch (error) {
    console.error("Error marking notifications as seen:", error);
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * POST /notifications/seen-by-id/:notificationId
 * Marchează o notificare specifică ca văzută (pentru criterii speciale)
 */
router.post("/seen-by-id/:notificationId", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, userId: req.user.id },
      { $set: { seen: true, seenAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: "Notificare negăsită" });
    }

    res.json(notification);
  } catch (error) {
    console.error("Error marking notification as seen:", error);
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * DELETE /notifications/clear/:category
 * Șterge toate notificările dintr-o categorie
 */
router.delete("/clear/:category", authMiddleware, async (req, res) => {
  try {
    const { category } = req.params;
    const result = await Notification.deleteMany({
      userId: req.user.id,
      category,
    });
    res.json({ deleted: result.deletedCount });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ error: "Eroare" });
  }
});

module.exports = router;
