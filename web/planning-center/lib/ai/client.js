/**
 * Client pentru AI Gateway-ul server-side (§10.1): POST /api/pc/v1/ai/run.
 * Provider-agnostic (default Claude) — web-ul NU vorbește direct cu niciun provider AI;
 * trece prin gateway, care aplică authz + buget + audit.
 *
 * Contract (seam): { feature, action, prompt, context, actions } ->
 *   { ok, message, proposedActions: [{ surfaceId, actionId, args, label }], raw }
 *
 * Până când gateway-ul e complet pe server, întoarce un rezultat „not-wired" curat,
 * ca UI-ul să nu crape (poarta există, feature-ul se umple „as we go").
 */
import { api } from "@/lib/api/client";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runAi({ feature = "web", action = "command", prompt, context, actions }) {
  // Până la 2 reîncercări pt. erori tranzitorii (cold-start Render / rețea / 5xx).
  let last = { ok: false, message: "Eroare AI." };
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1200);
    try {
      const res = await api.raw("/api/pc/v1/ai/run", { method: "POST", body: { feature, action, prompt, context, actions }, raw: true });
      if (res.status === 404 || res.status === 502 || res.status === 503 || res.status === 504) {
        last = { ok: false, message: "Serverul AI pornește (cold-start) — reîncerc…", proposedActions: [] };
        continue; // retry
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: data?.message || data?.error || `Eroare ${res.status}`, proposedActions: [], raw: data };
      return { ok: true, message: data.message || "", proposedActions: data.proposedActions || [], raw: data };
    } catch (e) {
      last = { ok: false, message: String(e?.message || e), proposedActions: [] };
      // retry pe erori de rețea
    }
  }
  return last;
}
