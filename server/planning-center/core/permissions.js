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
  "people.view", "people.viewAll", "people.assignTags", "people.manageBlocks", "people.roster",
  "services.manageServiceTypes", "services.addPlan", "services.editOrder", "services.schedule",
  "services.viewMatrix", "services.assign", "services.move", "services.editNeeded",
  "services.blockouts", "services.manageTeams", "services.positionRules",
  "songs.edit", "songs.import", "media.edit", "reports.view", "whatsapp.manage",
]);
// „basic" — doar vizualizare: vede directorul de oameni (toți), citește planuri/songs/media, își vede
// propriul schedule și răspunde la propriile programări. NU editează nimic.
const BASIC_CAPS = new Set(["people.view", "people.viewAll"]);

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
 * Setul EFECTIV de capabilități (cache pe req). „ALL" = acces total (super-admin/developer).
 * Altfel = UNION: capabilități de bază + „planningAdmin" (dacă e) + capabilitățile tuturor
 * rolurilor CUSTOM (pc_roles) pe care le are userul în extraRoles. Aici se „stacuiesc" rolurile.
 */
async function capabilitySet(req) {
  if (req._pcCaps) return req._pcCaps;
  const role = req.user?.role;
  if (role === "superadmin" || role === "developer") { req._pcCaps = "ALL"; return "ALL"; }
  const set = new Set(BASIC_CAPS);
  const extra = Array.isArray(req.user?.extraRoles) ? req.user.extraRoles : [];
  if (extra.includes("planningAdmin")) PARTIAL_CAPS.forEach((c) => set.add(c)); // rolul pre-creat
  if (extra.length && req.pcOrgId) {
    try {
      const PcRole = require("../models/PcRole");
      const roles = await PcRole.find({ orgId: req.pcOrgId, key: { $in: extra }, deletedAt: null }).select("capabilities").lean();
      roles.forEach((r) => (r.capabilities || []).forEach((c) => set.add(c)));
    } catch (e) { /* fără roluri custom disponibile → doar capabilitățile de bază */ }
  }
  req._pcCaps = set;
  return set;
}

/**
 * Rezolvă permisiunea efectivă (cache pe req). Derivată din UNION-ul de capabilități
 * (bază + roluri custom), ca „pcAccess"/niveluri să rămână coerente pentru UI (/me).
 */
async function resolveEffective(req) {
  if (req._pcPerm) return req._pcPerm;
  const caps = await capabilitySet(req);
  const all = caps === "ALL";
  const has = (c) => all || caps.has(c);
  let access = "basic";
  if (all) access = "total";
  else if (caps.size > BASIC_CAPS.size) access = "partial"; // are cel puțin un rol custom / planningAdmin
  const peoplePlansLevel = all ? "orgAdmin"
    : (has("people.managePermissions") || has("people.create")) ? "administrator"
      : (has("services.editOrder") || has("services.manageServiceTypes")) ? "editor"
        : has("services.schedule") ? "scheduler"
          : "viewer";
  const eff = {
    pcAccess: access,
    peoplePlansLevel,
    songLevel: all ? "administrator" : has("songs.edit") ? "editor" : "viewer",
    mediaLevel: all ? "administrator" : has("media.edit") ? "editor" : "viewer",
    fileAccess: { plan: access !== "basic", song: access !== "basic", media: access !== "basic" },
    isOrgAdmin: all,
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
  const caps = await capabilitySet(req);
  if (caps === "ALL") return true;
  return caps.has(capability);
}

/** Are userul CEL PUȚIN UNA din capabilități? (pt. granular + umbrella, ex. assign SAU schedule). */
async function canAny(req, capabilities) {
  const caps = await capabilitySet(req);
  if (caps === "ALL") return true;
  return (capabilities || []).some((c) => caps.has(c));
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

/** Middleware: trece dacă userul are ORICARE din capabilitățile date (granular SAU umbrella). */
function requireAny(...capabilities) {
  const list = capabilities.flat();
  return async (req, res, next) => {
    try {
      if (await canAny(req, list)) return next();
      return res.status(403).json({ error: "Nu ai permisiunea necesară pentru această acțiune." });
    } catch (err) {
      console.error("[pc] requireAny error:", err.message);
      return res.status(500).json({ error: "Eroare la verificarea permisiunilor." });
    }
  };
}

// Grupuri de capabilități pt. gating (umbrella + granular). „services.schedule" = tot ce ține de planificare.
const CAN_VIEW_MATRIX = ["services.viewMatrix", "services.assign", "services.move", "services.editNeeded", "services.blockouts", "services.schedule", "services.manageTeams"];
const CAN_ASSIGN = ["services.assign", "services.schedule"];
const CAN_MOVE = ["services.move", "services.assign", "services.schedule"];
const CAN_NEEDED = ["services.editNeeded", "services.schedule"];
const CAN_ROSTER = ["people.roster", "services.assign", "services.schedule"];
const CAN_MANAGE_TEAMS = ["services.manageTeams", "services.manageServiceTypes"];
const CAN_POSITION_RULES = ["services.positionRules", "services.manageServiceTypes", "services.schedule"];
const CAN_BLOCKOUTS = ["services.blockouts", "people.manageBlocks", "services.schedule"];
const CAN_SONG_IMPORT = ["songs.import", "songs.edit"];

module.exports = {
  PP_RANK,
  SM_RANK,
  atLeast,
  resolvePcAccess,
  capabilitySet,
  pcTitles,
  resolveEffective,
  getDefaults,
  can,
  canAny,
  requireCan,
  requireAny,
  CAN_VIEW_MATRIX,
  CAN_ASSIGN,
  CAN_MOVE,
  CAN_NEEDED,
  CAN_ROSTER,
  CAN_MANAGE_TEAMS,
  CAN_POSITION_RULES,
  CAN_BLOCKOUTS,
  CAN_SONG_IMPORT,
};
