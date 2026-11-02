/**
 * Vocabularul de SECȚIUNI pentru autocomplete în Mashup Studio (Q10 / D11).
 *
 * ÎNTEMEIAT PE DB, NU inventat: rădăcinile de mai jos sunt EXACT tipurile de secțiuni care apar deja
 * în `pc_arrangements.sequence` (agregat read-only pe baza reală: Chorus 1858×, Bridge 997×, Verse 666×,
 * Intro 637×, Tag 395×, Interlude 364×, Instrumental 355×, Ending 334×, Refrain 246×, Vamp 206×,
 * PreChorus 156×, Outro 133×, Turnaround 77×, Breakdown 72×, Post-Chorus 16×, Solo 15×, Coda 2× …)
 * plus echivalentele RO din motor (`translateSection`). Abrevierile (`abbr`) = EXACT `SEQ_ABBR` din
 * `lib/songs/chordpro.js`, ca tokenul derivat să fie identic cu cel al motorului.
 *
 * Reutilizăm 100% motorul existent — acest fișier NU parsează și NU atinge DB; doar oferă sugestii.
 * Scrii „ve" → recomandă „Verse" (Strofă). Poți scrie orice (custom): autocomplete e ajutor, nu gard.
 */

/**
 * @typedef {Object} SectionType
 * @property {string} label    eticheta canonică EN (cum o recunoaște motorul: isSection / SEQ_HEAD_RE)
 * @property {string} ro       echivalentul RO (din translateSection) — pt. afișare prietenoasă
 * @property {string} abbr     tokenul PCO de sequence (din SEQ_ABBR) — „V", „C", „B", „Pre"…
 * @property {boolean} numbered dacă primește uzual un număr („Verse 1", „Chorus 2")
 * @property {boolean} noLyrics secțiune instrumentală (fără versuri — scoasă din „Words", WORDS_DROP_RE)
 * @property {string[]} aliases prefixe/forme pe care le poate tasta liderul (EN+RO+scurtături)
 */

/** @type {SectionType[]} */
export const SECTION_TYPES = [
  { label: "Intro",        ro: "Intro",       abbr: "Intro",      numbered: false, noLyrics: true,  aliases: ["intro", "in", "introducere"] },
  { label: "Verse",        ro: "Strofă",      abbr: "V",          numbered: true,  noLyrics: false, aliases: ["verse", "ve", "v", "vers", "strofa", "strofă", "str"] },
  { label: "Pre-Chorus",   ro: "Pre-refren",  abbr: "Pre",        numbered: true,  noLyrics: false, aliases: ["prechorus", "pre-chorus", "pre chorus", "pre", "pc", "prerefren", "pre-refren"] },
  { label: "Chorus",       ro: "Refren",      abbr: "C",          numbered: true,  noLyrics: false, aliases: ["chorus", "ch", "c", "cor", "refren", "ref", "coro"] },
  { label: "Post-Chorus",  ro: "Post-refren", abbr: "Po",         numbered: true,  noLyrics: false, aliases: ["postchorus", "post-chorus", "post chorus", "post", "po", "postrefren"] },
  { label: "Refrain",      ro: "Refren 2",    abbr: "R",          numbered: true,  noLyrics: false, aliases: ["refrain", "refr", "re"] },
  { label: "Bridge",       ro: "Bridge",      abbr: "B",          numbered: true,  noLyrics: false, aliases: ["bridge", "br", "b", "punte", "pu"] },
  { label: "Interlude",    ro: "Interludiu",  abbr: "Interlude",  numbered: true,  noLyrics: true,  aliases: ["interlude", "inter", "interludiu", "il"] },
  { label: "Instrumental", ro: "Instrumental",abbr: "Inst",       numbered: false, noLyrics: true,  aliases: ["instrumental", "inst", "instr"] },
  { label: "Solo",         ro: "Solo",        abbr: "Solo",       numbered: false, noLyrics: true,  aliases: ["solo", "so"] },
  { label: "Tag",          ro: "Repetare",    abbr: "Tag",        numbered: false, noLyrics: false, aliases: ["tag", "ta", "repetare", "rep"] },
  { label: "Vamp",         ro: "Vamp",        abbr: "Vamp",       numbered: false, noLyrics: false, aliases: ["vamp", "va"] },
  { label: "Turnaround",   ro: "Turnaround",  abbr: "Turn",       numbered: false, noLyrics: true,  aliases: ["turnaround", "turn", "tu"] },
  { label: "Breakdown",    ro: "Breakdown",   abbr: "Breakdown",  numbered: false, noLyrics: true,  aliases: ["breakdown", "break", "bd"] },
  { label: "Coda",         ro: "Coda",        abbr: "Coda",       numbered: false, noLyrics: true,  aliases: ["coda", "co"] },
  { label: "Ending",       ro: "Final",       abbr: "E",          numbered: false, noLyrics: true,  aliases: ["ending", "end", "en", "final", "fin"] },
  { label: "Outro",        ro: "Outro",       abbr: "O",          numbered: false, noLyrics: true,  aliases: ["outro", "out", "ou"] },
];

/** Hartă rapidă alias → tip (prefixe), construită o singură dată. */
const _byAlias = (() => {
  const m = [];
  for (const t of SECTION_TYPES) for (const a of t.aliases) m.push([a.toLowerCase(), t]);
  return m;
})();

/** Normalizează ce tastează userul: litere + eventual un număr („ve 1", „verse1", „refren 2"). */
function parseQuery(query) {
  const raw = String(query || "").trim();
  const m = /^(.*?)\s*(\d+)?\s*$/.exec(raw.toLowerCase());
  const word = (m ? m[1] : raw.toLowerCase()).replace(/[.:]/g, "").trim();
  const num = m && m[2] ? m[2] : "";
  return { word, num, raw };
}

/**
 * Sugestii de secțiuni pentru ce tastează liderul. Scrii „ve" → „Verse" (Strofă) sus.
 * Fiecare sugestie are deja `label` complet (cu numărul tastat, dacă există), gata de pus în bloc.
 * @returns {{ type: SectionType, label: string, ro: string, score: number }[]}
 */
export function suggestSections(query, { limit = 8 } = {}) {
  const { word, num } = parseQuery(query);
  // fără input → întoarce ordinea canonică (cele mai folosite întâi).
  if (!word) {
    return SECTION_TYPES.slice(0, limit).map((t) => ({ type: t, label: withNum(t.label, num), ro: withNum(t.ro, num), score: 0 }));
  }
  const seen = new Set();
  const hits = [];
  for (const [alias, t] of _byAlias) {
    if (seen.has(t.label)) continue;
    let score = -1;
    if (alias === word) score = 3;                 // potrivire exactă de alias
    else if (alias.startsWith(word)) score = 2;    // aliasul începe cu ce-ai scris („ve" → „verse")
    else if (word.startsWith(alias)) score = 1;    // ai scris mai mult decât aliasul
    else if (alias.includes(word)) score = 0;      // substring
    if (score >= 0) { seen.add(t.label); hits.push({ type: t, label: withNum(t.label, num), ro: withNum(t.ro, num), score }); }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

/** Adaugă numărul la etichetă dacă există și tipul îl acceptă („Verse" + „2" → „Verse 2"). */
function withNum(label, num) {
  return num ? `${label} ${num}` : label;
}

/** Găsește tipul pentru o etichetă existentă (pt. a ști dacă e instrumentală, RO-ul, tokenul). */
export function matchSectionType(label) {
  const { word } = parseQuery(label);
  if (!word) return null;
  for (const [alias, t] of _byAlias) if (alias === word) return t;
  for (const [alias, t] of _byAlias) if (alias.startsWith(word) || word.startsWith(alias)) return t;
  return null;
}
