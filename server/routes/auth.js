const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User } = require("../models");
const { authLimiter } = require("../middleware");

const router = express.Router();

const hashToken = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");

// Gaseste un cont valid in asteptarea setarii parolei dupa token-ul din email
const findPendingInvite = async (rawToken) => {
  const user = await User.findOne({
    "invite.tokenHash": hashToken(rawToken),
    "invite.pendingSetup": true,
  });
  if (!user || user.deletedAt) return null;
  if (!user.invite?.expiresAt || new Date(user.invite.expiresAt) < new Date()) return null;
  return user;
};

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
      { id: user._id, role: user.role, tv: user.tokenVersion },
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

    if (user.deletedAt) {
      return res.status(400).json({ error: "Credențiale invalide" });
    }
    if (user.status?.isBanned) {
      return res.status(403).json({ error: "Cont blocat" });
    }

    user.status.lastActiveDate = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, tv: user.tokenVersion },
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

// Verifica o invitatie si intoarce datele de pre-completare (ecranul de setare parola)
router.get("/invite/:token", async (req, res) => {
  try {
    const user = await findPendingInvite(req.params.token);
    if (!user) return res.status(400).json({ error: "Invitatie invalida sau expirata" });
    res.json({ email: user.email, fullName: user.personalData?.fullName || "" });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Seteaza parola din invitatie si autentifica userul (auto-login)
router.post("/invite/:token/set-password", authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Parola trebuie sa aiba minim 6 caractere" });
    }
    const user = await findPendingInvite(req.params.token);
    if (!user) return res.status(400).json({ error: "Invitatie invalida sau expirata" });

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.invite = { tokenHash: null, expiresAt: null, invitedBy: null, pendingSetup: false };
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.status.lastActiveDate = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, tv: user.tokenVersion },
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
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

module.exports = router;
