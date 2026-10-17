/**
 * Paginare comună (preview ȘI PDF folosesc ACEEAȘI logică → arată identic).
 * Împarte liniile randate (renderChordPro) în pagini A4, ca să nu se înghesuie (cerința D).
 * Fiecare pagină primește ACELAȘI header (titlu/gamă/bpm/metru + aranjament + sequence).
 */
// Înălțimea utilă a unei pagini A4 (pt), după header (~92) și marginea de jos (~40). A4 = 842pt.
export const PAGE_CONTENT_PT = 710;

export function lineCost(ln, lineH) {
  if (ln.kind === "row") return (ln.chordRow ? lineH * 2.08 : lineH * 1.08);
  if (ln.kind === "section") return lineH * 1.3;
  return lineH; // empty
}

/** Întoarce un array de pagini; fiecare pagină = array de linii. */
export function paginateLines(lines, { fontSize = 14 } = {}) {
  const lineH = Math.max(12, fontSize * 1.4);
  const pages = [];
  let cur = [];
  let h = 0;
  for (const ln of lines) {
    const c = lineCost(ln, lineH);
    if (h + c > PAGE_CONTENT_PT && cur.length) { pages.push(cur); cur = []; h = 0; }
    cur.push(ln);
    h += c;
  }
  if (cur.length || pages.length === 0) pages.push(cur);
  return pages;
}
