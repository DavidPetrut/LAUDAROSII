/**
 * Parser PDF PCO → ChordPro.
 *
 * Exporturile PlanningCenter sunt PDF-uri TEXT monospace: acordurile (font bold) stau pe un rând
 * deasupra versului (font normal), aliniate pe coloană. Reconstruim totul din COORDONATE:
 *   - lățimea unui caracter (CW) și marginea stângă (X0) sunt constante → coloana = round((x-X0)/CW);
 *   - fontul acordurilor îl aflăm din etichetele de secțiune (VERSE/CHORUS…), care sunt tot bold;
 *   - în corp, glif-ul „." = spațiu (fontul mapează spațiul pe punct);
 *   - fiecare acord se inserează ca [Acord] fix înaintea silabei din versul de dedesubt
 *     → „Cu[Em7]vântul Viu [Cmaj9]stă pe tron" (identic cu PCO, transpozabil).
 * Metadata (titlu, gamă, BPM, măsură, sequence) vine din header-ul paginii 1.
 */

const SECTION_RE = /^(VERSE|CHORUS|PRE[- ]?CHORUS|POST[- ]?CHORUS|BRIDGE|INTRO|OUTRO|ENDING|INSTRUMENTAL|INTERLUDE|TAG|TURNAROUND|VAMP|REFRAIN|SOLO|CODA|BREAKDOWN|REF|RF|STROFA|REFREN|FINAL|CORO|PUNTE)\b/i;
// Un token e acord? (folosit doar ca filtru fin — fontul face deja 90% din treabă)
const CHORD_RE = /^[A-G][#b]?(?:maj|min|sus|add|aug|dim|m|M)?[0-9]*(?:(?:sus|add|maj|min|aug|dim|m|M|b|#|no)[0-9]*)*(?:\/[A-G][#b]?)?$/;

const dotToSpace = (s) => String(s).replace(/ /g, " ").replace(/\./g, " ");
const isChordTok = (t) => CHORD_RE.test(t) && t.length <= 8;

/** Încarcă pdfjs (ESM) din CommonJS. */
async function loadPdfjs() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

/**
 * @param {Buffer} buffer PDF
 * @returns {Promise<{title,key,bpm,meter,sequence,chordpro,warnings:string[]}>}
 */
async function parsePcoPdf(buffer) {
  const { getDocument } = await loadPdfjs();
  const data = new Uint8Array(buffer);
  const doc = await getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;

  // ── 1. Extrage toate fragmentele cu coordonate ──
  const all = []; // {page,x,y,str,fs,font,w}
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    for (const it of tc.items) {
      if (!it.str) continue;
      all.push({
        page: p,
        x: it.transform[4],
        y: it.transform[5],
        str: it.str,
        fs: Math.hypot(it.transform[0], it.transform[1]),
        font: it.fontName,
        w: it.width,
      });
    }
    page.cleanup?.();
  }

  // ── 2. Geometrie monospace: X0 (margine stg) + CW (lățime char) ──
  const X0 = Math.min(...all.filter((i) => i.str.trim()).map((i) => i.x));
  const widths = all.filter((i) => i.str.trim().length >= 2).map((i) => i.w / i.str.length);
  widths.sort((a, b) => a - b);
  const CW = widths.length ? widths[Math.floor(widths.length / 2)] : 8.4;
  const colOf = (x) => Math.round((x - X0) / CW);

  // ── 3. Fontul acordurilor = fontul etichetelor de secțiune (sunt bold, la fel ca acordurile) ──
  const labelFonts = {};
  for (const it of all) {
    const t = dotToSpace(it.str).trim();
    if (SECTION_RE.test(t)) labelFonts[it.font] = (labelFonts[it.font] || 0) + 1;
  }
  const chordFont = Object.entries(labelFonts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Fonturile „de corp" = MONOSPACE (lățime char ≈ CW pe aproape toate fragmentele).
  // Titlul/sequence (proporțional) și nr. de pagină sunt astfel excluse → nu scapă în corp.
  const perFont = {};
  for (const it of all) {
    if (it.str.trim().length < 2) continue;
    (perFont[it.font] ||= { n: 0, near: 0 });
    perFont[it.font].n++;
    if (Math.abs(it.w / it.str.length - CW) < 0.6) perFont[it.font].near++;
  }
  const bodyFonts = new Set(
    Object.entries(perFont).filter(([, v]) => v.n >= 4 && v.near / v.n >= 0.7).map(([f]) => f)
  );
  if (chordFont) bodyFonts.add(chordFont);
  // fontul versurilor = font de corp ≠ fontul acordurilor
  const lyricFonts = new Set([...bodyFonts].filter((f) => f !== chordFont));

  const warnings = [];
  if (!chordFont) warnings.push("N-am putut identifica fontul acordurilor (nicio etichetă de secțiune).");

  // ── 4. Metadata din header-ul paginii 1 (fonturi care NU-s de corp) ──
  const headItems = all.filter((i) => i.page === 1 && !bodyFonts.has(i.font) && i.str.trim());
  const meta = extractMeta(headItems);

  // ── 5. Corpul: grupează pe rânduri (pe pagină, după y), sortează pe x ──
  const bodyItems = all.filter((i) => bodyFonts.has(i.font) && i.str.trim());
  const lines = groupLines(bodyItems); // [{page,y,items:[...]}], top→jos

  // înălțimea tipică a rândului (pt. detecția liniilor goale)
  const gaps = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].page === lines[i - 1].page) gaps.push(lines[i - 1].y - lines[i].y);
  }
  gaps.sort((a, b) => a - b);
  const lineH = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 15;

  // ── 6. Clasifică + împerechează acorduri cu versuri ──
  const out = []; // rânduri ChordPro
  let pending = null; // {chords:[{col,text}]} – acorduri care așteaptă versul de sub ele
  let prevY = null, prevPage = null;

  const flushPendingInstrumental = () => {
    if (pending && pending.chords.length) out.push(buildChordOnly(pending.chords));
    pending = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    // linie goală între rânduri (gap mare sau pagină nouă)
    if (prevY != null) {
      const bigGap = ln.page !== prevPage || (prevY - ln.y) > lineH * 1.6;
      if (bigGap) { flushPendingInstrumental(); if (out.length && out[out.length - 1] !== "") out.push(""); }
    }
    prevY = ln.y; prevPage = ln.page;

    const info = classify(ln, { chordFont, lyricFonts, colOf });

    if (info.kind === "label") {
      flushPendingInstrumental();
      // instrumental (INTRO: |Em7---|…) → acordurile inline în bare; etichetă simplă → text curat
      out.push(reconstruct(ln.items, { chordFont, colOf, brackets: info.instrumental }));
    } else if (info.kind === "chords") {
      // acordurile așteaptă versul de dedesubt
      const next = lines[i + 1];
      const nextIsLyric = next && next.page === ln.page && (ln.y - next.y) <= lineH * 1.6 && classify(next, { chordFont, lyricFonts, colOf }).kind === "lyric";
      if (nextIsLyric) {
        pending = { chords: info.chords };
      } else {
        out.push(buildChordOnly(info.chords)); // rând instrumental fără vers
      }
    } else if (info.kind === "lyric") {
      out.push(mergeChordsIntoLyric(ln.items, pending ? pending.chords : [], { lyricFonts, colOf }));
      pending = null;
    }
  }
  flushPendingInstrumental();

  // curăță linii goale duplicate la capete
  while (out.length && out[0] === "") out.shift();
  while (out.length && out[out.length - 1] === "") out.pop();

  return {
    title: meta.title,
    key: meta.key,
    bpm: meta.bpm,
    meter: meta.meter,
    sequence: meta.sequence,
    chordpro: out.join("\n"),
    warnings,
  };
}

/** Grupează fragmentele pe rânduri (y rotunjit, toleranță 3px), sortate top→jos, fiecare pe x. */
function groupLines(items) {
  const rows = [];
  const sorted = [...items].sort((a, b) => (a.page - b.page) || (b.y - a.y));
  for (const it of sorted) {
    const last = rows[rows.length - 1];
    if (last && last.page === it.page && Math.abs(last.y - it.y) <= 3) last.items.push(it);
    else rows.push({ page: it.page, y: it.y, items: [it] });
  }
  for (const r of rows) r.items.sort((a, b) => a.x - b.x);
  return rows;
}

/** Ce fel de rând e: label / chords / lyric. */
function classify(ln, { chordFont, lyricFonts, colOf }) {
  const chordItems = ln.items.filter((i) => i.font === chordFont && dotToSpace(i.str).trim());
  const first = chordItems[0] ? dotToSpace(chordItems[0].str).trim() : "";
  // Etichetă de secțiune?
  if (first && SECTION_RE.test(first)) {
    // are acorduri reale după etichetă? (INTRO: |Em7---|…)
    const rest = chordItems.slice(1).map((i) => dotToSpace(i.str).trim());
    const hasChords = rest.some((t) => isChordTok(t));
    const labelText = chordItems.map((i) => dotToSpace(i.str)).join("").replace(/\s+/g, " ").trim();
    return { kind: "label", instrumental: hasChords, label: labelText };
  }
  // Rând de acorduri? (are tokeni bold care-s acorduri, fără litere de vers)
  const chords = chordItems.filter((i) => isChordTok(dotToSpace(i.str).trim())).map((i) => ({ col: colOf(i.x), text: dotToSpace(i.str).trim() }));
  const lyricItems = ln.items.filter((i) => lyricFonts.has(i.font) && dotToSpace(i.str).trim());
  if (chords.length && !lyricItems.length) return { kind: "chords", chords };
  if (lyricItems.length) return { kind: "lyric" };
  if (chords.length) return { kind: "chords", chords };
  return { kind: "lyric" }; // fallback
}

/** Construiește un rând doar din acorduri (instrumental), la coloanele lor. */
function buildChordOnly(chords) {
  const cells = [];
  const ins = {};
  for (const c of chords) (ins[c.col] ||= []).push(c.text);
  const maxCol = Math.max(0, ...chords.map((c) => c.col));
  return assemble(cells, ins, maxCol);
}

/** Împerechează acordurile (de pe rândul de sus) cu versul (rândul curent). */
function mergeChordsIntoLyric(lyricItems, chords, { lyricFonts, colOf }) {
  const cells = [];
  for (const it of lyricItems) {
    if (!lyricFonts.has(it.font)) continue;
    const text = dotToSpace(it.str);
    const start = colOf(it.x);
    for (let k = 0; k < text.length; k++) {
      const ch = text[k];
      const idx = start + k;
      if (ch === " " && cells[idx] != null) continue; // nu suprascrie cu spațiu
      cells[idx] = ch;
    }
  }
  const ins = {};
  for (const c of chords) (ins[c.col] ||= []).push(c.text);
  const maxCol = Math.max(cells.length - 1, 0, ...chords.map((c) => c.col));
  return assemble(cells, ins, maxCol);
}

/**
 * Reconstruiește un rând INLINE (etichetă / bare / progresie) parcurgând token-ii stânga→dreapta,
 * cu un „cursor" de coloană. Acordul ocupă atâtea coloane cât lungimea lui (ca în chart), deci
 * barele/cratimele de după se lipesc: INTRO: |[Em7]---|[Cmaj9]---| (fără goluri false).
 */
function reconstruct(items, { chordFont, colOf, brackets }) {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let out = "", cursor = 0;
  for (const it of sorted) {
    const text = dotToSpace(it.str);
    const t = text.trim();
    if (!t) continue; // spațiile sintetice: golurile vin din coloane
    const startCol = colOf(it.x);
    if (startCol > cursor) { out += " ".repeat(startCol - cursor); cursor = startCol; }
    if (brackets && it.font === chordFont && isChordTok(t)) {
      out += `[${t}]`; cursor += t.length;
    } else {
      out += text; cursor += text.length;
    }
  }
  return out.replace(/\s+$/g, "");
}

/** Asamblează buffer-ul de caractere + inserțiile de acorduri într-un string ChordPro. */
function assemble(cells, ins, maxCol) {
  let s = "";
  for (let c = 0; c <= maxCol; c++) {
    if (ins[c]) for (const ch of ins[c]) s += `[${ch}]`;
    s += cells[c] != null ? cells[c] : " ";
  }
  return s.replace(/\s+$/g, "");
}

/** Extrage titlu / gamă / bpm / măsură / sequence din header-ul paginii 1. */
function extractMeta(headItems) {
  // rândul (grupat pe y) — top→jos
  const rows = groupLines(headItems);
  const fsMax = Math.max(0, ...headItems.map((i) => i.fs));
  // Titlu = rândurile cu fontul cel mai mare, de sus
  let titleParts = [];
  let sequence = "";
  for (const r of rows) {
    const rowFs = Math.max(...r.items.map((i) => i.fs));
    const text = r.items.map((i) => i.str).join("").replace(/\s+/g, " ").trim();
    if (!text || /^\d+$/.test(text)) continue; // nr. de pagină
    if (Math.abs(rowFs - fsMax) < 0.6) { titleParts.push(text); continue; }
    // data/autor → ignoră
    if (/^\[.*\]/.test(text) && /\bby\b/i.test(text)) continue;
    if (/^\[\d/.test(text)) continue;
    // sequence = rândul (de obicei) cu virgule / token-uri de tip V1, C1…
    if (/,/.test(text) || /\b(intro|v\d|c\d|inter|tag|bridge|solo|rf\d|b\d|e)\b/i.test(text)) {
      sequence = sequence ? `${sequence} ${text}` : text;
    }
  }
  let title = titleParts.join(" ").replace(/\s+/g, " ").trim();
  // Gama/BPM/măsura din [G, 71 bpm, 4/4] de la finalul titlului
  let key = "", bpm = "", meter = "";
  const mBracket = title.match(/\[([^\]]*)\]\s*$/);
  if (mBracket) {
    const inside = mBracket[1];
    const mk = inside.match(/\b([A-G][#b]?m?)\b/);
    if (mk) key = mk[1];
    const mb = inside.match(/(\d{2,3})\s*bpm/i);
    if (mb) bpm = mb[1];
    const mm = inside.match(/(\d{1,2}\s*\/\s*\d{1,2})/);
    if (mm) meter = mm[1].replace(/\s+/g, "");
    title = title.slice(0, mBracket.index).trim();
  }
  return { title, key, bpm, meter, sequence };
}

module.exports = { parsePcoPdf };
