/**
 * Motor ChordPro — parser PROPRIU (păstrează EXACT spațiile/indentația, cerința C/C1) +
 * ChordSheetJS DOAR pentru matematica acordurilor (transpunere corectă + Numbers 1-7 + Numerals I-vii).
 *
 * Sintaxă (ca PCO): [C] fix înaintea silabei. Spațiile pe care le tastezi între acorduri se
 * păstrează 1:1 în preview (responsive). Liniile de secțiune ("Verse 1", "VeRsE1", "CHORUS") devin
 * MAJUSCULE + bold, indiferent de capitalizare. Text în paranteze care NU e acord rămâne literal.
 */
import { Chord, Key } from "chordsheetjs";

const NOTE_INDEX = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
function keyIndex(k) { if (!k) return 0; const b = String(k).replace(/m$/, "").trim(); return NOTE_INDEX[b] ?? 0; }

export function semitoneDelta(originalKey, targetKey) {
  if (!targetKey || targetKey === originalKey) return 0;
  return (keyIndex(targetKey) - keyIndex(originalKey) + 12) % 12;
}

export function convertChord(raw, { mode, originalKey, delta }) {
  if (!raw || !raw.trim()) return raw || "";
  let chord; try { chord = Chord.parse(raw.trim()); } catch { chord = null; }
  if (!chord) return raw; // nu e acord (ex. [UNISON]) → literal
  try {
    const keyObj = Key.parse(originalKey || "C");
    // Interpretare DUALĂ: dacă în [ ] e o CIFRĂ (Nashville), o facem întâi acord absolut în Original Key.
    const sym = chord.isChordSymbol() ? chord : chord.toChordSymbol(keyObj);
    if (mode === "numbers") return sym.toNumeric(keyObj).toString();
    if (mode === "numerals") return sym.toNumeral(keyObj).toString();
    return (delta ? sym.transpose(delta) : sym).toString();
  } catch { return raw; }
}

// ── Conversie acord ↔ număr (Nashville) relativ la Original Key ──
export function bracketToSymbol(content, key) {
  try { const c = Chord.parse(String(content).trim()); if (!c) return content; const k = Key.parse(key || "C"); return (c.isChordSymbol() ? c : c.toChordSymbol(k)).toString(); } catch { return content; }
}
export function bracketToNumber(content, key) {
  try { const c = Chord.parse(String(content).trim()); if (!c) return content; const k = Key.parse(key || "C"); const sym = c.isChordSymbol() ? c : c.toChordSymbol(k); return sym.toNumeric(k).toString(); } catch { return content; }
}
// Rescrie toate [acordurile] din text în modul cerut ("numbers" | "chords").
export function convertBrackets(text, toMode, key) {
  return String(text).replace(/\[([^\]]*)\]/g, (m, inner) => {
    const t = inner.trim(); if (!t) return m;
    const conv = toMode === "numbers" ? bracketToNumber(t, key) : bracketToSymbol(t, key);
    return `[${conv}]`;
  });
}
// Cele 7 game diatonice ale gamei (Nashville), ca cifre sau ca nume de acorduri.
export const DIATONIC_NUMBERS = ["1", "2m", "3m", "4", "5", "6m", "7"];
export function diatonicDegrees(key, asNumbers) {
  return asNumbers ? DIATONIC_NUMBERS.slice() : DIATONIC_NUMBERS.map((n) => bracketToSymbol(n, key));
}
// Tokenul de bază al unui acord (literă sau cifră) + dacă e minor — pt. butoanele toolbar-ului.
export function chordRootToken(content) {
  const t = String(content || "").trim();
  const m = /^([A-G][#b]?|[1-7][#b]?)/.exec(t);
  const token = m ? m[1] : t;
  const minor = new RegExp(`^${token.replace(/[#]/g, "\\$&")}m(?!aj)`).test(t);
  return { token, minor };
}
// Un conținut de [ ] e numeric (Nashville)? → pt. stilizare italic/mic.
export function isNumericBracket(content) {
  return /^[1-7]/.test(String(content || "").trim());
}

// Reduce un acord la forma SIMPLĂ: rădăcină + accidental (#/b) + minor (dacă e), scoate 7/9/sus/add/(4)/ma/dim/bas.
export function simplifyChordContent(content) {
  const t = String(content || "").trim();
  const m = /^([A-G][#b]?|[1-7][#b]?)/.exec(t);
  if (!m) return content; // nu e acord (ex. UNISON) → neatins
  const root = m[1];
  const rest = t.slice(root.length);
  const minor = /^m(?![a])/.test(rest); // „m" (minor), nu „ma"/„maj" (major)
  return root + (minor ? "m" : "");
}
// Rescrie toate [acordurile] la forma simplă (păstrează diezii/bemolii — sunt gamele în sine)
// + colapsează acordurile identice consecutive pe ACELAȘI rând (păstrează pe cel din stânga).
export function simplifyBrackets(text) {
  let out = String(text).replace(/\[([^\]]*)\]/g, (mm, inner) => {
    const t = inner.trim(); if (!t) return mm;
    return `[${simplifyChordContent(t)}]`;
  });
  // ex. „[G] [G] [G] [G] [D]" → „[G] [D]" (doar separate prin spații/tab, nu peste rânduri).
  out = out.replace(/(\[([^\]]*)\])(?:[ \t]+\[\2\])+/g, "$1");
  return out;
}

// Secțiuni cunoscute (orice capitalizare, număr opțional, „:" opțional).
const SECTION_WORDS = "verse|chorus|pre-?chorus|post-?chorus|refrain|bridge|intro|outro|ending|instrumental|interlude|tag|turnaround|vamp|breakdown|solo|coda|strofa|refren|interludiu|final";
const SECTION_RE = new RegExp(`^(?:${SECTION_WORDS})\\s*\\d*\\s*:?\\s*$`, "i");
// Linie scurtă complet cu MAJUSCULE (etichetă custom, ex. „BREACKDOWN", „ENDING").
const ALLCAPS_RE = /^[A-ZĂÂÎȘȚ0-9][A-ZĂÂÎȘȚ0-9 ._()/#&-]{0,22}:?$/;

export function isSection(lyric) {
  const t = lyric.trim();
  if (!t) return false;
  if (SECTION_RE.test(t)) return true;
  return ALLCAPS_RE.test(t) && /[A-ZĂÂÎȘȚ]/.test(t) && !/[a-zăâîșț]/.test(t);
}

// Tag-uri de formatare permise (bold/italic/underline). Sunt zero-width vizual → NU afectează coloanele.
const stripFmt = (s) => s.replace(/<\/?(b|i|u)>/gi, "");
const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Lyric (cu tag-uri <b>/<i>/<u>) → HTML sigur pt. preview: textul e escape-uit, tag-urile trec.
 * Caracterele rămân aceleași ca versiunea „stripped" → alinierea acordurilor se păstrează.
 */
export function lyricToHtml(raw) {
  return String(raw || "").replace(/(<\/?[biu]>)|([^<]+)/gi, (_, tag, txt) => (tag ? tag.toLowerCase() : escHtml(txt || "")));
}

/** Împarte o linie în { lyric (cu tag-uri, fără paranteze), chords: [{col, raw}] }. Coloanele = lungime VIZIBILĂ (fără tag-uri). */
function parseLine(line) {
  const chords = [];
  let lyric = "";
  let vis = 0; // coloană vizibilă (ignoră tag-urile de formatare)
  const re = /\[([^\]]*)\]/g;
  let last = 0, m;
  while ((m = re.exec(line))) {
    const seg = line.slice(last, m.index);
    lyric += seg; vis += stripFmt(seg).length;
    chords.push({ col: vis, raw: m[1] });
    last = m.index + m[0].length;
  }
  lyric += line.slice(last);
  return { lyric, chords };
}

/**
 * Întoarce liniile randate:
 *   { kind:"empty" } | { kind:"section", label } | { kind:"row", chordRow, lyricRow }
 */
export function renderChordPro(text, { mode = "chords", originalKey = "C", targetKey = "" } = {}) {
  const delta = semitoneDelta(originalKey, targetKey);
  const rawLines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const out = [];

  for (const line of rawLines) {
    const { lyric, chords } = parseLine(line);

    if (!lyric.trim() && chords.length === 0) { out.push({ kind: "empty" }); continue; }
    if (chords.length === 0 && isSection(lyric)) { out.push({ kind: "section", label: lyric.trim().toUpperCase() }); continue; }

    if (mode === "lyrics" || chords.length === 0) { out.push({ kind: "row", chordRow: "", lyricRow: lyric }); continue; }

    // Rând de acorduri aliniat — respectă coloanele (deci spațiile tastate), min 1 spațiu la coliziune.
    let chordRow = "";
    for (const c of chords) {
      const txt = convertChord(c.raw, { mode, originalKey, delta });
      if (!txt.trim()) continue;
      if (chordRow.length < c.col) chordRow += " ".repeat(c.col - chordRow.length);
      else if (chordRow.length > 0) chordRow += " ";
      chordRow += txt;
    }
    out.push({ kind: "row", chordRow, lyricRow: lyric });
  }
  return out;
}

export const ALL_KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
