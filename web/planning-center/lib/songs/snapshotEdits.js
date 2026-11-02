/**
 * Mashup Studio — transformări de EDITARE pe SongSnapshot (pure, imutabile, fără UI, fără DB).
 *
 * Aceleași funcții sunt folosite și de butoanele umane, și de AI (prin registry) — „AI trece prin
 * ACELEAȘI API ca un click uman" (D6/§10). O singură sursă de adevăr pentru logica de editare.
 *
 * Fiecare funcție primește un snapshot și întoarce unul NOU (nu mută originalul) cu `sequence`
 * recalculat din blocuri (sequenceFromBlocks — motorul existent), ca strip-ul & contextul AI să fie mereu live.
 */
import { newId, sequenceFromBlocks, appendSource, mashupTitle } from "@/lib/songs/snapshot";

/** Reîmprospătează `sequence` din blocuri (singura sursă: motorul). Apelat de fiecare transformare. */
function reseq(snap) {
  return { ...snap, sequence: sequenceFromBlocks(snap.blocks || []) };
}

const idx = (snap, id) => (snap.blocks || []).findIndex((b) => b.id === id);

/** Mută un bloc cu o poziție (dir = -1 sus / +1 jos). No-op la capete. */
export function moveBlock(snap, id, dir) {
  const blocks = [...(snap.blocks || [])];
  const i = blocks.findIndex((b) => b.id === id);
  const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= blocks.length) return snap;
  [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  return reseq({ ...snap, blocks });
}

/** Reordonează (drag&drop): scoate blocul de la `fromIndex` și-l pune înaintea lui `toIndex`. */
export function reorderBlocks(snap, fromIndex, toIndex) {
  const blocks = [...(snap.blocks || [])];
  if (fromIndex < 0 || fromIndex >= blocks.length) return snap;
  const [moved] = blocks.splice(fromIndex, 1);
  let to = toIndex;
  if (fromIndex < toIndex) to -= 1; // indexul se deplasează după scoatere
  to = Math.max(0, Math.min(blocks.length, to));
  blocks.splice(to, 0, moved);
  return reseq({ ...snap, blocks });
}

/** Șterge un bloc. */
export function removeBlock(snap, id) {
  const blocks = (snap.blocks || []).filter((b) => b.id !== id);
  if (blocks.length === (snap.blocks || []).length) return snap;
  return reseq({ ...snap, blocks });
}

/** Duplică un bloc (id nou), îl inserează imediat după original. */
export function duplicateBlock(snap, id) {
  const blocks = [...(snap.blocks || [])];
  const i = blocks.findIndex((b) => b.id === id);
  if (i < 0) return snap;
  const copy = { ...blocks[i], id: newId("b") };
  blocks.splice(i + 1, 0, copy);
  return reseq({ ...snap, blocks });
}

/** Redenumește eticheta unui bloc (ex. „Verse 1"). */
export function renameBlock(snap, id, label) {
  const i = idx(snap, id);
  if (i < 0) return snap;
  const blocks = [...snap.blocks];
  blocks[i] = { ...blocks[i], label: String(label || "") };
  return reseq({ ...snap, blocks });
}

/** Schimbă versurile (ChordPro master) unui bloc. */
export function setLyrics(snap, id, chordpro) {
  const i = idx(snap, id);
  if (i < 0) return snap;
  const blocks = [...snap.blocks];
  blocks[i] = { ...blocks[i], chordpro: String(chordpro || "") };
  return reseq({ ...snap, blocks });
}

/**
 * Adaugă o secțiune nouă (bloc gol, custom). `afterId` = după ce bloc (null/absent = la final).
 * `sourceIdx` moștenește sursa blocului-ancoră (sau 0) ca mashup-ul să rămână coerent.
 */
export function addSection(snap, { label = "", afterId = null, chordpro = "" } = {}) {
  const blocks = [...(snap.blocks || [])];
  const anchor = afterId ? blocks.findIndex((b) => b.id === afterId) : blocks.length - 1;
  const sourceIdx = anchor >= 0 && blocks[anchor] ? blocks[anchor].sourceIdx : 0;
  const block = { id: newId("b"), label: String(label || ""), chordpro: String(chordpro || ""), sourceIdx, custom: true };
  const at = anchor >= 0 ? anchor + 1 : blocks.length;
  blocks.splice(at, 0, block);
  // BUG-FIX: dacă un header de tranziție era ancorat FIX pe blocul-ancoră (adică inserăm chiar la
  // granița dintre melodii), re-ancorează header-ul pe blocul NOU — altfel secțiunea adăugată „sare"
  // vizual în melodia următoare (header-ul se randează între ancoră și blocul nou).
  let headers = snap.headers || [];
  if (afterId) headers = headers.map((h) => (h.afterBlockId === afterId ? { ...h, afterBlockId: block.id } : h));
  return reseq({ ...snap, blocks, headers });
}

/**
 * Reordonare „mixtă" (drag&drop dnd-kit): primește lista afișată în ordine [{kind:'b'|'h', id}]
 * și reconstruiește blocks[] (ordine nouă) + headers[] (fiecare header se ancorează după blocul
 * care îl precede în listă; "" dacă e înaintea tuturor). O singură operație → un singur undo.
 */
export function applyMixedOrder(snap, items = []) {
  const blockMap = new Map((snap.blocks || []).map((b) => [b.id, b]));
  const newBlocks = [];
  const anchorOf = {}; // headerId -> afterBlockId
  let last = "";
  for (const it of items) {
    if (!it) continue;
    if (it.kind === "b") { const b = blockMap.get(it.id); if (b) { newBlocks.push(b); last = b.id; } }
    else if (it.kind === "h") { anchorOf[it.id] = last; }
  }
  // păstrează blocurile care nu apar în listă (siguranță), la final
  for (const b of (snap.blocks || [])) if (!newBlocks.includes(b)) newBlocks.push(b);
  const headers = (snap.headers || []).map((h) => (h.id in anchorOf ? { ...h, afterBlockId: anchorOf[h.id] } : h));
  return reseq({ ...snap, blocks: newBlocks, headers });
}

/** Schimbă titlul melodiei temporare. */
export function setTitle(snap, title) {
  return { ...snap, title: String(title || "") };
}

/* ── Mashup (Transition next song) ────────────────────────────────────────────────────── */

/**
 * „Transition next song" — aduce TOT dintr-o melodie-sursă și o unește după blocurile curente (mashup).
 * Inserează un HEADER de mashup înaintea primului bloc nou + rescrie titlul ca „A + B" (max 2 cuvinte/sursă).
 */
export function addTransitionSong(snap, source, chordpro, { headerTitle = "Următoarea melodie", bpm = null, meter = "" } = {}) {
  const before = (snap.blocks || []).length;
  const anchorId = before > 0 ? snap.blocks[before - 1].id : ""; // header între ultimul bloc vechi și primul nou
  let next = appendSource(snap, source, chordpro);               // + blocuri, + gamă, + sursă
  const header = { id: newId("h"), title: headerTitle, bpm: bpm ?? (source.bpm ?? null), meter: meter || (source.meter || ""), afterBlockId: anchorId };
  next = { ...next, headers: [...(next.headers || []), header], title: mashupTitle(next.sources || []) };
  return reseq(next);
}

/** Adaugă un header de mashup (gol) după un bloc (sau la început dacă afterBlockId=""). */
export function addHeader(snap, { afterBlockId = "", title = "Următoarea melodie", bpm = null, meter = "" } = {}) {
  const header = { id: newId("h"), title, bpm, meter, afterBlockId };
  return { ...snap, headers: [...(snap.headers || []), header] };
}

/** Șterge un header de mashup. */
export function removeHeader(snap, headerId) {
  return { ...snap, headers: (snap.headers || []).filter((h) => h.id !== headerId) };
}

/** Editează un header (title / bpm / meter / afterBlockId). */
export function setHeader(snap, headerId, patch = {}) {
  return { ...snap, headers: (snap.headers || []).map((h) => (h.id === headerId ? { ...h, ...patch } : h)) };
}

/** Mută un header pe Y = îl ancorează după alt bloc (secvența lui se recalculează dinamic la afișare). */
export function moveHeader(snap, headerId, afterBlockId) {
  return setHeader(snap, headerId, { afterBlockId: String(afterBlockId || "") });
}
