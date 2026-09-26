const { authMiddleware } = require("./auth");
const { socketAuth } = require("./socketAuth");
const { requireRole, isAdmin, isSuperAdmin, isAdminOrDev } = require("./roles");
const { requireAccess } = require("./access");
const { authLimiter, generalLimiter, limiter } = require("./rateLimit");

module.exports = {
  authMiddleware,
  socketAuth,
  requireRole,
  isAdmin,
  isSuperAdmin,
  isAdminOrDev,
  requireAccess,
  authLimiter,
  generalLimiter,
  limiter,
};
