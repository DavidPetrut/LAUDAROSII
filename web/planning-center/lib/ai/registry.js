/**
 * AI REGISTRY (global) — inima cerinței „AI peste tot" (§10 din arhitectură).
 *
 * Ideea: NU hardcodăm AI în fiecare ecran. În schimb, fiecare ecran/componentă își
 * ÎNREGISTREAZĂ o „suprafață" (surface) cu:
 *   - getContext(): ce VEDE AI-ul acolo (state-ul relevant: ce piesă, ce aranjament,
 *                   ce filtre, ce e pe ecran) — „AI-ul vede fiecare variabilă".
 *   - actions[]:    ce POATE FACE AI-ul acolo (fiecare acțiune = funcție validată, care
 *                   trece prin ACELEAȘI API ca un click uman — AI nu ocolește nimic).
 *
 * Gateway-ul AI (server) primește contextul agregat + catalogul de acțiuni și PROPUNE;
 * omul CONFIRMĂ; apoi executăm acțiunile prin `run()`. Human-in-the-loop (§10.1).
 *
 * E un simplu store observabil (fără dependințe), ca să poată fi citit de oriunde
 * (nu doar din React). Un singur loc — zero „15 implementări diferite".
 */
const surfaces = new Map(); // id -> surface
const listeners = new Set();

function emit() { listeners.forEach((fn) => { try { fn(); } catch { /* noop */ } }); }

export function registerSurface(surface) {
  if (!surface || !surface.id) return () => {};
  surfaces.set(surface.id, surface);
  emit();
  return () => { surfaces.delete(surface.id); emit(); };
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function listSurfaces() { return [...surfaces.values()]; }

/** Snapshot al a tot ce „vede" AI-ul acum pe ecran (toate suprafețele active). */
export function snapshotContext() {
  const out = {};
  for (const s of surfaces.values()) {
    try { out[s.id] = { label: s.label || s.id, scope: s.scope || "component", context: s.getContext ? s.getContext() : null }; }
    catch (e) { out[s.id] = { label: s.label || s.id, error: String(e?.message || e) }; }
  }
  return out;
}

/** Catalogul de acțiuni disponibile acum (metadate, FĂRĂ funcții — pt. trimis la gateway). */
export function catalogActions() {
  const out = [];
  for (const s of surfaces.values()) {
    for (const a of s.actions || []) {
      out.push({ surfaceId: s.id, actionId: a.id, label: a.label, description: a.description || "", params: a.params || null });
    }
  }
  return out;
}

/** Execută o acțiune propusă (surfaceId + actionId + args). Întoarce rezultatul lui run(). */
export async function runAction(surfaceId, actionId, args) {
  const s = surfaces.get(surfaceId);
  const a = s?.actions?.find((x) => x.id === actionId);
  if (!a || typeof a.run !== "function") throw new Error(`Acțiune necunoscută: ${surfaceId}.${actionId}`);
  return a.run(args || {});
}
