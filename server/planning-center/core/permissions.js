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

/**
 * Rezolvă permisiunea efectivă a userului care face requestul (cache pe req).
 * Returnează { peoplePlansLevel, songLevel, mediaLevel, fileAccess, isOrgAdmin }.
 */
async function resolveEffective(req) {
  if (req._pcPerm) return req._pcPerm;

  const { scoped } = require("./orgScope");
  const PcPermission = require("../models/PcPermission");
  const PcServicesDefaults = require("../models/PcServicesDefaults");

  // Nivel de pornire din rolul app (bridge).
  const bridge = APP_ROLE_TO_PP[req.user?.role] || "viewer";

  // Permisiuni explicite pe scope global (dacă există, au prioritate / le ridicăm la max cu bridge-ul).
  const perm = await PcPermission.findOne(
    scoped(req, { userId: req.user.id, scope: "global" })
  ).lean();

  const pick = (stored, fallback, rankMap) => {
    if (!stored) return fallback;
    // nivelul efectiv = maximul dintre bridge și cel stocat (nu coborâm sub rolul app)
    return (rankMap[stored] ?? -1) >= (rankMap[fallback] ?? -1) ? stored : fallback;
  };

  const peoplePlansLevel = pick(perm?.peoplePlansLevel, bridge, PP_RANK);
  const songFallback = bridge === "scheduler" ? "viewer" : bridge; // song n-are scheduler
  const songLevel = pick(perm?.songLevel, SM_RANK[songFallback] != null ? songFallback : "viewer", SM_RANK);
  const mediaLevel = pick(perm?.mediaLevel, SM_RANK[songFallback] != null ? songFallback : "viewer", SM_RANK);

  const eff = {
    peoplePlansLevel,
    songLevel,
    mediaLevel,
    fileAccess: perm?.fileAccess || { plan: false, song: false, media: false },
    isOrgAdmin: peoplePlansLevel === "orgAdmin",
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
  const eff = await resolveEffective(req);
  const lvl = eff.peoplePlansLevel;
  if (eff.isOrgAdmin) return true;
  const def = await getDefaults(req);

  switch (capability) {
    case "people.view": // vezi pagina People
      return atLeast(lvl, "viewer");
    case "people.viewAll": // vezi TOȚI oamenii (nu doar echipele proprii)
      return atLeast(lvl, "editor");
    case "people.create":
      return atLeast(lvl, "administrator") || atLeast(lvl, def.whoCanCreatePeople);
    case "people.editContact":
      return atLeast(lvl, "administrator") || atLeast(lvl, def.whoCanEditContactInfo);
    case "people.exportCsv":
      return atLeast(lvl, "editor") || atLeast(lvl, def.whoCanEditContactInfo /* scheduler* */);
    case "people.import":
      return atLeast(lvl, "editor");
    case "people.managePermissions":
      return atLeast(lvl, "administrator");
    case "people.removeArchiveOwn":
      return atLeast(lvl, "editor");
    case "people.removeArchiveAny":
      return atLeast(lvl, "administrator") && atLeast(lvl, def.whoCanDeleteAnything);
    case "people.editTags":
      return atLeast(lvl, "editor");
    default:
      return false;
  }
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
  resolveEffective,
  getDefaults,
  can,
  requireCan,
};
