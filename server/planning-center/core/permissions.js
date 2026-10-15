/**
 * Permisiuni Planning Center — capability + scope based (§5).
 * STORED: peoplePlansLevel / songLevel / mediaLevel + fileAccess (pc_permissions).
 * DERIVED: capabilitățile (people.view, people.create, …) se calculează din nivel +
 *          leadership + org-defaults (pc_servicesDefaults). §5.6 + §5.7.
 *
 * La lansare expunem 2 roluri în UI (teamLeader/member), dar modelul complet e stocat.
 * Rolul din app-ul existent (req.user.role) e mapat la un nivel PC (bridge), până când
 * persoana primește permisiuni explicite în pc_permissions.
 */

// Ladder People&Plans (crește în sus). orgAdmin = vârf.
const PP_RANK = {
  scheduledViewer: 0,
  viewer: 1,
  scheduler: 2,
  editor: 3,
  administrator: 4,
  orgAdmin: 5,
};
// Ladder Song/Media — FĂRĂ scheduler (§5.2).
const SM_RANK = { scheduledViewer: 0, viewer: 1, editor: 2, administrator: 3 };

// Bridge: rol app existent → nivel PC implicit (până la permisiuni explicite).
const APP_ROLE_TO_PP = {
  superadmin: "orgAdmin",
  developer: "orgAdmin",
  admin: "administrator",
  editor: "editor",
  user: "viewer", // membru obișnuit poate naviga People (viewer = vede oamenii din echipele lui)
};

function ppRank(level) {
  return PP_RANK[level] ?? -1;
}
function atLeast(level, min) {
  return ppRank(level) >= ppRank(min);
}

// ─────────────── RBAC Planificare: 3 NIVELURI (cerință user, 2026-10-15) ───────────────
// total   = super-admin / developer → TOT (orice, oriunde în Planificare).
// partial = are "planningAdmin" în user.extraRoles → tot pe Plans/Songs/Media + view People/Reports.
//           NU administrează People (create/edit contact/permisiuni/delete) și NU e orgAdmin.
//           Super-adminii acordă acest acces oricui (indiferent de rolul de bază) → titlu „Planning Admin".
// basic   = restul → doar vizualizare (vede oamenii/planurile, răspunde la propriile programări).
// Accesele sunt CUMULATIVE pe extraRoles (fundație pt. roluri stacate; vezi memoria proiectului).
function resolvePcAccess(req) {
  const role = req.user?.role;
  const extra = Array.isArray(req.user?.extraRoles) ? req.user.extraRoles : [];
  if (role === "superadmin" || role === "developer") return "total";
  if (extra.includes("planningAdmin")) return "partial";
  return "basic";
}

const ACCESS_TO_LEVELS = {
  total: { peoplePlansLevel: "orgAdmin", songLevel: "administrator", mediaLevel: "administrator" },
  partial: { peoplePlansLevel: "editor", songLevel: "editor", mediaLevel: "editor" },
  basic: { peoplePlansLevel: "viewer", songLevel: "viewer", mediaLevel: "viewer" },
};

// Capabilitățile permise pentru „partial" (Planning Admin) — tot pe Plans/Songs/Media + view.
const PARTIAL_CAPS = new Set([
  "people.view", "people.viewAll", "people.assignTags",
  "services.manageServiceTypes", "services.addPlan", "services.editOrder", "services.schedule",
  "songs.edit", "media.edit", "reports.view",
]);
// „basic" — doar vizualizare.
const BASIC_CAPS = new Set(["people.view"]);

// Titluri afișabile (rolul de bază + rolurile extra cumulate). Pt. profilul din app.
const ROLE_TITLES = { superadmin: "Super Admin", developer: "Developer", admin: "Admin", editor: "Editor", user: "User" };
const EXTRA_ROLE_TITLES = { planningAdmin: "Planning Admin" };
function pcTitles(req) {
  const role = req.user?.role || "user";
  const extra = Array.isArray(req.user?.extraRoles) ? req.user.extraRoles : [];
  const titles = [ROLE_TITLES[role] || role];
  extra.forEach((r) => { if (EXTRA_ROLE_TITLES[r] && !titles.includes(EXTRA_ROLE_TITLES[r])) titles.push(EXTRA_ROLE_TITLES[r]); });
  return titles;
}

/**
 * Rezolvă permisiunea efectivă (cache pe req). Derivată din nivelul RBAC (total/partial/basic).
 */
async function resolveEffective(req) {
  if (req._pcPerm) return req._pcPerm;
  const access = resolvePcAccess(req);
  const lv = ACCESS_TO_LEVELS[access] || ACCESS_TO_LEVELS.basic;
  const eff = {
    pcAccess: access,
    peoplePlansLevel: lv.peoplePlansLevel,
    songLevel: lv.songLevel,
    mediaLevel: lv.mediaLevel,
    fileAccess: { plan: access !== "basic", song: access !== "basic", media: access !== "basic" },
    isOrgAdmin: access === "total",
  };
  req._pcPerm = eff;
  return eff;
}

/** Org-defaults (toggle-urile `*` din §5.7), cu valori rezonabile dacă lipsesc. */
async function getDefaults(req) {
  if (req._pcDefaults) return req._pcDefaults;
  const { scoped } = require("./orgScope");
  const PcServicesDefaults = require("../models/PcServicesDefaults");
  const d = (await PcServicesDefaults.findOne(scoped(req)).lean()) || {};
  const defaults = {
    newUserDefaultLevel: d.newUserDefaultLevel || "viewer",
    whoCanCreatePeople: d.whoCanCreatePeople || "editor", // scheduler|editor|administrator
    whoCanDeleteAnything: d.whoCanDeleteAnything || "administrator",
    whoCanEditContactInfo: d.whoCanEditContactInfo || "scheduler",
    whoCanEditAssignments: d.whoCanEditAssignments || "scheduler",
    whoCanCreateDeleteFolders: d.whoCanCreateDeleteFolders || "administrator",
    whoCanRemoveMyTeamsFilter: d.whoCanRemoveMyTeamsFilter || "administrator",
    directMessagesEnabled: d.directMessagesEnabled ?? true,
  };
  req._pcDefaults = defaults;
  return defaults;
}

/**
 * Verifică o capabilitate (DERIVED). Returnează boolean.
 * Capabilitățile pt. felia People (§5.6). Extensibil aditiv.
 */
async function can(req, capability) {
  const access = resolvePcAccess(req);
  if (access === "total") return true;
  if (access === "partial") return PARTIAL_CAPS.has(capability);
  return BASIC_CAPS.has(capability); // basic
}

/** Middleware: blochează ruta dacă userul n-are capabilitatea. */
function requireCan(capability) {
  return async (req, res, next) => {
    try {
      if (await can(req, capability)) return next();
      return res.status(403).json({ error: "Nu ai permisiunea necesară pentru această acțiune." });
    } catch (err) {
      console.error("[pc] requireCan error:", err.message);
      return res.status(500).json({ error: "Eroare la verificarea permisiunilor." });
    }
  };
}

module.exports = {
  PP_RANK,
  SM_RANK,
  atLeast,
  resolvePcAccess,
  pcTitles,
  resolveEffective,
  getDefaults,
  can,
  requireCan,
};
