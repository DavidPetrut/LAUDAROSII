const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Neautorizat" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Acces interzis pentru acest rol" });
    }

    next();
  };
};

const isAdmin = requireRole("admin", "superadmin", "developer");
const isSuperAdmin = requireRole("superadmin");
const isAdminOrDev = requireRole("admin", "superadmin", "developer");

module.exports = {
  requireRole,
  isAdmin,
  isSuperAdmin,
  isAdminOrDev,
};
