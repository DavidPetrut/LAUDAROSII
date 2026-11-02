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

async function callMessages(model, system, user, extra = {}) {
  const res = await fetch(`${BASE}/messages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ model, max_tokens: 8192, system, messages: [{ role: "user", content: user }], ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/* ───────── TOOL-USE (§5.5): catalog de acțiuni → tools Claude → proposedActions ─────────
   AI-ul NU execută nimic; întoarce DOAR propuneri (surfaceId+actionId+args). Omul confirmă (Aplică). */

// Param-schema simplu („string" | "number" | "boolean" | "object", sufix „?" = opțional) → JSON Schema.
function paramsToSchema(params) {
  const properties = {}; const required = [];
  for (const [k, v] of Object.entries(params || {})) {
    const t = String(v || "string"); const optional = t.endsWith("?"); const base = t.replace(/\?$/, "");
    const type = base === "number" ? "number" : base === "boolean" ? "boolean" : base === "object" ? "object" : "string";
    properties[k] = { type };
    if (!optional) required.push(k);
  }
  return { type: "object", properties, required };
}

// Catalogul (live) de acțiuni → tools Claude. Nume neutru `act_i` (evită puncte/caractere invalide); map înapoi.
function buildTools(actions) {
  const tools = []; const map = {};
  (actions || []).forEach((a, i) => {
    if (!a || !a.surfaceId || !a.actionId) return;
    const name = `act_${i}`;
    map[name] = { surfaceId: a.surfaceId, actionId: a.actionId, label: a.label || a.actionId };
    tools.push({ name, description: `${a.label || a.actionId}${a.description ? " — " + a.description : ""}`, input_schema: paramsToSchema(a.params) });
  });
  return { tools, map };
}

function rulesToText(rules) {
  const lines = [];
  for (const r of (rules || [])) {
    if (!r) continue;
    if (typeof r === "string") { lines.push("- " + r); continue; }
    const when = r.when ? `(${r.when}) ` : "";
    const ex = (r.example_in || r.example_out) ? ` [ex: ${r.example_in || "?"} → ${r.example_out || "?"}]` : "";
    lines.push(`- ${when}${r.rule || ""}${ex}`);
  }
  return lines.join("\n");
}

// Lecțiile învățate (👍/👎) → text pt. system prompt. 👎 = „nu face așa", 👍 = „așa e bine".
function lessonsToText(lessons) {
  const good = []; const bad = [];
  for (const l of (lessons || [])) {
    if (!l) continue;
    const where = l.actionLabel ? ` [${l.actionLabel}]` : "";
    const cmd = l.command ? `„${l.command}"` : "";
    const why = l.note ? ` — ${l.note}` : "";
    const line = `${cmd}${where}${why}`.trim();
    if (!line) continue;
    (l.verdict === "down" ? bad : good).push("- " + line);
  }
  const parts = [];
  if (bad.length) parts.push("NU face așa (corecții învățate):\n" + bad.join("\n"));
  if (good.length) parts.push("Așa e bine (confirmări):\n" + good.join("\n"));
  return parts.join("\n\n");
}

function buildProposeSystem(rules, lessons) {
  const base =
    "Ești asistentul unui editor de cântece de închinare (Mashup Studio), în română. " +
    "Utilizatorul îți dă o COMANDĂ despre melodia de pe ecran. Tradu comanda în UNA SAU MAI MULTE apeluri de unelte " +
    "(fiecare unealtă = o acțiune reală din editor). NU explica pașii — apelează uneltele. Folosește `id`-urile blocurilor din context. " +
    "NU face nimic ce nu ți se cere. Dacă cererea e ambiguă sau imposibilă cu uneltele, NU apela nimic și răspunde scurt ce lipsește.";
  const rt = rulesToText(rules);
  const lt = lessonsToText(lessons);
  let out = base;
  if (rt) out += `\n\nReguli (respectă-le strict):\n${rt}`;
  if (lt) out += `\n\nLecții din feedback-ul echipei (ține cont de ele):\n${lt}`;
  return out;
}

function buildProposeUser(prompt, context) {
  let ctx = "";
  try { ctx = JSON.stringify(context || {}); } catch { ctx = "{}"; }
  // Buget generos: modelele au ferestre mari, iar contextul unui editor (blocuri+versuri) trebuie să ajungă ÎNTREG.
  if (ctx.length > 60000) ctx = ctx.slice(0, 60000) + "…(trunchiat)";
  return `Contextul de pe ecran (ce vede editorul acum):\n\`\`\`json\n${ctx}\n\`\`\`\n\nComanda utilizatorului: ${String(prompt || "")}`;
}

async function propose({ prompt = "", context = {}, actions = [], rules = [], lessons = [] } = {}) {
  if (!isConfigured()) {
    return { ok: false, notConfigured: true, message: "AI neconfigurat pe server: adaugă ANTHROPIC_API_KEY în env (Render).", proposedActions: [] };
  }
  const { tools, map } = buildTools(actions);
  if (!tools.length) return { ok: false, message: "Nicio acțiune disponibilă pentru AI pe acest ecran.", proposedActions: [] };
  const system = buildProposeSystem(rules, lessons);
  const user = buildProposeUser(prompt, context);
  const extra = { tools, tool_choice: { type: "auto" }, max_tokens: 4096 };
  let model = process.env.PC_AI_MODEL || CHEAP_PREFERENCE[0];
  try {
    let { res, data } = await callMessages(model, system, user, extra);
    if (!res.ok && isModelError(res.status, data)) {
      const ms = await listModels(true);
      const cheapAvailable = CHEAP_PREFERENCE.find((m) => ms.includes(m));
      if (cheapAvailable && cheapAvailable !== model) { model = cheapAvailable; ({ res, data } = await callMessages(model, system, user, extra)); }
    }
    if (!res.ok) {
      console.error("[pc] ai propose error:", res.status, data?.error?.message || "");
      return { ok: false, message: `AI (${res.status}): ${data?.error?.message || data?.error?.type || "necunoscut"} [model ${model}]`, proposedActions: [] };
    }
    const blocks = Array.isArray(data?.content) ? data.content : [];
    const proposedActions = []; let text = "";
    for (const b of blocks) {
      if (b.type === "text") text += b.text || "";
      else if (b.type === "tool_use") { const m = map[b.name]; if (m) proposedActions.push({ surfaceId: m.surfaceId, actionId: m.actionId, args: b.input || {}, label: m.label }); }
    }
    console.log(`[pc] ai propose model=${model} ok (${proposedActions.length} acțiuni, ${text.length} chars text)`);
    return { ok: true, message: text.trim(), proposedActions, model };
  } catch (err) {
    console.error("[pc] ai propose exception:", err.message);
    return { ok: false, message: "Eroare la AI: " + err.message, proposedActions: [] };
  }
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

module.exports = { run, propose, isConfigured };
