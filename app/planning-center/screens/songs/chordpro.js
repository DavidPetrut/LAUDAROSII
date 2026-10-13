/**
 * Motor ChordPro (pur JS — zero dependențe, zero API). Transpunere + randare chord-chart.
 * Reguli din „Special codes for Lyrics and Chords" (PCO):
 *  - [Chord]            → ChordPro, transpozabil, pus pe linia de deasupra silabei. Doar în Chord Chart.
 *  - SECTION HEADING    → linie all-caps (VERSE 1 / CHORUS / INSTRUMENTAL).
 *  - { note }           → notă în Chord Chart + Lyric PDF (nu se ridică pe rând).
 *  - {{ note }}         → notă DOAR în Chord Chart (scoasă din Lyrics).
 *  - COLUMN_BREAK / PAGE_BREAK (și {{ }} pt. doar-chord).
 *  - <b> <i> <u> <strong> <em> <t> → stil (le curățăm la text simplu pe mobil, dar le recunoaștem).
 *  - TRANSPOSE KEY ±n   → schimbă cheia dar acordurile rămân scrise în original (shift la randare).
 *  - REDEFINE KEY ±n    → acordurile sunt deja scrise în noua cheie; remapează DOAR numerele/numeralele.
 *  Scala PCO pt. alegerea cheii: Ab, A, Bb, B, C, Db, D, Eb, E, F, F#, G.
 */

// Spelling după index cromatic (C=0), două variante: chei cu diez vs. cu bemol (ca PCO).
const SPELL_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SPELL_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
// Chei oferite în pickere (ordinea din pozele PCO).
export const KEY_CHOICES = ["Ab", "A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#"];

const LETTER_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// Chei care se scriu cu diez (restul cu bemol; C/F = bemol/neutru implicit).
const SHARP_KEYS = new Set(["G", "D", "A", "E", "B", "F#", "C#", "A#", "D#", "G#"]);

/** Cheia preferă diezi? (nume de notă simplu: A, Eb, F#…). */
export function prefersSharp(keyName) {
  if (!keyName) return false;
  if (keyName.includes("#")) return true;
  if (keyName.includes("b")) return false;
  return SHARP_KEYS.has(keyName);
}

/** Index cromatic 0-11 pentru un nume de notă (cu # / b multipli). Null dacă nu e notă. */
export function noteIndex(name) {
  if (!name) return null;
  const m = /^([A-Ga-g])([#b]*)/.exec(name.trim());
  if (!m) return null;
  let idx = LETTER_IDX[m[1].toUpperCase()];
  for (const ch of m[2]) idx += ch === "#" ? 1 : -1;
  return ((idx % 12) + 12) % 12;
}

/** Transpune un acord cu `steps` semitonuri. `sharp` alege spelling-ul (diez/bemol). Păstrează calitatea + basul. */
export function transposeChord(chord, steps, sharp = false) {
  if (!chord) return chord;
  const SPELL = sharp ? SPELL_SHARP : SPELL_FLAT;
  const parse = (tok) => {
    const m = /^([A-Ga-g][#b]*)(.*)$/.exec(tok);
    if (!m) return null;
    return { root: m[1], rest: m[2] };
  };
  const shiftRoot = (root) => {
    const idx = noteIndex(root);
    if (idx === null) return root;
    return SPELL[(((idx + steps) % 12) + 12) % 12];
  };
  // slash chord (A/C#)
  const [main, bass] = chord.split("/");
  const pm = parse(main);
  if (!pm) return chord;
  let out = shiftRoot(pm.root) + pm.rest;
  if (bass !== undefined) {
    const pb = parse(bass);
    out += "/" + (pb ? shiftRoot(pb.root) + pb.rest : bass);
  }
  return out;
}

/** Semitonuri de la o cheie la alta (mod 12, 0..11). */
export function stepsBetween(fromKey, toKey) {
  const a = noteIndex(fromKey), b = noteIndex(toKey);
  if (a === null || b === null) return 0;
  return (((b - a) % 12) + 12) % 12;
}

// Grade Nashville după distanța cromatică față de tonica (C=0 relativ).
const DEG_NUM = { 0: "1", 2: "2", 4: "3", 5: "4", 7: "5", 9: "6", 11: "7", 1: "b2", 3: "b3", 6: "b5", 8: "b6", 10: "b7" };
const DEG_ROMAN = { 0: "I", 2: "II", 4: "III", 5: "IV", 7: "V", 9: "VI", 11: "VII", 1: "bII", 3: "bIII", 6: "bV", 8: "bVI", 10: "bVII" };
const isMinorQuality = (rest) => /^m(?!aj)/.test(rest || "");

/** Acord → număr Nashville (roman=false) sau numeral roman (roman=true), relativ la `keyName`. */
export function chordToDegree(chord, keyName, roman = false) {
  if (!chord) return chord;
  const [main, bass] = chord.split("/");
  const m = /^([A-Ga-g][#b]*)(.*)$/.exec(main);
  if (!m) return chord;
  const tonic = noteIndex(keyName);
  const rootIdx = noteIndex(m[1]);
  if (tonic === null || rootIdx === null) return chord;
  const d = (((rootIdx - tonic) % 12) + 12) % 12;
  let deg = roman ? (DEG_ROMAN[d] || "?") : (DEG_NUM[d] || "?");
  if (roman && isMinorQuality(m[2])) deg = deg.toLowerCase();
  // păstrează calitatea (fără 'm' dublat pt. numere unde arătăm sufixul brut)
  let rest = m[2];
  if (roman && isMinorQuality(m[2])) rest = rest.replace(/^m/, "");
  let out = deg + rest;
  if (bass !== undefined) {
    const bi = noteIndex((bass.match(/^[A-Ga-g][#b]*/) || [""])[0]);
    if (bi !== null) {
      const bd = (((bi - tonic) % 12) + 12) % 12;
      out += "/" + ((roman ? DEG_ROMAN[bd] : DEG_NUM[bd]) || "?");
    }
  }
  return out;
}

const RE_SECTION = /^[A-Z0-9][A-Z0-9 ()#/.'’\-&]*$/; // all-caps heading
const RE_DIRECTIVE = /^(COLUMN_BREAK|PAGE_BREAK)\s*$/;
const stripStyle = (s) => s.replace(/<\/?(b|i|u|strong|em|t)>/gi, "");

/** Scoate directivele TRANSPOSE/REDEFINE KEY ±n din text; întoarce {lines, transpose, redefine}. */
function extractKeyDirectives(src) {
  let transpose = 0, redefine = 0;
  const lines = [];
  for (const raw of src.split(/\r?\n/)) {
    let mt = /^\s*TRANSPOSE KEY\s*([+-]?\d+)\s*$/.exec(raw);
    let mr = /^\s*REDEFINE KEY\s*([+-]?\d+)\s*$/.exec(raw);
    if (mt) { transpose += parseInt(mt[1], 10); continue; }
    if (mr) { redefine += parseInt(mr[1], 10); continue; }
    lines.push(raw);
  }
  return { lines, transpose, redefine };
}

/** Împarte o linie cu [Acord] în segmente {chord, text}. */
function splitChordLine(line) {
  const segs = [];
  let i = 0, buf = "", pendingChord = null;
  while (i < line.length) {
    if (line[i] === "[") {
      const end = line.indexOf("]", i);
      if (end > i) {
        if (buf || pendingChord !== null) { segs.push({ chord: pendingChord, text: buf }); buf = ""; }
        pendingChord = line.slice(i + 1, end);
        i = end + 1;
        continue;
      }
    }
    buf += line[i];
    i++;
  }
  segs.push({ chord: pendingChord, text: buf });
  return segs.filter((s, k) => !(k === 0 && s.chord === null && s.text === ""));
}

/**
 * Randează sursa ChordPro într-o structură pt. UI.
 * mode: "chords" | "numbers" | "numerals" | "lyrics".
 * Întoarce { rows:[ {type:'heading'|'note'|'line'|'break'|'spacer', ...} ] }.
 */
export function renderChart(source, { originalKey = "C", displayKey = null, mode = "chords" } = {}) {
  const { lines, transpose, redefine } = extractKeyDirectives(source || "");
  // Pt. acorduri: shift = (displayKey - originalKey) + TRANSPOSE KEY.
  const lyricsOnly = mode === "lyrics";
  const asDegree = mode === "numbers" || mode === "numerals";
  const roman = mode === "numerals";
  // cheia efectivă pt. numere (REDEFINE KEY remapează numerele)
  const degreeKeyIdx = ((noteIndex(originalKey) ?? 0) + (redefine || 0));
  const degreeKey = SPELL_FLAT[((degreeKeyIdx % 12) + 12) % 12];
  const dispKey = displayKey || originalKey;
  const shift = asDegree ? 0 : (stepsBetween(originalKey, dispKey) + (transpose || 0));
  const sharp = prefersSharp(dispKey);

  const mapChord = (c) => {
    if (c === null || c === undefined) return c;
    if (asDegree) return chordToDegree(c, degreeKey, roman);
    return transposeChord(c, shift, sharp);
  };

  const rows = [];
  for (const raw of lines) {
    const line = raw.replace(/\t/g, "  ");
    if (line.trim() === "") { rows.push({ type: "spacer" }); continue; }
    if (RE_DIRECTIVE.test(line.trim())) { rows.push({ type: "break", mode: line.trim() }); continue; }
    // note {{...}} (doar chord) / {...}
    const mDouble = /^\s*\{\{(.+?)\}\}\s*$/.exec(line);
    const mSingle = /^\s*\{(.+?)\}\s*$/.exec(line);
    if (mDouble) { if (!lyricsOnly) rows.push({ type: "note", text: stripStyle(mDouble[1].trim()), chartOnly: true }); continue; }
    if (mSingle) { rows.push({ type: "note", text: stripStyle(mSingle[1].trim()) }); continue; }
    const hasChords = /\[[^\]]+\]/.test(line);
    const clean = stripStyle(line);
    // Heading = all-caps fără acorduri
    if (!hasChords && RE_SECTION.test(clean.trim()) && /[A-Z]/.test(clean)) {
      rows.push({ type: "heading", text: clean.trim() });
      continue;
    }
    if (lyricsOnly) {
      const text = clean.replace(/\[[^\]]*\]/g, "").replace(/\s{2,}/g, " ").trimEnd();
      rows.push({ type: "line", segments: [{ chord: null, text }] });
      continue;
    }
    if (!hasChords) { rows.push({ type: "line", segments: [{ chord: null, text: clean }] }); continue; }
    const segs = splitChordLine(clean).map((s) => ({ chord: mapChord(s.chord), text: s.text }));
    rows.push({ type: "line", segments: segs });
  }
  return { rows, transpose, redefine };
}

/** Listă de chei + moduri pt. dropdown-ul de preview (Original Key / chei / Numbers / Numerals / Lyrics). */
export const PREVIEW_MODES = [
  { key: "__orig__", label: "Original Key", mode: "chords", display: null },
  ...KEY_CHOICES.map((k) => ({ key: k, label: k, mode: "chords", display: k })),
  { key: "__numbers__", label: "Numbers", mode: "numbers", display: null },
  { key: "__numerals__", label: "Numerals", mode: "numerals", display: null },
  { key: "__lyrics__", label: "Lyrics", mode: "lyrics", display: null },
];

export default { noteIndex, transposeChord, stepsBetween, chordToDegree, renderChart, KEY_CHOICES, PREVIEW_MODES };
