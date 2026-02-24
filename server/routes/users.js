const express = require("express");
const sharp = require("sharp");
const { User } = require("../models");
const { authMiddleware, isAdmin, isSuperAdmin } = require("../middleware");
const { cleanupUserData } = require("../services/cleanupService");

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

router.get("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const users = await User.find()
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

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ error: "Utilizator negasit" });
    }

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

    await cleanupUserData(req.params.id);

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "Utilizator și date asociate șterse cu succes" });
  } catch (error) {
    res.status(500).json({ error: "Eroare la ștergere" });
  }
});

module.exports = router;
