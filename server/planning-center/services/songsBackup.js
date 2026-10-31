/**
 * Backup off-site al fișierelor Songs într-un al 2-lea cloud (Backblaze B2), prin API-ul NATIV B2
 * folosind doar `fetch` + `crypto` (ZERO pachete noi — ca restul proiectului).
 *
 * De ce: fișierele reale (audio/PDF) trăiesc pe Cloudinary. Asta e dubura lor independentă — dacă
 * Cloudinary cade sau te forțează să plătești, fișierele există și în B2, iar din manifest + B2 se
 * re-aduce totul. Rulează pe SERVER, nocturn, incremental (doar ce-i nou), invizibil pentru useri.
 *
 * Config (env; dacă lipsesc, backupul B2 e OPRIT, fără erori — rămâne doar manifestul):
 *   B2_KEY_ID, B2_APP_KEY           — cheia aplicației (o faci o dată pe backblaze.com, Free 10 GB)
 *   B2_BUCKET_ID   (opțional)       — dacă cheia nu e legată de un singur bucket
 *   B2_BACKUP_MAX  (opțional, 400)  — câte fișiere copiază per rulare (restul la următoarea)
 *
 * NIMIC distructiv: citește din DB + Cloudinary, scrie în B2 + marchează `backupKey` pe fișier.
 */
const crypto = require("crypto");
const M = require("../models");

const AUTH_URL = "https://api.backblazeb2.com/b2api/v2/b2_authorize_account";

function isB2Configured() {
  return !!(process.env.B2_KEY_ID && process.env.B2_APP_KEY);
}

/** Autorizare B2 → { apiUrl, token, bucketId }. */
async function b2Authorize() {
  const basic = Buffer.from(`${process.env.B2_KEY_ID}:${process.env.B2_APP_KEY}`).toString("base64");
  const r = await fetch(AUTH_URL, { headers: { Authorization: `Basic ${basic}` } });
  if (!r.ok) throw new Error(`b2_authorize ${r.status}`);
  const j = await r.json();
  const bucketId = process.env.B2_BUCKET_ID || (j.allowed && j.allowed.bucketId);
  if (!bucketId) throw new Error("fără bucketId (setează B2_BUCKET_ID sau folosește o cheie legată de un bucket)");
  return { apiUrl: j.apiUrl, token: j.authorizationToken, bucketId };
}

/** Ia un URL de upload proaspăt (B2 cere unul per sesiune de upload). */
async function b2GetUploadUrl({ apiUrl, token, bucketId }) {
  const r = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST", headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ bucketId }),
  });
  if (!r.ok) throw new Error(`b2_get_upload_url ${r.status}`);
  return r.json(); // { uploadUrl, authorizationToken }
}

/** Urcă un buffer în B2 sub `name`. */
async function b2Upload({ uploadUrl, authorizationToken }, name, buf, contentType) {
  const sha1 = crypto.createHash("sha1").update(buf).digest("hex");
  const r = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: authorizationToken,
      "X-Bz-File-Name": encodeURIComponent(name),
      "Content-Type": contentType || "b2/x-auto",
      "Content-Length": String(buf.length),
      "X-Bz-Content-Sha1": sha1,
    },
    body: buf,
  });
  if (!r.ok) throw new Error(`b2_upload ${r.status}`);
  return r.json(); // { fileId, fileName, ... }
}

/**
 * Copiază în B2 fișierele reale care încă n-au dublură (backupKey gol). Incremental & idempotent.
 * Pt. fiecare: descarcă din Cloudinary → urcă în B2 → marchează backupKey + backupAt.
 */
async function backupNewFiles({ orgId, log = console.log } = {}) {
  if (!isB2Configured()) { log("[songsBackup] B2 neconfigurat — sar peste (doar manifest)"); return { skipped: true }; }
  const max = Number(process.env.B2_BACKUP_MAX) || 400;
  const q = {
    source: "upload", url: { $regex: "^https?://" },
    $or: [{ backupKey: { $exists: false } }, { backupKey: "" }, { backupKey: null }],
  };
  if (orgId) q.orgId = orgId;
  const pending = await M.PcSongFile.find(q).select("_id orgId name url").limit(max).lean();
  if (!pending.length) { log("[songsBackup] nimic nou de copiat"); return { copied: 0, errors: 0, remaining: 0 }; }

  log(`[songsBackup] de copiat în B2: ${pending.length}${pending.length === max ? "+ (cap/rulare)" : ""}`);
  const session = await b2Authorize();
  let upload = await b2GetUploadUrl(session);
  let copied = 0, errors = 0, done = 0;
  for (const f of pending) {
    try {
      const res = await fetch(f.url);
      if (!res.ok) throw new Error(`download ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const safe = String(f.name || "file").replace(/[^\w.\- ]+/g, "_").slice(0, 80);
      const key = `pc/${f.orgId}/${f._id}-${safe}`;
      const ctype = res.headers.get("content-type") || "b2/x-auto";
      try { await b2Upload(upload, key, buf, ctype); }
      catch (e) { // token de upload expiră → reînnoiește o dată și reîncearcă
        upload = await b2GetUploadUrl(session);
        await b2Upload(upload, key, buf, ctype);
      }
      await M.PcSongFile.updateOne({ _id: f._id }, { $set: { backupKey: key, backupAt: new Date() } });
      copied++;
    } catch (e) { errors++; log(`  ! backup ${f._id} (${f.name}): ${e.message}`); }
    if (++done % 50 === 0) log(`  …${done}/${pending.length} (ok ${copied}, err ${errors})`);
  }
  const remaining = await M.PcSongFile.countDocuments(q);
  log(`[songsBackup] gata: ${copied} copiate, ${errors} erori, ${remaining} rămase pt. următoarea rulare`);
  return { copied, errors, remaining };
}

module.exports = { isB2Configured, backupNewFiles };
