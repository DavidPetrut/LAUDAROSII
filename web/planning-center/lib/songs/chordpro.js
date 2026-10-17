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
    if (mode === "numbers") return chord.toNumeric(Key.parse(originalKey || "C")).toString();
    if (mode === "numerals") return chord.toNumeral(Key.parse(originalKey || "C")).toString();
    return (delta ? chord.transpose(delta) : chord).toString();
  } catch { return raw; }
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
