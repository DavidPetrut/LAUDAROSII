/**
 * AI Gateway (§10) — punct unic server-side. Provider-agnostic (default Claude / Anthropic).
 * Env: ANTHROPIC_API_KEY (obligatoriu), ANTHROPIC_WORKSPACE_ID (pt. chei org-scoped), PC_AI_MODEL (opțional).
 *
 * AUTO-DESCOPERIRE MODEL: dacă PC_AI_MODEL nu e setat (sau e respins), întrebăm /v1/models ce modele
 * are cheia și folosim automat cel mai nou. Așa nu mai „ghicim" id-ul de model.
 */
const BASE = "https://api.anthropic.com/v1";

function isConfigured() { return !!process.env.ANTHROPIC_API_KEY; }

function authHeaders() {
  const h = {
    "content-type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  };
  if (process.env.ANTHROPIC_WORKSPACE_ID) h["anthropic-workspace-id"] = process.env.ANTHROPIC_WORKSPACE_ID;
  return h;
}

let modelsCache = null;
async function listModels(force = false) {
  if (modelsCache && !force) return modelsCache;
  try {
    const r = await fetch(`${BASE}/models?limit=50`, { headers: authHeaders() });
    const d = await r.json().catch(() => ({}));
    if (r.ok && Array.isArray(d.data)) modelsCache = d.data.map((m) => m.id);
  } catch { /* ignoră */ }
  return modelsCache || [];
}

function buildMessages({ action, prompt, context }) {
  if (action === "transform-lyrics") {
    const selected = String(context?.selected || "");
    const system =
      "Ești un asistent care editează versuri de cântece de închinare în română. " +
      "Primești un fragment de text și o instrucțiune. Întoarce DOAR textul modificat, fără explicații, " +
      "fără ghilimele în plus. Păstrează împărțirea pe rânduri. NU modifica acordurile din paranteze pătrate " +
      "(ex. [C], [Am], [F#m7]) și nici tag-urile <b>/<i>/<u>; lasă-le exact unde sunt.";
    return { system, user: `Instrucțiune: ${prompt}\n\nText:\n${selected}` };
  }
  return { system: "Ești un asistent util. Răspunde concis, în română.", user: String(prompt || "") };
}

async function callMessages(model, system, user) {
  const res = await fetch(`${BASE}/messages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ model, max_tokens: 8192, system, messages: [{ role: "user", content: user }] }),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

const isModelError = (status, data) => status === 404 || /model/i.test(data?.error?.message || "") || data?.error?.type === "not_found_error";

// IMPORTANT (cost): folosim DOAR modele ieftine, cel mai ieftin întâi. NU alegem automat
// Opus/Fable/Mythos (scumpe). Haiku 5.5 = cel mai ieftin ($0.10/$0.50 per MTok).
const CHEAP_PREFERENCE = [
  "claude-haiku-5-5", "claude-haiku-4-5",
  "claude-3-5-haiku-latest", "claude-3-5-haiku-20241022",
  "claude-sonnet-5-5", "claude-sonnet-5", "claude-sonnet-4-5",
];

async function run({ feature = "web", action = "generic", prompt = "", context = {} } = {}) {
  if (!isConfigured()) {
    return { ok: false, notConfigured: true, message: "AI neconfigurat pe server: adaugă ANTHROPIC_API_KEY în env (Render).", text: "" };
  }
  const { system, user } = buildMessages({ action, prompt, context });

  // Model: cel din env (dacă-l setezi explicit), altfel cel mai IEFTIN (Haiku 5.5).
  let model = process.env.PC_AI_MODEL || CHEAP_PREFERENCE[0];

  try {
    let { res, data } = await callMessages(model, system, user);

    // Dacă modelul e respins, alegem cel mai ieftin model DISPONIBIL din preferințe (nu „orice").
    if (!res.ok && isModelError(res.status, data)) {
      const ms = await listModels(true);
      const cheapAvailable = CHEAP_PREFERENCE.find((m) => ms.includes(m));
      if (cheapAvailable && cheapAvailable !== model) {
        model = cheapAvailable;
        ({ res, data } = await callMessages(model, system, user));
      }
      if (!res.ok && isModelError(res.status, data)) {
        return { ok: false, message: ms.length ? `Niciun model ieftin disponibil. Modele în cont: ${ms.slice(0, 8).join(", ")}. Setează PC_AI_MODEL în Render (ex. claude-haiku-5-5).` : "Niciun model AI disponibil pentru această cheie/workspace.", text: "" };
      }
    }

    if (!res.ok) {
      console.error("[pc] ai error:", res.status, data?.error?.message || "");
      return { ok: false, message: `AI (${res.status}): ${data?.error?.message || data?.error?.type || "necunoscut"} [model ${model}]`, text: "" };
    }
    const text = Array.isArray(data?.content) ? data.content.map((b) => b.text || "").join("").trim() : "";
    if (!text) {
      console.error("[pc] ai empty content:", JSON.stringify(data).slice(0, 300));
      return { ok: false, message: `AI a răspuns gol (model ${model}, stop: ${data?.stop_reason || "?"}). Reîncearcă.`, text: "" };
    }
    console.log(`[pc] ai run feature=${feature} action=${action} model=${model} ok (${text.length} chars)`);
    return { ok: true, text, message: "", model };
  } catch (err) {
    console.error("[pc] ai run exception:", err.message);
    return { ok: false, message: "Eroare la AI: " + err.message, text: "" };
  }
}

module.exports = { run, isConfigured };
