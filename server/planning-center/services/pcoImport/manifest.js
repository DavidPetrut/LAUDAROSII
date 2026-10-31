/**
 * Plasă de siguranță Songs — generează un MANIFEST-backup al fiecărui fișier din felia muzicală.
 *
 * Pentru fiecare pc_songFiles scrie: ce melodie / aranjament / gamă, tipul, scope-ul, URL-ul de
 * hosting (Cloudinary) ȘI id-ul original din PCO (remoteId) — adică harta completă „ce-i unde".
 * Dacă vreodată se strică hosting-ul, din acest manifest + Planning Center (sursa originalelor)
 * se re-aduce totul automat, fără pierdere de date.
 *
 * Nu scrie NIMIC în DB (read-only). Produce 2 fișiere în <server>/planning-center/backups/:
 *   songs-manifest-<ts>.json  (complet, pt. scripturi de migrare)
 *   songs-manifest-<ts>.csv   (lizibil, pt. om)
 * Idempotent-safe: doar citește + scrie fișiere pe disc.
 */
const fs = require("fs");
const path = require("path");
const M = require("../../models");
const SOURCE = "pco";

const CLOUDINARY_RX = /res\.cloudinary\.com/i;

/** Eticheta gamei: „A" sau „A (ORIGINAL)". */
function keyLabel(k) {
  if (!k) return "";
  const base = String(k.startKey || "").trim();
  const desc = String(k.description || "").trim();
  return desc ? `${base} (${desc})` : base;
}

function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function buildManifest({ orgId, outDir, log = console.log }) {
  const [songs, arrs, keys, files] = await Promise.all([
    M.PcSong.find({ orgId, remoteSource: SOURCE }).select("_id title remoteId").lean(),
    M.PcArrangement.find({ orgId }).select("_id name songId").lean(),
    M.PcKey.find({ orgId }).select("_id startKey description arrangementId").lean(),
    M.PcSongFile.find({ orgId, remoteSource: SOURCE }).select("_id songId arrangementId keyId scope kind source name url remoteId audioAccess originalKey createdAt").lean(),
  ]);

  const songById = new Map(songs.map((s) => [String(s._id), s]));
  const arrById = new Map(arrs.map((a) => [String(a._id), a]));
  const keyById = new Map(keys.map((k) => [String(k._id), k]));

  const rows = files.map((f) => {
    const song = songById.get(String(f.songId));
    const arr = arrById.get(String(f.arrangementId));
    const key = f.keyId ? keyById.get(String(f.keyId)) : null;
    const isChordpro = f.source === "chordpro";
    const isLink = f.kind === "link";
    return {
      songTitle: song ? song.title : "(?)",
      songPcoId: song ? song.remoteId : "",
      arrangement: arr ? arr.name : "(?)",
      keyLabel: keyLabel(key),
      scope: f.scope,
      kind: f.kind,
      source: f.source,
      fileName: f.name,
      // id-ul original din PCO: pt. atașări reale = id-ul attachment-ului; pt. master ChordPro = „cc-<arrId>"
      pcoAttachmentId: isChordpro ? "" : String(f.remoteId || ""),
      hostedOn: isChordpro ? "db-chordpro" : isLink ? "extern-link" : CLOUDINARY_RX.test(f.url || "") ? "cloudinary" : (f.url ? "altul" : "lipsă"),
      url: f.url || "",
      audioAccess: f.audioAccess || "",
      originalKey: f.originalKey || "",
      importedAt: f.createdAt ? new Date(f.createdAt).toISOString() : "",
      fileId: String(f._id),
    };
  });

  // Ordonează lizibil: melodie → aranjament → gamă → tip.
  rows.sort((a, b) =>
    a.songTitle.localeCompare(b.songTitle, "ro") ||
    a.arrangement.localeCompare(b.arrangement, "ro") ||
    a.keyLabel.localeCompare(b.keyLabel, "ro") ||
    a.kind.localeCompare(b.kind));

  const stats = {
    generatedAt: new Date().toISOString(),
    orgId: String(orgId),
    songs: songs.length,
    files: rows.length,
    byHost: rows.reduce((m, r) => ((m[r.hostedOn] = (m[r.hostedOn] || 0) + 1), m), {}),
    byKind: rows.reduce((m, r) => ((m[r.kind] = (m[r.kind] || 0) + 1), m), {}),
  };

  fs.mkdirSync(outDir, { recursive: true });
  const ts = stats.generatedAt.replace(/[:.]/g, "-");
  const jsonPath = path.join(outDir, `songs-manifest-${ts}.json`);
  const csvPath = path.join(outDir, `songs-manifest-${ts}.csv`);

  fs.writeFileSync(jsonPath, JSON.stringify({ stats, rows }, null, 2), "utf8");

  const cols = ["songTitle", "songPcoId", "arrangement", "keyLabel", "scope", "kind", "source", "fileName", "pcoAttachmentId", "hostedOn", "url", "audioAccess", "originalKey", "importedAt", "fileId"];
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => csvCell(r[c])).join(",")).join("\n");
  fs.writeFileSync(csvPath, "﻿" + header + "\n" + body + "\n", "utf8"); // BOM pt. Excel + diacritice

  log(`[manifest] ${stats.files} fișiere din ${stats.songs} melodii`);
  log(`[manifest] pe host:`, JSON.stringify(stats.byHost));
  log(`[manifest] pe tip:`, JSON.stringify(stats.byKind));
  log(`[manifest] JSON → ${jsonPath}`);
  log(`[manifest] CSV  → ${csvPath}`);
  return { stats, jsonPath, csvPath };
}

module.exports = { buildManifest };
