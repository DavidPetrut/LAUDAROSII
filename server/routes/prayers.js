const express = require("express");
const { User, PrayerList, Notification } = require("../models");
const { authMiddleware, isAdmin } = require("../middleware");
const {
  generateShareCode,
  getWeekBounds,
  formatPrayersWithUsers,
  formatAllPrayers,
} = require("./prayersHelpers");

const router = express.Router();

router.get("/personal", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id, {
      hiddenPersonalPrayers: 1,
    });
    const hiddenPrayers = currentUser?.hiddenPersonalPrayers || [];

    const users = await User.find(
      { "content.prayers.0": { $exists: true } },
      { "content.prayers": 1, personalData: 1, _id: 1 }
    );

    const prayers = formatAllPrayers(users);

    const prayersWithMeta = prayers.map((p) => ({
      ...p,
      prayedCount: p.prayedBy?.length || 0,
      isHidden: hiddenPrayers.includes(p._id.toString()),
    }));

    res.json(prayersWithMeta);
  } catch (error) {
    res.status(500).json({ error: "Eroare la încarcare" });
  }
});

router.post("/personal", authMiddleware, async (req, res) => {
  try {
    const { text, isUrgent, mood } = req.body;
    if (!text?.trim())
      return res.status(400).json({ error: "Motivul este obligatoriu" });
    const user = await User.findById(req.user.id);
    user.content.prayers.push({
      text: text.trim(),
      isUrgent: isUrgent || false,
      mood: mood || null,
    });
    await user.save();

    const newPrayer = user.content.prayers[user.content.prayers.length - 1];

    // Notifică comunitatea despre rugăciunea nouă (în background)
    Notification.createNewCommunityPrayer(req.user.id, newPrayer._id, user)
      .catch((err) =>
        console.error("Error creating community notifications:", err)
      );

    res.status(201).json(newPrayer);
  } catch (error) {
    res.status(500).json({ error: "Eroare la adaugare" });
  }
});

router.put("/personal/:prayerId", authMiddleware, async (req, res) => {
  try {
    const { answered, isUrgent, mood } = req.body;
    const user = await User.findById(req.user.id);
    const prayer = user.content.prayers.id(req.params.prayerId);
    if (!prayer) return res.status(404).json({ error: "Negasita" });
    if (answered !== undefined) prayer.answered = answered;
    if (isUrgent !== undefined) prayer.isUrgent = isUrgent;
    if (mood !== undefined) prayer.mood = mood;
    await user.save();
    res.json(prayer);
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

router.delete("/personal/:prayerId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.content.prayers.pull(req.params.prayerId);
    await user.save();
    res.json({ message: "Șters" });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

router.post(
  "/personal/:userId/:prayerId/prayed",
  authMiddleware,
  async (req, res) => {
    try {
      const { userId, prayerId } = req.params;
      const currentUserId = req.user.id;

      if (userId === currentUserId) {
        return res
          .status(400)
          .json({ error: "Nu te poți ruga pentru propria rugăciune" });
      }

      const owner = await User.findById(userId);
      if (!owner) return res.status(404).json({ error: "User negăsit" });

      const prayer = owner.content.prayers.id(prayerId);
      if (!prayer) return res.status(404).json({ error: "Rugăciune negăsită" });

      if (prayer.prayedBy?.includes(currentUserId)) {
        return res.status(400).json({ error: "Te-ai rugat deja" });
      }

      prayer.prayedBy = prayer.prayedBy || [];
      prayer.prayedBy.push(currentUserId);
      await owner.save();

      const currentUser = await User.findById(currentUserId);
      if (!currentUser.hiddenPersonalPrayers.includes(prayerId)) {
        currentUser.hiddenPersonalPrayers.push(prayerId);
        await currentUser.save();
      }

      // Creează notificare pentru owner-ul rugăciunii
      try {
        await Notification.createPrayerReceived(userId, prayerId, currentUser);
      } catch (notifError) {
        console.error("Error creating notification:", notifError);
      }

      res.json({
        message: "Mulțumim că te-ai rugat!",
        prayedCount: prayer.prayedBy.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Eroare" });
    }
  }
);

router.get("/lists/current/:programType", authMiddleware, async (req, res) => {
  try {
    const list = await PrayerList.findOne({
      programType: req.params.programType,
      weekStart: { $lte: new Date() },
      weekEnd: { $gte: new Date() },
      isActive: true,
    })
      .populate("predicatorId", "personalData")
      .populate("prayers.userId", "personalData")
      .populate("prayers.reactions.oderId", "personalData")
      .populate("createdBy", "personalData");
    if (!list) return res.json(null);

    const userReactions = {};
    const prayerReactors = {};

    list.prayers.forEach((p) => {
      const userReaction = p.reactions?.find(
        (r) => r.oderId?._id?.toString() === req.user.id
      );
      if (userReaction) {
        userReactions[p._id.toString()] = userReaction.type;
      }

      prayerReactors[p._id.toString()] = (p.reactions || []).map((r) => ({
        name: r.oderId?.personalData?.fullName || "Anonim",
        profilePicture: r.oderId?.personalData?.profilePicture || null,
        type: r.type,
      }));
    });

    res.json({
      _id: list._id,
      programType: list.programType,
      shareCode: list.shareCode,
      weekStart: list.weekStart,
      weekEnd: list.weekEnd,
      createdBy: list.createdBy,
      users: formatPrayersWithUsers(list),
      userReactions,
      prayerReactors,
    });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

router.post("/lists", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { programType, predicatorId } = req.body;
    if (!["sim", "tineret"].includes(programType))
      return res.status(400).json({ error: "Tip invalid" });
    const { weekStart, weekEnd } = getWeekBounds(programType);
    const existing = await PrayerList.findOne({
      programType,
      weekStart,
      isActive: true,
    });
    if (existing) return res.status(400).json({ error: "Exista deja" });
    const list = new PrayerList({
      programType,
      weekStart,
      weekEnd,
      predicatorId: predicatorId || null,
      shareCode: generateShareCode(),
      prayers: [],
      createdBy: req.user.id,
    });
    await list.save();
    res.status(201).json({
      ...list.toObject(),
      shareLink: `/prayers/form/${list.shareCode}`,
    });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

router.get("/lists/by-code/:shareCode", authMiddleware, async (req, res) => {
  try {
    const list = await PrayerList.findOne({
      shareCode: req.params.shareCode,
      isActive: true,
    });
    if (!list) return res.status(404).json({ error: "Negasit" });
    res.json({
      _id: list._id,
      programType: list.programType,
      shareCode: list.shareCode,
    });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

router.post("/lists/:shareCode/submit", authMiddleware, async (req, res) => {
  try {
    const { text, isUrgent, mood } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Obligatoriu" });
    const list = await PrayerList.findOne({
      shareCode: req.params.shareCode,
      isActive: true,
    });
    if (!list) return res.status(404).json({ error: "Negasit" });
    list.prayers.push({
      userId: req.user.id,
      text: text.trim(),
      isUrgent: isUrgent || false,
      mood: mood || null,
      reactions: [],
    });
    await list.save();
    res.status(201).json({ message: "Adaugat" });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

router.post(
  "/lists/:listId/prayers/:prayerId/react",
  authMiddleware,
  async (req, res) => {
    try {
      const { type } = req.body;
      if (!["thumbsup", "heart", "pray", "laugh"].includes(type))
        return res.status(400).json({ error: "Tip invalid" });
      const list = await PrayerList.findById(req.params.listId);
      if (!list) return res.status(404).json({ error: "Negasit" });
      const prayer = list.prayers.id(req.params.prayerId);
      if (!prayer) return res.status(404).json({ error: "Negasit" });
      if (prayer.reactions.find((r) => r.oderId.toString() === req.user.id))
        return res.status(400).json({ error: "Deja reacționat" });
      prayer.reactions.push({ oderId: req.user.id, type });
      await list.save();
      const counts = { thumbsup: 0, heart: 0, pray: 0, laugh: 0 };
      prayer.reactions.forEach((r) => counts[r.type]++);
      res.json({ reactions: counts });
    } catch (error) {
      res.status(500).json({ error: "Eroare" });
    }
  }
);

router.get("/predicators", authMiddleware, isAdmin, async (req, res) => {
  try {
    res.json(
      await User.find(
        { teamRoles: "predicator" },
        { personalData: 1, email: 1 }
      )
    );
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

router.delete("/lists/:listId", authMiddleware, isAdmin, async (req, res) => {
  try {
    const list = await PrayerList.findById(req.params.listId);
    if (!list) return res.status(404).json({ error: "Lista nu a fost găsită" });

    await PrayerList.findByIdAndDelete(req.params.listId);
    res.json({ message: "Lista a fost ștearsă cu succes" });
  } catch (error) {
    res.status(500).json({ error: "Eroare la ștergerea listei" });
  }
});

module.exports = router;
