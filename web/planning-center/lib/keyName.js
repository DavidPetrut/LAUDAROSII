/**
 * Conversie gamă (notație acorduri → „Gamă" în română, pt. echipă).
 * „C" → „Do major", „Am" → „La minor", „F#m" → „Fa diez minor", „Bb" → „Si bemol major".
 * Suportă tranziții de gamă: „G→A" / „G->A" → „Sol major → La major". Necunoscutul se întoarce ca atare.
 */
const NOTE_RO = { C: "Do", D: "Re", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };

function convOne(tok) {
  const t = String(tok || "").trim();
  if (!t) return "";
  const m = t.match(/^([A-Ga-g])([#b♯♭]?)\s*(m|min|minor|-)?\b/);
  if (!m) return t; // nu e o gamă standard → lasă textul
  const note = NOTE_RO[m[1].toUpperCase()] || m[1];
  const acc = m[2] === "#" || m[2] === "♯" ? " diez" : (m[2] === "b" || m[2] === "♭") ? " bemol" : "";
  const minor = m[3] && m[3].toLowerCase() !== "" ? /^(m|min|minor|-)$/i.test(m[3]) : false;
  return `${note}${acc} ${minor ? "minor" : "major"}`;
}

export function keyToRo(raw) {
  if (!raw) return "";
  const parts = String(raw).split(/\s*(?:→|->|=>)\s*/).filter(Boolean);
  if (parts.length <= 1) return convOne(raw);
  return parts.map(convOne).join(" → ");
}
