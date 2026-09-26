const express = require("express");
const { User, RolePermission } = require("../models");
const { authMiddleware, isSuperAdmin } = require("../middleware");
const { resolveAccess } = require("../services/accessService");
const { writeAudit } = require("../services/auditService");
const {
  CAPABILITIES,
  GROUPS,
  LEVELS,
  isValidKey,
  isValidLevel,
} = require("../config/capabilities");

const router = express.Router();

const GRANT_ROLES = ["admin", "developer", "editor", "user"];

// Curata o harta {cheie: nivel} pastrand doar chei valide + nivel view/edit
const sanitizePermMap = (input) => {
  const out = {};
  if (input && typeof input === "object") {
    for (const [k, v] of Object.entries(input)) {
      if (isValidKey(k) && isValidLevel(v) && v !== "none") out[k] = v;
    }
  }
  return out;
};

const mapToObj = (m) => (m instanceof Map ? Object.fromEntries(m) : m || {});

/**
 * GET /api/access/me — accesul efectiv al userului curent (pentru gating in client).
 * Disponibil oricarui user logat; nu expune catalogul altora.
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userDoc = await User.findById(req.user.id).select("role access");
    const access = await resolveAccess(userDoc);
    res.json({ role: req.user.role, access });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

// De aici in jos: DOAR super-admin (poarta fixa, ne-acordabila)
router.use(authMiddleware, isSuperAdmin);

/**
 * GET /api/access/catalog — catalogul de capabilitati + niveluri + grupuri.
 */
router.get("/catalog", (req, res) => {
  res.json({ capabilities: CAPABILITIES, groups: GROUPS, levels: LEVELS });
});

/**
 * GET /api/access/roles — permisiunile fiecarui rol acordabil.
 */
router.get("/roles", async (req, res) => {
  try {
    const docs = await RolePermission.find({ role: { $in: GRANT_ROLES } }).lean();
    const ids = docs.map((d) => d.updatedBy).filter(Boolean);
    let nameById = {};
    if (ids.length) {
      const users = await User.find({ _id: { $in: ids } }).select("personalData.fullName email");
      nameById = Object.fromEntries(
        users.map((u) => [String(u._id), u.personalData?.fullName || u.email || "cineva"])
      );
    }
    const byRole = Object.fromEntries(docs.map((d) => [d.role, d]));
    const roles = GRANT_ROLES.map((role) => {
      const d = byRole[role];
      return {
        role,
        perms: d ? mapToObj(d.perms) : {},
        updatedAt: d?.updatedAt || null,
        updatedByName: d?.updatedBy ? nameById[String(d.updatedBy)] || "cineva" : null,
      };
    });
    res.json({ roles });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * PUT /api/access/roles/:role — seteaza permisiunile unui rol.
 */
router.put("/roles/:role", async (req, res) => {
  try {
    const role = req.params.role;
    if (!GRANT_ROLES.includes(role)) {
      return res.status(400).json({ error: "Rol invalid" });
    }
    const perms = sanitizePermMap(req.body.perms);
    const doc = await RolePermission.findOneAndUpdate(
      { role },
      { role, perms, updatedAt: new Date(), updatedBy: req.user.id },
      { new: true, upsert: true }
    );
    await writeAudit({
      action: "access.role-perms",
      req,
      targetType: "role",
      targetId: role,
      meta: { perms },
    });
    res.json({ role, perms: mapToObj(doc.perms) });
  } catch (e) {
    res.status(500).json({ error: "Eroare la salvare" });
  }
});

/**
 * GET /api/access/members — lista de utilizatori pentru ecranul de membri.
 * Filtre optionale: ?search= (nume/email), ?role=.
 */
router.get("/members", async (req, res) => {
  try {
    const q = { deletedAt: null };
    if (req.query.role && [...GRANT_ROLES, "superadmin"].includes(req.query.role)) {
      q.role = req.query.role;
    }
    const search = String(req.query.search || "").trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ email: rx }, { "personalData.fullName": rx }];
    }
    const users = await User.find(q)
      .select("email role personalData.fullName personalData.profilePicture status.isBanned")
      .sort({ role: 1, "personalData.fullName": 1 })
      .limit(200);
    res.json(
      users.map((u) => ({
        _id: u._id,
        email: u.email,
        role: u.role,
        fullName: u.personalData?.fullName || "",
        profilePicture: u.personalData?.profilePicture || null,
        isBanned: !!u.status?.isBanned,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * GET /api/access/members/:id — detaliile de acces ale unui user (rol + acordari).
 */
router.get("/members/:id", async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select(
      "email role personalData access status.isBanned"
    );
    if (!u) return res.status(404).json({ error: "Utilizator negasit" });
    res.json({
      _id: u._id,
      email: u.email,
      role: u.role,
      fullName: u.personalData?.fullName || "",
      profilePicture: u.personalData?.profilePicture || null,
      isBanned: !!u.status?.isBanned,
      grants: mapToObj(u.access?.grants),
    });
  } catch (e) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * PUT /api/access/members/:id/grants — seteaza accesele EXTRA ale unui user.
 */
router.put("/members/:id/grants", async (req, res) => {
  try {
    const grants = sanitizePermMap(req.body.grants);
    const u = await User.findById(req.params.id).select("role access");
    if (!u) return res.status(404).json({ error: "Utilizator negasit" });
    u.access = u.access || {};
    u.access.grants = grants;
    await u.save();
    await writeAudit({
      action: "access.user-grants",
      req,
      targetType: "user",
      targetId: req.params.id,
      meta: { grants },
    });
    res.json({ _id: u._id, grants });
  } catch (e) {
    res.status(500).json({ error: "Eroare la salvare" });
  }
});

module.exports = router;
