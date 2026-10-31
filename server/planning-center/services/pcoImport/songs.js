/**
 * Import PCO → felia Songs (one-time, reutilizabil, IDEMPOTENT pe (orgId, remoteSource:"pco", remoteId)).
 * Mapare 1:1 cu structura PCO, FĂRĂ să amestece nimic:
 *   Song        → PcSong
 *   Arrangement → PcArrangement (+ wordsText din `lyrics`, + sortOrder = ordinea PCO)
 *   chord_chart → PcSongFile master ChordPro (remoteId „cc-<arrId>") → din el derivăm „Chord Chart in <gamă>",
 *                 Numbers, Lyrics pt. FIECARE gamă (zero fișiere, transpunere live) exact ca PCO.
 *   Key         → PcKey (fiecare gamă = containerul ei)
 *   Attachments → PcSongFile:
 *                   AttachmentChart::*  = chart auto-generat de PCO → SĂRIT (îl derivăm noi din master)
 *                   YouTube / Link      = păstrat ca LINK (url = attachment_url via /open)
 *                   S3 (fișier real)    = DESCĂRCAT din PCO (/open) + REURCAT pe Cloudinary (independent)
 *                 Scope pe GAMĂ dacă numele fișierului conține gama lui (ex. „...-Db.m4a"), altfel pe aranjament.
 *
 * Deloc distructiv: upsert pe remoteId (re-rulabil). Nu atinge melodiile create manual (remoteSource gol).
 */
const M = require("../../models");
const SOURCE = "pco";
const A = (r) => r.attributes || {};
const PCO_BASE = "https://api.planningcenteronline.com/services/v2";

// Cloudinary (reutilizează contul vostru, ca /uploads). Lazy + tolerant.
let cloudinary = null, cloudOk = false;
try {
  cloudinary = require("cloudinary").v2;
  if (process.env.CLOUDINARY_URL) cloudOk = true;
  else if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    cloudOk = true;
  }
} catch (e) { /* fără rehost */ }

const themesArr = (s) => String(s || "").split(/[,;]/).map((x) => x.trim()).filter(Boolean);
const keyStr = (k, minor) => { k = String(k || "").trim(); if (!k) return ""; return minor && !/m$/i.test(k) ? k + "m" : k; };
const AUDIO_RX = /^audio\//i;

/** Găsește gama (din lista aranjamentului) codificată la finalul numelui fișierului: „...-Db.m4a", „... in G.pdf". */
function keyFromFilename(name, keys) {
  const base = String(name || "").replace(/\.[a-z0-9]+$/i, "");
  const m = /(?:[-_\s]|in\s+)([A-G][b#]?m?)\s*$/i.exec(base);
  if (!m) return null;
  const cand = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  return keys.find((k) => String(k.startKey).toLowerCase() === cand.toLowerCase()) || null;
}

class SongsImporter {
  constructor({ client, orgId, dryRun = true, withFiles = false, limit = 0, log = console.log }) {
    this.c = client; this.orgId = orgId; this.dry = dryRun; this.withFiles = withFiles; this.limit = limit; this.log = log;
    this.rep = {
      songs: { created: 0, updated: 0 }, arrangements: { created: 0, updated: 0 }, keys: { created: 0, updated: 0 },
      chordCharts: 0, words: 0, links: 0, skippedCharts: 0,
      files: { created: 0, skipped: 0, errors: 0, plannedBytes: 0, doneBytes: 0 }, errors: 0,
    };
  }

  async upsert(Model, remoteId, fields) {
    if (this.dry) { const ex = await Model.exists({ orgId: this.orgId, remoteSource: SOURCE, remoteId }); return { _id: null, _created: !ex }; }
    const ex = await Model.findOne({ orgId: this.orgId, remoteSource: SOURCE, remoteId }).select("_id").lean();
    const doc = await Model.findOneAndUpdate(
      { orgId: this.orgId, remoteSource: SOURCE, remoteId },
      { $set: { ...fields, orgId: this.orgId, remoteSource: SOURCE, remoteId } },
      { upsert: true, new: true }
    ).select("_id").lean();
    return { _id: doc._id, _created: !ex };
  }

  async openUrl(attId) {
    try {
      const r = await fetch(`${PCO_BASE}/attachments/${attId}/open`, { method: "POST", headers: { Authorization: this.c.auth, Accept: "application/json" } });
      if (!r.ok) return "";
      const j = await r.json();
      return (j && j.data && j.data.attributes && j.data.attributes.attachment_url) || "";
    } catch { return ""; }
  }

  async rehost(attId, name, isAudio) {
    const url = await this.openUrl(attId);
    if (!url) throw new Error("fără attachment_url");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const folder = `pc/${this.orgId}`;
    const m = String(name).match(/^(.*?)(\.[^.]+)?$/);
    const base = (m[1] || "file").replace(/[^\w-]+/g, "_").slice(0, 60) || "file";
    const ext = (m[2] || (isAudio ? ".mp3" : "")).toLowerCase();
    const publicId = `${base}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${ext}`;
    const result = await new Promise((resolve, reject) => {
      const st = cloudinary.uploader.upload_stream(
        { resource_type: isAudio ? "video" : "raw", folder, public_id: publicId, use_filename: false, unique_filename: false, timeout: 180000 },
        (e, r) => (e ? reject(e) : resolve(r))
      );
      st.end(buf);
    });
    return result.secure_url;
  }

  async attachment(f, { songId, arrId, keyList }) {
    const a = A(f);
    const t = a.pco_type || "";
    if (/^AttachmentChart::/.test(t)) { this.rep.skippedCharts++; return; } // derivat la noi din master
    const name = String(a.filename || a.display_name || "Fișier").trim();
    const matchKey = keyFromFilename(name, keyList);
    const scope = matchKey ? "key" : "arrangement";
    const keyId = matchKey ? matchKey.localId : null;
    const bytes = Number(a.file_size) || 0;
    const isLink = /youtube|vimeo|link/i.test(t) || (!bytes && (a.remote_link || a.linked_url));
    const isAudio = AUDIO_RX.test(a.content_type || "") || a.filetype === "audio" || a.filetype === "music";

    if (isLink) {
      this.rep.links++;
      if (this.dry) return;
      const url = await this.openUrl(f.id);
      if (!url) { this.rep.files.errors++; return; }
      await this.upsert(M.PcSongFile, f.id, { songId, arrangementId: arrId, keyId, scope, kind: "link", name, url, source: "link" });
      return;
    }

    // Fișier real.
    this.rep.files.plannedBytes += bytes;
    if (this.dry) { this.rep.files.created++; return; }
    if (!this.withFiles) { this.rep.files.skipped++; return; }
    if (!cloudOk) { this.rep.files.errors++; return; }
    const existing = await M.PcSongFile.findOne({ orgId: this.orgId, remoteSource: SOURCE, remoteId: f.id }).select("url").lean();
    if (existing && existing.url) { this.rep.files.skipped++; return; } // deja reurcat (re-rulare)
    try {
      const url = await this.rehost(f.id, name, isAudio);
      await this.upsert(M.PcSongFile, f.id, {
        songId, arrangementId: arrId, keyId, scope,
        kind: isAudio ? "audio" : "other", name, url, source: "upload",
        audioAccess: a.allow_mp3_download ? "download" : "stream",
      });
      this.rep.files.created++; this.rep.files.doneBytes += bytes;
    } catch (e) { this.rep.files.errors++; this.log(`    ! file ${f.id} (${name}): ${e.message}`); }
  }

  async song(s) {
    const a = A(s);
    const song = await this.upsert(M.PcSong, s.id, {
      title: a.title || "Untitled",
      author: a.author || "",
      ccli: a.ccli_number != null ? String(a.ccli_number) : "",
      copyrightYear: a.copyright || "",
      administration: a.admin || "",
      notes: a.notes || "",
      themes: themesArr(a.themes),
      archived: !!a.hidden,
    });
    this.rep.songs[song._created ? "created" : "updated"]++;

    const arrs = await this.c.getAll(`/songs/${s.id}/arrangements`);
    let defaultKey = "", idx = 0;
    for (const ar of (arrs.data || [])) {
      const aa = A(ar);
      if (!defaultKey) defaultKey = String(aa.chord_chart_key || "").trim();
      const wordsText = String(aa.lyrics || "").trim();
      const arr = await this.upsert(M.PcArrangement, ar.id, {
        songId: song._id,
        name: aa.name || "Default Arrangement",
        bpm: aa.bpm != null ? Number(aa.bpm) : null,
        lengthSec: Number(aa.length) || 0,
        meter: aa.meter || "",
        sequence: Array.isArray(aa.sequence) ? aa.sequence.map(String) : [],
        notes: aa.notes || "",
        wordsText,
        sortOrder: idx++,
        archived: !!aa.archived_at,
      });
      this.rep.arrangements[arr._created ? "created" : "updated"]++;
      if (wordsText) this.rep.words++;

      // Master ChordPro (din el derivăm charturile per gamă + Numbers/Lyrics).
      const cc = String(aa.chord_chart || "");
      if (aa.has_chord_chart && cc.trim()) {
        this.rep.chordCharts++;
        if (!this.dry) await this.upsert(M.PcSongFile, `cc-${ar.id}`, {
          songId: song._id, arrangementId: arr._id, keyId: null, scope: "arrangement",
          kind: "chordChart", source: "chordpro", name: "Lyrics & Chords",
          chordpro: cc, originalKey: String(aa.chord_chart_key || "").trim(),
          formatting: { font: aa.chord_chart_font || "", size: aa.chord_chart_font_size || 16, chordColor: aa.chord_chart_chord_color || "", columns: aa.chord_chart_columns || 1 },
        });
      }

      // Game (fiecare = containerul ei).
      const ks = await this.c.getAll(`/songs/${s.id}/arrangements/${ar.id}/keys`);
      const keyList = []; let ki = 0;
      for (const k of (ks.data || [])) {
        const ka = A(k);
        const startKey = keyStr(ka.starting_key, ka.starting_minor) || "C";
        const kd = await this.upsert(M.PcKey, k.id, {
          arrangementId: arr._id, songId: song._id,
          startKey, endKey: keyStr(ka.ending_key, ka.ending_minor), description: ka.name || "", sortOrder: ki++,
        });
        this.rep.keys[kd._created ? "created" : "updated"]++;
        keyList.push({ startKey, localId: kd._id });
      }

      // Atașări.
      const atts = await this.c.getAll(`/songs/${s.id}/arrangements/${ar.id}/attachments`);
      for (const f of (atts.data || [])) await this.attachment(f, { songId: song._id, arrId: arr._id, keyList });
    }

    if (!this.dry && defaultKey) await M.PcSong.updateOne({ _id: song._id }, { $set: { defaultKey } });
  }

  async run() {
    const { data } = await this.c.getAll("/songs", { order: "title" });
    let songs = data || [];
    if (this.limit) songs = songs.slice(0, this.limit);
    this.log(`[songs] ${songs.length} melodii (dryRun=${this.dry}, withFiles=${this.withFiles}, cloudinary=${cloudOk})`);
    let i = 0;
    for (const s of songs) {
      i++;
      try { await this.song(s); }
      catch (e) { this.rep.errors++; this.log(`  ! song ${s.id} (${A(s).title}): ${e.message}`); }
      if (i % 20 === 0) this.log(`  …${i}/${songs.length} | files: ${this.rep.files.created} (${(this.rep.files.doneBytes / 1048576).toFixed(0)}MB) | links: ${this.rep.links} | err: ${this.rep.files.errors}`);
    }
    return this.rep;
  }
}

module.exports = { SongsImporter };
