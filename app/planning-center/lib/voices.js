/**
 * Voci structurate (mobil) — aceleași reguli ca pe web (components/plans/order/VoicesPicker).
 * Roluri lead/support(S)/alto(A)/tenor(T)/soprano/bass; parser description→voci pt. formatul real PCO
 * („Lead: X/Suport vocal:Y+Z/Alto:W" sau „DAVID\nS: Gabi, A: Nao, T: Kati"); formatVoices pt. afișare.
 */
export const VOICE_ROLES = ["lead", "support", "alto", "tenor", "soprano", "bass", "custom"];
export const ROLE_META = [
  { k: "lead", l: "Lead", s: "" },
  { k: "support", l: "Suport", s: "S" },
  { k: "alto", l: "Alto", s: "A" },
  { k: "tenor", l: "Tenor", s: "T" },
  { k: "soprano", l: "Soprano", s: "Sop" },
  { k: "bass", l: "Bass", s: "B" },
];
export const BASE_ROLES = ["lead", "support", "alto", "tenor"];

const ROLE_PATS = [
  { role: "lead", rx: /^(lead|solist|voce\s*principal[ăa]?|vp)$/i },
  { role: "support", rx: /^(suport(\s*vocal)?|support|s)$/i },
  { role: "alto", rx: /^(alto?|a)$/i },
  { role: "tenor", rx: /^(tenor|t)$/i },
  { role: "soprano", rx: /^(soprano|soprana|sop)$/i },
  { role: "bass", rx: /^(bass?|bas|b)$/i },
];
const splitNames = (s) => s.split(/[+,&]|\bși\b|\bsi\b/i).map((x) => x.trim()).filter(Boolean);

export function parseVoicesText(text) {
  if (!text) return [];
  const top = text.split(/\n\s*\n/)[0] || text;
  const chunks = top.split(/[\/\n]/).map((c) => c.trim()).filter(Boolean);
  const out = [];
  let sawLabel = false;
  for (const chunk of chunks) {
    const subs = chunk.split(/,\s*(?=[A-Za-zĂÂÎȘȚăâîșț]{1,14}\s*:)/);
    for (const sub of subs) {
      const ci = sub.indexOf(":");
      if (ci > -1) {
        const label = sub.slice(0, ci).trim();
        const rest = sub.slice(ci + 1).trim();
        const m = ROLE_PATS.find((p) => p.rx.test(label));
        if (m && rest) { sawLabel = true; for (const n of splitNames(rest)) out.push({ role: m.role, name: n }); continue; }
      }
      if (!sawLabel && !out.length && !sub.includes(":")) for (const n of splitNames(sub)) out.push({ role: "lead", name: n });
    }
  }
  return out;
}

export function formatVoices(voices = []) {
  if (!voices.length) return "";
  const order = ["lead", "support", "alto", "tenor", "soprano", "bass", "custom"];
  const label = { support: "S", alto: "A", tenor: "T", soprano: "Sop", bass: "B" };
  const byRole = {};
  for (const v of voices) { (byRole[v.role] = byRole[v.role] || []).push(v.name); }
  const parts = [];
  for (const r of order) {
    if (!byRole[r]) continue;
    const names = byRole[r].join(", ");
    parts.push(r === "lead" ? names.toUpperCase() : `${label[r] || r}: ${names}`);
  }
  return parts.join(" · ");
}
