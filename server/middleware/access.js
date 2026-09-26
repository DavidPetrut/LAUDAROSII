const { User } = require("../models");
const { resolveAccess, hasAccess } = require("../services/accessService");

/**
 * Poarta pe capabilitate: cere ca userul curent sa aiba `minLevel` ("view"/"edit")
 * pe capabilitatea `key`. Rezolva accesul din DB PROASPAT (rol + acordari), nu din
 * token. Super-admin trece mereu. De folosit dupa authMiddleware.
 */
const requireAccess = (key, minLevel = "edit") => async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Neautorizat" });
    if (req.user.role === "superadmin") return next();

    const userDoc = await User.findById(req.user.id).select("role access");
    if (!userDoc) return res.status(401).json({ error: "Cont inexistent" });

    const eff = await resolveAccess(userDoc);
    if (!hasAccess(eff, key, minLevel)) {
      return res.status(403).json({ error: "Nu ai acces la aceasta actiune" });
    }
    next();
  } catch (e) {
    res.status(500).json({ error: "Eroare la verificarea accesului" });
  }
};

module.exports = { requireAccess };
