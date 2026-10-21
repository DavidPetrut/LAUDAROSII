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

export function paginateLines(lines, { fontSize = 16, keepSections = false } = {}) {
  const pages = [];
  let cur = [];
  let h = 0;
  const trimTrailingEmpty = () => { while (cur.length && cur[cur.length - 1].kind === "empty") { h -= lineCost(cur[cur.length - 1], fontSize); cur.pop(); } };
  const breakPage = () => { trimTrailingEmpty(); pages.push(cur); cur = []; h = 0; };

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    // keepSections (Words/Lyrics): o secțiune (cap + versurile ei) nu se rupe între pagini.
    // Dacă blocul nu încape în restul paginii (și încape pe una întreagă), îl mutăm TOT pe pagina următoare.
    if (keepSections && ln.kind === "section" && cur.length) {
      let block = 0;
      for (let j = i; j < lines.length && !(j > i && lines[j].kind === "section"); j++) block += lineCost(lines[j], fontSize);
      if (h + block > PAGE_CONTENT_PT && block <= PAGE_CONTENT_PT) breakPage();
    }
    const c = lineCost(ln, fontSize);
    if (h + c > PAGE_CONTENT_PT && cur.length) breakPage(); // siguranță (și blocuri mai mari decât o pagină)
    cur.push(ln);
    h += c;
  }
  if (cur.length || pages.length === 0) pages.push(cur);
  return pages;
}
