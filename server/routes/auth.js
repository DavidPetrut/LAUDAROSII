const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { authLimiter } = require("../middleware");

const router = express.Router();

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { email, password, fullName, teamRoles } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email și parola sunt obligatorii" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Parola trebuie sa aiba minim 6 caractere" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "Email-ul este deja folosit" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      role: "user",
      teamRoles: teamRoles || [],
      personalData: { fullName: fullName || "" },
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        teamRoles: user.teamRoles,
        personalData: user.personalData,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Eroare la înregistrare" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email și parola sunt obligatorii" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: "Credențiale invalide" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Credențiale invalide" });
    }

    user.status.lastActiveDate = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );


    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        teamRoles: user.teamRoles,
        personalData: user.personalData,
        games: user.games,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Eroare la autentificare" });
  }
});

module.exports = router;
