/**
 * Variații de acord pentru un root dat — ordonate SIMPLU → COMPLEX, cu diez/bemol la final
 * (cerința userului). Folosit de picker-ul care apare la click pe un acord.
 */
const QUALITIES = ["", "m", "7", "maj7", "m7", "sus4", "sus2", "sus", "6", "m6", "9", "m9", "add9", "11", "13", "dim", "dim7", "aug", "m7b5", "7sus4"];

export function chordVariations(chordStr) {
  const m = /^([A-G])([#b]?)/.exec((chordStr || "").trim());
  const root = m ? m[1] : "C";
  const base = QUALITIES.map((q) => root + q);
  // Accidentale la final: root# și rootb cu calitățile uzuale.
  const acc = ["#", "b"].flatMap((a) => ["", "m", "7", "maj7", "m7", "dim"].map((q) => root + a + q));
  // dedup păstrând ordinea
  return [...new Set([...base, ...acc])];
}

// Secțiuni standard pentru autocomplete (se adaugă peste cele custom din sequence).
export const STANDARD_SECTIONS = [
  "Verse", "Chorus", "PreChorus", "Post-Chorus", "Bridge", "Intro", "Outro",
  "Ending", "Instrumental", "Interlude", "Tag", "Turnaround", "Vamp", "Refrain", "Breakdown",
];

// Secțiuni care se numerotează (Verse 1, Verse 2…). Practic toate pot primi număr.
export function sectionBaseName(label) {
  return String(label || "").replace(/\s*\d+\s*$/,"").trim();
}
