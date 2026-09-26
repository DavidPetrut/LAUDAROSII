const express = require("express");
const { Announcement, User } = require("../models");
const { authMiddleware, requireAccess } = require("../middleware");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    await Announcement.deleteMany({
      expiresAt: { $ne: null, $lt: new Date() },
    });

    const announcements = await Announcement.find()
      .populate("authorId", "personalData.fullName personalData.profilePicture")
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Announcement.countDocuments();

    res.json({
      announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Eroare la încarcarea anunțurilor" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).populate(
      "authorId",
      "personalData.fullName personalData.profilePicture email"
    );

    if (!announcement) {
      return res.status(404).json({ error: "Anunț negasit" });
    }

    res.json(announcement);
  } catch (error) {
    res.status(500).json({ error: "Eroare server" });
  }
});

router.post("/", authMiddleware, requireAccess("announcements.manage"), async (req, res) => {
  try {
    const { title, body, mediaUrl, expiresAt, bgColor, bgImage } = req.body;

    if (!title || !body) {
      return res
        .status(400)
        .json({ error: "Titlul și conținutul sunt obligatorii" });
    }

    const announcement = new Announcement({
      title,
      body,
      mediaUrl,
      authorId: req.user.id,
      date: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      bgColor: bgColor || null,
      bgImage: bgImage || null,
    });

    await announcement.save();
    await announcement.populate(
      "authorId",
      "personalData.fullName personalData.profilePicture"
    );

    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ error: "Eroare la crearea anunțului" });
  }
});

router.put("/:id", authMiddleware, requireAccess("announcements.manage"), async (req, res) => {
  try {
    const { title, body, mediaUrl } = req.body;

    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { title, body, mediaUrl },
      { new: true }
    ).populate("authorId", "personalData.fullName");

    if (!announcement) {
      return res.status(404).json({ error: "Anunț negasit" });
    }

    res.json(announcement);
  } catch (error) {
    res.status(500).json({ error: "Eroare la actualizare" });
  }
});

router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ error: "Anunț negasit" });
    }

    if (!announcement.readBy) {
      announcement.readBy = [];
    }

    if (!announcement.readBy.includes(req.user.id)) {
      announcement.readBy.push(req.user.id);
      await announcement.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Eroare la marcare" });
  }
});

router.delete("/:id", authMiddleware, requireAccess("announcements.manage"), async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);

    if (!announcement) {
      return res.status(404).json({ error: "Anunț negasit" });
    }

    res.json({ message: "Anunț șters cu succes" });
  } catch (error) {
    res.status(500).json({ error: "Eroare la ștergere" });
  }
});

/**
 * POST /:id/react - Adauga reacție la anunț
 */
router.post("/:id/react", authMiddleware, async (req, res) => {
  try {
    const { type } = req.body;
    const validTypes = ["thumbsup", "heart", "pray", "laugh"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Tip reacție invalid" });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: "Anunț negasit" });
    }

    const existingReaction = announcement.reactions.find(
      (r) => r.userId.toString() === req.user.id
    );

    if (existingReaction) {
      return res.status(400).json({ error: "Ai reacționat deja" });
    }

    announcement.reactions.push({ userId: req.user.id, type });
    await announcement.save();

    res.json({ success: true, reactionCounts: announcement.reactionCounts });
  } catch (error) {
    res.status(500).json({ error: "Eroare la reacție" });
  }
});

module.exports = router;
