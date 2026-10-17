/**
 * AI Gateway (§10) — un singur punct de intrare server-side pentru orice feature AI.
 * Provider-agnostic (default Claude / Anthropic). Cheia din env: ANTHROPIC_API_KEY.
 * Model configurabil: PC_AI_MODEL (default „claude-sonnet-5-5").
 *
 * NU expunem cheia către client. Clientul cheamă /api/pc/v1/ai/run; aici rulează, cu authz.
 * Audit/buget (pc_aiRuns / pc_aiConfig) = seam (de adăugat): acum logăm minimal.
 */
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function isConfigured() { return !!process.env.ANTHROPIC_API_KEY; }

/** Promptul de sistem per acțiune. Extensibil (fiecare feature își declară acțiunile). */
function buildMessages({ action, prompt, context }) {
  if (action === "transform-lyrics") {
    const selected = String(context?.selected || "");
    const system =
      "Ești un asistent care editează versuri de cântece de închinare în română. " +
      "Primești un fragment de text și o instrucțiune. Întoarce DOAR textul modificat, fără explicații, " +
      "fără ghilimele în plus. Păstrează împărțirea pe rânduri. NU modifica acordurile din paranteze pătrate " +
      "(ex. [C], [Am], [F#m7]) și nici tag-urile <b>/<i>/<u>; lasă-le exact unde sunt.";
    const user = `Instrucțiune: ${prompt}\n\nText:\n${selected}`;
    return { system, user };
  }
  // generic
  return { system: "Ești un asistent util. Răspunde concis, în română.", user: String(prompt || "") };
}

async function run({ feature = "web", action = "generic", prompt = "", context = {} } = {}) {
  if (!isConfigured()) {
    return { ok: false, notConfigured: true, message: "AI neconfigurat pe server: adaugă ANTHROPIC_API_KEY în env (Render).", text: "" };
  }
  const model = process.env.PC_AI_MODEL || "claude-sonnet-5-5";
  const { system, user } = buildMessages({ action, prompt, context });
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: 1500, system, messages: [{ role: "user", content: user }] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[pc] ai error:", res.status, data?.error?.message || "");
      return { ok: false, message: `AI: ${data?.error?.message || res.status}`, text: "" };
    }
    const text = Array.isArray(data?.content) ? data.content.map((b) => b.text || "").join("").trim() : "";
    console.log(`[pc] ai run feature=${feature} action=${action} model=${model} ok`);
    return { ok: true, text, message: "" };
  } catch (err) {
    console.error("[pc] ai run exception:", err.message);
    return { ok: false, message: "Eroare la AI: " + err.message, text: "" };
  }
}

module.exports = { run, isConfigured };
