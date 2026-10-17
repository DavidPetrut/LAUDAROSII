/**
 * Paginare comună (preview ȘI PDF) → pagini A4, header repetat (cerința D).
 * Metrici aliniate cu randarea din pdf.js ca împărțirea să fie corectă (fără gol mare jos).
 */
export const PAGE_CONTENT_PT = 708; // A4 842pt - header(~104) - margine jos(~30)

export function lineCost(ln, fs) {
  if (ln.kind === "section") return fs * 2.25;
  if (ln.kind === "empty") return fs * 0.9;
  // row
  const chord = ln.chordRow ? fs * 1.12 : 0;
  const lyric = (ln.lyricRow && ln.lyricRow.replace(/<\/?[biu]>/gi, "").trim()) || !ln.chordRow ? fs * 1.45 : 0;
  return chord + lyric;
}

export function paginateLines(lines, { fontSize = 16 } = {}) {
  const pages = [];
  let cur = [];
  let h = 0;
  for (const ln of lines) {
    const c = lineCost(ln, fontSize);
    if (h + c > PAGE_CONTENT_PT && cur.length) { pages.push(cur); cur = []; h = 0; }
    cur.push(ln);
    h += c;
  }
  if (cur.length || pages.length === 0) pages.push(cur);
  return pages;
}
