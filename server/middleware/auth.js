const jwt = require("jsonwebtoken");
const { User } = require("../models");

/**
 * Autentificare + verificare live a identitatii.
 * 1. Verifica semnatura tokenului (reject ieftin daca e forjat/expirat).
 * 2. RE-CITESTE userul din DB la fiecare cerere: rolul, banul si tokenVersion
 *    sunt luate din baza ACUM, nu din tokenul vechi de 30 de zile. Astfel o
 *    retrogradare / un ban / un cont sters au efect instant (fara revocare pe rol).
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token lipsa sau invalid" });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: "Token expirat sau invalid" });
  }

  try {
    const user = await User.findById(decoded.id).select(
      "role status.isBanned tokenVersion deletedAt"
    );

    if (!user || user.deletedAt) {
      return res.status(401).json({ error: "Cont inexistent sau dezactivat" });
    }
    if (user.status?.isBanned) {
      return res.status(403).json({ error: "Cont blocat" });
    }
    if (typeof decoded.tv === "number" && decoded.tv !== user.tokenVersion) {
      return res.status(401).json({ error: "Sesiune revocata. Reautentifica-te." });
    }

    req.user = { id: user._id.toString(), role: user.role };
    next();
  } catch (error) {
    return res.status(500).json({ error: "Eroare la verificarea sesiunii" });
  }
};

module.exports = { authMiddleware };
