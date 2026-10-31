/**
 * Secvența unui aranjament = array de stringuri (label-uri de secțiune), EXACT ca pe mobil
 * (pc_arrangements.sequence: [String]) — one source of truth. Pe web abreviem DOAR la afișare,
 * ca linia să arate ca în PCO ("V1, C1, V2, C2, Turn, B×2, Po, E").
 */

// Paleta de secțiuni din PCO (coloana dreaptă din Edit Sequence).
export const SECTION_TYPES = [
  "Verse", "Chorus", "Bridge",
  "Intro", "Outro", "Ending",
  "Instrumental", "Interlude",
  "Tag", "Turnaround", "Vamp", "Refrain",
  "PreChorus", "Post-Chorus", "Breakdown",
];

const ABBR = {
  Verse: "V", Chorus: "C", Refrain: "R", Bridge: "B",
  Intro: "Intro", Outro: "O", Ending: "E",
  Instrumental: "Inst", Interlude: "Interlude",
  Tag: "Tag", Turnaround: "Turn", Vamp: "Vamp",
  PreChorus: "Pre", "Post-Chorus": "Po", Breakdown: "Breakdown",
};

// Secțiuni care primesc număr de ocurență (V1, V2, C1…). Restul rămân ca atare.
const NUMBERED = new Set(["Verse", "Chorus", "Refrain", "Bridge"]);

/**
 * Transformă ["Verse","Chorus","Verse","Chorus","Turnaround","Bridge","Bridge","Post-Chorus","Ending"]
 * în tokeni stil PCO: ["V1","C1","V2","C2","Turn","B×2","Po","E"] (comasează repetările consecutive ca ×n).
 */
export function abbreviateSequence(seq) {
  if (!Array.isArray(seq) || seq.length === 0) return [];
  const counts = {}; // câte ocurențe per tip, pt. numerotare
  const tokens = [];
  for (const label of seq) {
    const abbr = ABBR[label] || label; // custom → ca atare
    let token;
    if (NUMBERED.has(label)) { counts[label] = (counts[label] || 0) + 1; token = `${abbr}${counts[label]}`; }
    else token = abbr;
    // comasare repetări consecutive identice → ×n
    const prev = tokens[tokens.length - 1];
    if (prev && prev.base === token) prev.mult += 1;
    else tokens.push({ base: token, mult: 1 });
  }
  return tokens.map((t) => (t.mult > 1 ? `${t.base}×${t.mult}` : t.base));
}
