const express = require("express");
const sharp = require("sharp");
const { User } = require("../models");
const { authMiddleware, isAdmin, isSuperAdmin } = require("../middleware");
const { cleanupUserData } = require("../services/cleanupService");
const { writeAudit } = require("../services/auditService");

const router = express.Router();

/**
 * Proceseaza și comprima imaginea de profil la 300x300px, calitate 85%
 */
const processProfileImage = async (base64String) => {
  try {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const processedBuffer = await sharp(buffer)
      .resize(300, 300, { fit: "cover", position: "center" })
      .jpeg({ quality: 85 })
      .toBuffer();

    return `data:image/jpeg;base64,${processedBuffer.toString("base64")}`;
  } catch {
    return base64String;
  }
};

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ error: "Utilizator negasit" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Eroare server" });
  }
});

router.put("/me", authMiddleware, async (req, res) => {
  try {
    const { fullName, age, phone, teamRoles, bible, profilePicture } = req.body;

    const updateData = {};

    if (fullName !== undefined) updateData["personalData.fullName"] = fullName;
    if (age !== undefined) updateData["personalData.age"] = age;
    if (phone !== undefined) updateData["personalData.phone"] = phone;
    if (profilePicture !== undefined) {
      const processedImage = await processProfileImage(profilePicture);
      updateData["personalData.profilePicture"] = processedImage;
    }
    if (teamRoles !== undefined) updateData.teamRoles = teamRoles;
    if (bible?.favoritePsalm !== undefined)
      updateData["content.bible.favoritePsalm"] = bible.favoritePsalm;
    if (bible?.favoriteVerse !== undefined)
      updateData["content.bible.favoriteVerse"] = bible.favoriteVerse;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select("-passwordHash");

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Eroare la actualizare" });
  }
});

/**
 * GET /users/search?q= - cautare minimala de utilizatori dupa nume, pentru
 * partajarea unui devotional. Expune DOAR id, nume si poza (nu email/telefon).
 * Query escapat (fara regex/NoSQL injection), minim 2 caractere, limita 20.
 */
router.get("/search", authMiddleware, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json({ users: [] });
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User.find({
      _id: { $ne: req.user.id },
      "status.isActive": true,
      "personalData.fullName": { $regex: escaped, $options: "i" },
    })
      .select("_id personalData.fullName personalData.profilePicture")
      .limit(20);
    res.json({
      users: users.map((u) => ({
        _id: u._id,
        fullName: u.personalData?.fullName || "Utilizator",
        profilePicture: u.personalData?.profilePicture || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Eroare la cautare" });
  }
});

router.get("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ deletedAt: null })
      .select("-passwordHash")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Eroare la încarcarea utilizatorilor" });
  }
});

router.get("/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ error: "Utilizator negasit" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Eroare server" });
  }
});

router.put("/:id/role", authMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin", "superadmin", "developer"].includes(role)) {
      return res.status(400).json({ error: "Rol invalid" });
    }

    const before = await User.findById(req.params.id).select("role");
    if (!before) {
      return res.status(404).json({ error: "Utilizator negasit" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-passwordHash");

    await writeAudit({
      action: "user.role-change",
      req,
      targetType: "user",
      targetId: req.params.id,
      meta: { from: before.role, to: role },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Eroare la actualizare" });
  }
});

router.post("/device-token", authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token invalid" });
    }

    const user = await User.findById(req.user.id);

    if (!user.deviceTokens.includes(token)) {
      user.deviceTokens.push(token);
      await user.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Eroare server" });
  }
});

router.delete("/:id", authMiddleware, isSuperAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "Nu te poți șterge pe tine" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "Utilizator negasit" });
    }

    // ?purge=true -> stergere DEFINITIVA (ireversibila, curata si datele asociate).
    // Rara, dar tot auditata. Implicit facem soft-delete recuperabil.
    if (req.query.purge === "true") {
      await cleanupUserData(req.params.id);
      await User.findByIdAndDelete(req.params.id);
      await writeAudit({
        action: "user.purge",
        req,
        targetType: "user",
        targetId: req.params.id,
        meta: { email: user.email },
      });
      return res.json({ message: "Utilizator și date asociate șterse definitiv" });
    }

    // soft-delete: taie accesul instant (tokenVersion++), ascunde si dezactiveaza
    // contul, dar il pastreaza recuperabil (anti stergere ireversibila de un admin compromis).
    user.deletedAt = new Date();
    user.status.isActive = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await writeAudit({
      action: "user.soft-delete",
      req,
      targetType: "user",
      targetId: req.params.id,
      meta: { email: user.email },
    });

    res.json({
      message:
        "Utilizator dezactivat (recuperabil). Pentru ștergere definitivă folosește ?purge=true.",
    });
  } catch (error) {
    res.status(500).json({ error: "Eroare la ștergere" });
  }
});

// Blocheaza / deblocheaza instant un cont abuziv (isBanned verificat la fiecare
// cerere + socket). Ban -> tokenVersion++ deconecteaza sesiunile existente.
router.patch("/:id/ban", authMiddleware, isSuperAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "Nu te poți bloca pe tine" });
    }

    const { banned, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Utilizator negasit" });
    }

    user.status.isBanned = !!banned;
    user.status.bannedAt = banned ? new Date() : null;
    user.status.bannedReason = banned ? String(reason || "").slice(0, 300) : "";
    if (banned) user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await writeAudit({
      action: banned ? "user.ban" : "user.unban",
      req,
      targetType: "user",
      targetId: req.params.id,
      meta: { reason: reason || "" },
    });

    res.json({ id: user._id, isBanned: user.status.isBanned });
  } catch (error) {
    res.status(500).json({ error: "Eroare la blocare" });
  }
});

module.exports = router;
