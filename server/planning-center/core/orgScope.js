/**
 * Org-scoping seam (invariant §1.13 + §14.6.A) — „portița deschisă" spre multi-tenant.
 *
 * ACUM: single-org per deployment. Există UN singur pc_org; îl rezolvăm o dată și-l cache-uim.
 * MÂINE (dacă vrei multi-tenant): schimbi DOAR `resolveOrgId` ca să citească org-ul din
 *   subdomeniu/header/JWT — restul codului (care primește `req.pcOrgId` + folosește `scoped`)
 *   rămâne NESCHIMBAT. Flip-a-switch, zero retrofit.
 *
 * REGULĂ: nicio citire/scriere pc_ nu se face fără orgId. Tot trece prin helperele de aici.
 */

let cachedDefaultOrgId = null;

/** Invalidează cache-ul (ex. după seed/reset). */
function clearOrgCache() {
  cachedDefaultOrgId = null;
}

/**
 * Rezolvă org-ul curent. Single-org: primul pc_org ne-șters.
 * Dacă nu există, îl creează prin seed (bootstrap idempotent).
 */
async function resolveOrgId() {
  if (cachedDefaultOrgId) return cachedDefaultOrgId;
  const PcOrg = require("../models/PcOrg");
  let org = await PcOrg.findOne({ deletedAt: null }).sort({ createdAt: 1 }).select("_id");
  if (!org) {
    const { ensureBootstrap } = require("../services/seed");
    org = await ensureBootstrap();
  }
  cachedDefaultOrgId = org._id;
  return cachedDefaultOrgId;
}

/**
 * Middleware Express: pune `req.pcOrgId` pe fiecare request din modul.
 * Toate rutele pc_ îl folosesc (montat o dată în routes/index.js).
 */
async function orgScope(req, res, next) {
  try {
    req.pcOrgId = await resolveOrgId();
    if (!req.pcOrgId) return res.status(500).json({ error: "Planning Center: org neinițializat" });
    next();
  } catch (err) {
    console.error("[pc] orgScope error:", err.message);
    res.status(500).json({ error: "Planning Center: eroare la rezolvarea organizației" });
  }
}

/**
 * Adaugă orgId + filtrul soft-delete la ORICE filtru de citire.
 * Folosește-l peste tot: `Model.find(scoped(req, { lastName: ... }))`.
 */
function scoped(req, filter = {}) {
  return { orgId: req.pcOrgId, deletedAt: null, ...filter };
}

/**
 * Ștampilează orgId pe un document NOU înainte de create.
 * `new Model(stamp(req, { ... }))`.
 */
function stamp(req, doc = {}) {
  return { ...doc, orgId: req.pcOrgId };
}

module.exports = { orgScope, scoped, stamp, resolveOrgId, clearOrgCache };
