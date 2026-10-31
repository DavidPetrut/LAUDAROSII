/**
 * Scheduler Songs backup (in-proces, setInterval, fără pachete noi) — rulează NOCTURN, pe server,
 * invizibil pentru useri: regenerează manifestul (harta „ce-i unde") + copiază în B2 fișierele noi.
 *
 * Complet DECUPLAT de acțiunile userilor: când cineva adaugă o melodie, el merge instant mai departe;
 * dublura se face aici, noaptea, doar pentru ce-i nou de la ultima dată.
 *
 * Gated de env:
 *   PC_SONGS_BACKUP=1     — pornește scheduler-ul (altfel stă oprit)
 *   PC_SONGS_BACKUP_HOUR  — ora rulării (0..23, default 3 dimineața)
 * Backupul B2 propriu-zis pornește doar dacă B2_* sunt setate (altfel doar manifest).
 */
const path = require("path");

async function runOnce(log = console.log) {
  const M = require("./models");
  const { buildManifest } = require("./services/pcoImport/manifest");
  const { backupNewFiles, isB2Configured } = require("./services/songsBackup");
  const outDir = path.join(__dirname, "backups");

  // 1) Backup fișiere noi în B2 (dacă e configurat) — peste toate org-urile.
  try { await backupNewFiles({ log }); }
  catch (e) { log("[songsBackup] eroare backup:", e.message); }

  // 2) Manifest proaspăt per organizație (indexul portabil).
  const orgs = await M.PcOrg.find({}).select("_id name").lean();
  for (const o of orgs) {
    try { await buildManifest({ orgId: o._id, outDir, log: () => {} }); }
    catch (e) { log(`[songsBackup] manifest org ${o.name}:`, e.message); }
  }
  log(`[songsBackup] tură completă (${orgs.length} org, B2=${isB2Configured() ? "on" : "off"})`);
}

function startSongsBackupScheduler() {
  if (process.env.PC_SONGS_BACKUP !== "1") return;
  const hour = Math.min(23, Math.max(0, Number(process.env.PC_SONGS_BACKUP_HOUR) || 3));
  let lastDay = "";
  const tick = async () => {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    if (now.getHours() !== hour || lastDay === day) return;
    lastDay = day;
    try { await runOnce(); } catch (e) { console.error("[songsBackup] scheduler:", e.message); }
  };
  setInterval(tick, 30 * 60 * 1000); // verifică din 30 în 30 de minute
  console.log(`[songsBackup] scheduler pornit (ora ${hour}:00, PC_SONGS_BACKUP=1)`);
}

module.exports = { startSongsBackupScheduler, runOnce };
