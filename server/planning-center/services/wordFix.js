/**
 * Reîntregire „automată" a cuvintelor rupte (fără AI), cu dicționar românesc (dictionary-ro + nspell).
 *
 * Problema: la import din PCO, cuvintele sunt despărțite de spații ca să încapă acordurile deasupra
 * silabelor (ex. „Du    [G]m [Gsus2]ne    [Dadd4]zeu"). Aici lipim la loc DOAR fragmentele a căror
 * concatenare formează un cuvânt valid în dicționar, ȘTERGÂND spațiile dintre ele, dar PĂSTRÂND
 * acordurile [..] exact unde erau („Du[G]m[Gsus2]ne[Dadd4]zeu"). Nu atingem versuri corecte și nici
 * spațierea dintre cuvinte valide (deci chart-urile rămân aliniate).
 *
 * Anti-fals-pozitiv: un lipit se face DOAR dacă run-ul conține cel puțin un fragment care nu e cuvânt
 * de sine stătător (altfel „şi" + „ne" = „şine" ar fi lipit greșit).
 */

// ş/ţ cu SEDILĂ (U+015F/U+0163) → ș/ț cu VIRGULĂ (U+0219/U+021B), cum le vrea dicționarul.
const CEDILLA = { "ş": "ș", "Ş": "Ș", "ţ": "ț", "Ţ": "Ț" };
const normDia = (s) => String(s).replace(/[şŞţŢ]/g, (c) => CEDILLA[c]);
const lettersOnly = (tok) => tok.replace(/\[[^\]]*\]/g, ""); // scoate acordurile pt. verificare
const clean = (tok) => normDia(lettersOnly(tok)).replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");

let _spellP = null;
async function getSpell() {
  if (!_spellP) _spellP = (async () => {
    const [nspellMod, roMod] = await Promise.all([import("nspell"), import("dictionary-ro")]);
    const nspell = nspellMod.default || nspellMod;
    let dict = roMod.default || roMod;
    if (typeof dict === "function") dict = await new Promise((res, rej) => dict((e, d) => (e ? rej(e) : res(d))));
    return nspell(dict);
  })();
  return _spellP;
}

/** Reîntregește cuvintele rupte din text. Întoarce textul corectat (sau cel original dacă dicționarul nu e disponibil). */
async function fixWords(text) {
  const spell = await getSpell();
  const isW = (w) => !!w && (spell.correct(w) || spell.correct(w.toLowerCase()));
  const MAX_RUN = 6;

  return String(text).replace(/\r\n?/g, "\n").split("\n").map((line) => {
    const parts = line.split(/(\s+)/); // alternativ: cuvânt, spațiu, cuvânt, …
    const words = [], gaps = [];
    parts.forEach((p, i) => (i % 2 === 0 ? words.push(p) : gaps.push(p)));
    const n = words.length;
    if (n < 2) return line;
    const cw = words.map(clean);
    const removeGap = new Array(n - 1).fill(false);

    let i = 0;
    while (i < n) {
      if (!cw[i]) { i++; continue; }
      let bestJ = -1, acc = "";
      for (let j = i; j < Math.min(n, i + MAX_RUN); j++) {
        if (!cw[j] && j > i) break; // token gol (ex. doar acord) rupe run-ul
        acc += cw[j];
        if (isW(acc)) bestJ = j;
      }
      if (bestJ > i) {
        // Lipim doar când run-ul „arată rupt": ≥3 fragmente SAU există un fragment de o singură literă.
        // Astfel „Du m ne zeu"→„Dumnezeu" și „ne cl in tit"→„neclintit", dar „şi ne" (2 cuvinte valide) rămâne.
        const runLen = bestJ - i + 1;
        let minLen = Infinity;
        for (let k = i; k <= bestJ; k++) minLen = Math.min(minLen, cw[k].length);
        if (runLen >= 3 || minLen <= 1) { for (let k = i; k < bestJ; k++) removeGap[k] = true; i = bestJ + 1; continue; }
      }
      i++;
    }

    let s = words[0] || "";
    for (let k = 1; k < n; k++) s += (removeGap[k - 1] ? "" : gaps[k - 1]) + words[k];
    return s;
  }).join("\n");
}

module.exports = { fixWords };
