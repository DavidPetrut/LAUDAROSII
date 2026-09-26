const { RolePermission } = require("../models");
const { CAPABILITY_KEYS, LEVEL_RANK } = require("../config/capabilities");

const mapToObj = (m) => {
  if (!m) return {};
  if (m instanceof Map) return Object.fromEntries(m);
  return m;
};

// Nivelul mai mare dintre doua ("edit" bate "view" bate "none"/undefined)
const maxLevel = (a, b) => {
  const ra = LEVEL_RANK[a] || 0;
  const rb = LEVEL_RANK[b] || 0;
  const r = Math.max(ra, rb);
  return r === 2 ? "edit" : r === 1 ? "view" : "none";
};

/**
 * Rezolva accesul efectiv al unui user (rol + acordari individuale).
 * Super-admin => "edit" pe tot (bypass). Intoarce o harta cheie -> nivel doar cu
 * capabilitatile cu nivel > none.
 */
async function resolveAccess(userDoc) {
  if (!userDoc) return {};
  if (userDoc.role === "superadmin") {
    const all = {};
    CAPABILITY_KEYS.forEach((k) => (all[k] = "edit"));
    return all;
  }

  const rolePerm = await RolePermission.findOne({ role: userDoc.role }).lean();
  const base = mapToObj(rolePerm?.perms);
  const grants = mapToObj(userDoc.access?.grants);

  const eff = {};
  CAPABILITY_KEYS.forEach((k) => {
    const lv = maxLevel(base[k], grants[k]);
    if (lv !== "none") eff[k] = lv;
  });
  return eff;
}

// Verifica daca harta efectiva atinge nivelul minim cerut pentru o cheie
function hasAccess(effMap, key, minLevel = "edit") {
  const lv = effMap[key] || "none";
  return (LEVEL_RANK[lv] || 0) >= (LEVEL_RANK[minLevel] || 0);
}

module.exports = { resolveAccess, hasAccess, maxLevel };
