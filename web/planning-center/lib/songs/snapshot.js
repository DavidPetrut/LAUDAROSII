/**
 * Mashup Studio — motorul de SNAPSHOT (pur, fără UI). Transformă ChordPro-ul unei melodii în „blocuri"
 * editabile (secțiuni) și înapoi, derivă secvența și chartul combinat. Reutilizează 100% motorul existent
 * `lib/songs/chordpro.js` (isSection / sequenceFromChordpro) — NU reinventăm parsarea.
 *
 * Model de date = SongSnapshot (vezi ORDER_EDITOR_PLAN.md §4.2):
 *   { title, bpm, meter, lengthSec, keys[], blocks[], sequence[], headers[], sources[] }
 * Un „bloc" = { id, label, chordpro, sourceIdx, custom }. Totul e self-contained (nu depinde de original).
 *
 * IMPORTANT: aceste funcții NU ating DB și NU ating melodiile originale. Doar construiesc/transformă obiecte.
 */
import { isSection, sequenceFromChordpro } from "@/lib/songs/chordpro";

// ── id-uri stabile pentru blocuri/headere (unice în cadrul unui snapshot; ok pt. React key + drag) ──
let _seq = 0;
export function newId(prefix = "b") {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}`;
}

// O linie e etichetă de secțiune? (fără acorduri în ea + isSection din motor). Ex. „Bridge 1", „CHORUS".
function isSectionHeaderLine(line) {
  if (/\[[^\]]*\]/.test(line)) return false; // are acorduri → nu e doar etichetă
  return isSection(String(line).trim());
}

/**
 * ChordPro (textul master al unei melodii) → listă de blocuri (secțiuni).
 * Fiecare etichetă de secțiune deschide un bloc nou; corpul merge în `chordpro` (fără linia de etichetă,
 * care stă separat în `label`). Liniile dinaintea primei etichete → un bloc „fără etichetă" (ex. intro liber).
 */
export function blocksFromChordpro(chordpro, { sourceIdx = 0 } = {}) {
  const lines = String(chordpro || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    cur.chordpro = cur.chordpro.replace(/\n+$/, ""); // taie liniile goale de la coadă
    if (cur.label || cur.chordpro.trim()) blocks.push(cur);
  };
  for (const line of lines) {
    if (isSectionHeaderLine(line)) {
      flush();
      cur = { id: newId("b"), label: line.trim(), chordpro: "", sourceIdx, custom: false };
    } else {
      if (!cur) cur = { id: newId("b"), label: "", chordpro: "", sourceIdx, custom: false };
      cur.chordpro += line + "\n";
    }
  }
  flush();
  return blocks;
}

/**
 * Fallback: melodii fără ChordPro (importate doar cu PDF-uri) → blocuri din SECVENȚĂ.
 * Fiecare token de sequence (V1, C1, B1…) devine un bloc „gol" (fără versuri), ca să poți oricum
 * reordona/șterge/face mashup pe secțiuni. `×N` din token se ignoră la etichetă.
 */
export function blocksFromSequence(sequence = [], { sourceIdx = 0 } = {}) {
  return (sequence || [])
    .map((t) => String(t || "").replace(/×\d+$/, "").trim())
    .filter(Boolean)
    .map((label) => ({ id: newId("b"), label, chordpro: "", sourceIdx, custom: false }));
}

/** Blocuri → ChordPro combinat (re-emite eticheta + corpul fiecărui bloc, separate prin rând gol). */
export function combinedChordpro(blocks = []) {
  const parts = blocks.map((b) => {
    const head = b.label ? `${b.label}\n` : "";
    return (head + (b.chordpro || "")).replace(/\n+$/, "");
  });
  return parts.filter((p) => p.trim()).join("\n\n") + "\n";
}

/** Blocuri → secvență (tokeni PCO: V1, C1, B1, Pre…), derivată prin motorul existent (o singură sursă de adevăr). */
export function sequenceFromBlocks(blocks = []) {
  return sequenceFromChordpro(combinedChordpro(blocks));
}

/** Etichetă de game pentru afișare: „A" (una) sau „A / B" (mashup cu game diferite). */
export function keysLabel(keys = []) {
  const labels = keys.map((k) => (k.label || k.startKey || "").trim()).filter(Boolean);
  const uniq = [...new Set(labels)];
  // „A → C" (tranziție de gamă), NU „A / C" (care în muzică = acord C peste bas A).
  return uniq.join(" → ");
}

/** Scurtează un titlu la MAX 2 cuvinte (D12) — human-readable pt. titlul de mashup. */
export function shortTitle(title) {
  return String(title || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
}

/** Titlu de mashup: „Melodie1 + Melodie2 + …" (fiecare max 2 cuvinte, separate cu „+"). D12. */
export function mashupTitle(sources = []) {
  const parts = sources.map((s) => shortTitle(s.title)).filter(Boolean);
  return parts.join(" + ");
}

/**
 * Construiește un SongSnapshot inițial dintr-o melodie-sursă (single-edit = punctul de start).
 * @param source  { songId, arrangementId, keyId, keyName, title }
 * @param chordpro textul master ChordPro al aranjamentului
 * @param meta     { bpm, meter, lengthSec, sequence? } (sequence standard al aranjamentului, opțional)
 */
export function snapshotFromSource(source, chordpro, meta = {}) {
  let blocks = blocksFromChordpro(chordpro, { sourceIdx: 0 });
  // Fără ChordPro (doar PDF-uri) → derivă blocuri din secvența standard, ca editorul să funcționeze oricum.
  if (!blocks.length && Array.isArray(meta.sequence) && meta.sequence.length) {
    blocks = blocksFromSequence(meta.sequence, { sourceIdx: 0 });
  }
  const startKey = source.keyName || meta.originalKey || "";
  return {
    title: source.title || "",
    bpm: meta.bpm ?? null,
    meter: meta.meter || "",
    lengthSec: meta.lengthSec || 0,
    keys: startKey ? [{ label: startKey, startKey, sourceIdx: 0 }] : [],
    blocks,
    // Preferă secvența standard a aranjamentului dacă există; altfel derivă din blocuri.
    sequence: (Array.isArray(meta.sequence) && meta.sequence.length) ? meta.sequence.slice() : sequenceFromBlocks(blocks),
    headers: [],
    sources: [{
      songId: source.songId || null,
      arrangementId: source.arrangementId || null,
      keyId: source.keyId || null,
      keyName: source.keyName || "",
      title: source.title || "",
    }],
  };
}

/**
 * „Transition next song" — adaugă o melodie-sursă la un snapshot existent (mashup).
 * Blocurile noi primesc `sourceIdx` = indexul noii surse; se adaugă și gama ei (pt. „A / B").
 * NU rescrie sequence-ul (acela se derivă/recalculează din blocuri + headere la nevoie).
 */
export function appendSource(snapshot, source, chordpro) {
  const snap = snapshot || snapshotFromSource({}, "", {});
  const sources = [...(snap.sources || [])];
  const idx = sources.length;
  sources.push({
    songId: source.songId || null,
    arrangementId: source.arrangementId || null,
    keyId: source.keyId || null,
    keyName: source.keyName || "",
    title: source.title || "",
  });
  const newBlocks = blocksFromChordpro(chordpro, { sourceIdx: idx });
  const blocks = [...(snap.blocks || []), ...newBlocks];
  const keys = [...(snap.keys || [])];
  const startKey = source.keyName || "";
  if (startKey) keys.push({ label: startKey, startKey, sourceIdx: idx });
  return { ...snap, sources, blocks, keys };
}

/**
 * Secvența DINAMICĂ a unui header de mashup = tokenii blocurilor de sub el, până la următorul header.
 * (folosit în Faza 4 pt. header-ul care-și populează sequence-ul când îl muți pe Y.)
 * @returns string[] tokeni PCO
 */
export function sequenceUnderHeader(snapshot, headerId) {
  const headers = snapshot?.headers || [];
  const blocks = snapshot?.blocks || [];
  const h = headers.find((x) => x.id === headerId);
  if (!h) return [];
  const startAt = blocks.findIndex((b) => b.id === h.afterBlockId);
  const from = startAt + 1; // blocurile DUPĂ ancoră
  // Următorul header (după ancora curentă, în ordinea blocurilor) delimitează finalul.
  const nextAnchors = headers
    .filter((x) => x.id !== headerId)
    .map((x) => blocks.findIndex((b) => b.id === x.afterBlockId))
    .filter((i) => i >= startAt)
    .sort((a, b) => a - b);
  const to = nextAnchors.length ? nextAnchors[0] + 1 : blocks.length;
  return sequenceFromBlocks(blocks.slice(from, to));
}
