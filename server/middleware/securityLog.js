const SecurityLog = require("../models/SecurityLog");

/**
 * Detecteaza si inregistreaza tentative de atac REALE, fara sa schimbe
 * comportamentul aplicatiei. Se monteaza global, inainte de rute. Cand o cerere
 * primeste 401/403/429, scrie un log (fire-and-forget).
 *
 *   401 -> unauthorized (acces fara token valid)
 *   403 -> privilege     (rol insuficient / privilege escalation incercat)
 *   429 -> flood         (rate-limit atins)
 */

// Prefix ruta -> ecran/zona prietenoasa (best-effort pentru "ce a targetat").
const AREA = {
  auth: "Autentificare (login/register)",
  users: "Utilizatori / Profil",
  prayers: "Rugaciuni",
  announcements: "Anunturi",
  courses: "Cursuri",
  games: "Jocuri",
  songs: "Melodii",
  "prayer-programs": "Programe rugaciune",
  notifications: "Notificari",
  stats: "Statistici",
  missions: "Misiuni",
  "pray-rooms": "Pray Rooms",
  testing: "Testare",
};

const STATUS_TO_TYPE = { 401: "unauthorized", 403: "privilege", 429: "flood" };

const clientIp = (req) => {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || "";
};

const targetFromPath = (path) => {
  const m = /^\/api\/([^/?]+)/.exec(path || "");
  return m && AREA[m[1]] ? AREA[m[1]] : null;
};

const securityLog = (req, res, next) => {
  // Nu inregistra probe-urile facute chiar de dashboardul de admin.
  if (req.headers["x-security-probe"]) return next();

  res.on("finish", () => {
    const type = STATUS_TO_TYPE[res.statusCode];
    if (!type) return;
    const doc = {
      status: "blocked",
      attackType: type,
      httpStatus: res.statusCode,
      method: req.method,
      path: (req.originalUrl || req.url || "").split("?")[0].slice(0, 300),
      targetScreen: targetFromPath(req.originalUrl || req.url),
      ip: clientIp(req),
      country: null,
      userAgent: String(req.headers["user-agent"] || "").slice(0, 400),
      userId: req.user?.id || null,
    };
    SecurityLog.create(doc).catch(() => {});
  });

  next();
};

module.exports = { securityLog };
