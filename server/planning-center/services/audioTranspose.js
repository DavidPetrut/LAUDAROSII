/**
 * Transpose AUDIO (mp3 / YouTube) — background job.
 * Pipeline: download (ytdl pt. YouTube / fetch pt. mp3) → ffmpeg pitch-shift (asetrate/atempo,
 * păstrează tempo-ul) → upload Cloudinary (raw) → PcSongFile nou în cardul gamei țintă.
 *
 * Job-urile trăiesc în memorie (Map). Statusul se citește prin GET .../transpose-audio/:jobId.
 * NOTĂ: ytdl-core e punctul fragil (YouTube poate bloca). ffmpeg vine din ffmpeg-static (fără binar de sistem).
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
const ytdl = require("@distube/ytdl-core");
const cloudinary = require("cloudinary").v2;

ffmpeg.setFfmpegPath(ffmpegPath);

// Cloudinary (aceeași config ca uploads.js)
if (process.env.CLOUDINARY_URL) { /* auto */ }
else if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
}

const NOTE = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const keyIdx = (k) => NOTE[String(k || "C").replace(/m$/, "").trim()] ?? 0;
function semitones(from, to) {
  let d = (keyIdx(to) - keyIdx(from) + 12) % 12;
  if (d > 6) d -= 12; // alege direcția cea mai apropiată (−5..+6)
  return d;
}

const jobs = new Map(); // jobId -> { phase, percent, done, error, fileId, fileName }
const get = (jobId) => jobs.get(jobId) || null;

const isYouTube = (url) => /(?:youtube\.com\/|youtu\.be\/)/i.test(String(url || ""));

function start({ orgId, songId, arrId, keyId, sourceUrl, fromKey, toKey, name }) {
  const jobId = crypto.randomBytes(8).toString("hex");
  const job = { phase: "start", percent: 0, done: false, error: "", fileId: null, fileName: name, startedAt: Date.now() };
  jobs.set(jobId, job);
  run(jobId, { orgId, songId, arrId, keyId, sourceUrl, fromKey, toKey, name }).catch((e) => {
    const j = jobs.get(jobId); if (j) { j.error = String(e?.message || e); j.phase = "error"; }
  });
  return jobId;
}

async function run(jobId, { orgId, songId, arrId, keyId, sourceUrl, fromKey, toKey, name }) {
  const job = jobs.get(jobId);
  const tmp = os.tmpdir();
  const inFile = path.join(tmp, `pc_in_${jobId}`);
  const outFile = path.join(tmp, `pc_out_${jobId}.mp3`);
  const cleanup = () => { [inFile, outFile].forEach((f) => { try { fs.unlinkSync(f); } catch {} }); };

  try {
    // 1) DOWNLOAD
    job.phase = "download"; job.percent = 0;
    if (isYouTube(sourceUrl)) {
      await new Promise((resolve, reject) => {
        const stream = ytdl(sourceUrl, { filter: "audioonly", quality: "highestaudio" });
        const out = fs.createWriteStream(inFile);
        stream.on("progress", (_chunk, done, total) => { if (total) job.percent = Math.round((done / total) * 100); });
        stream.on("error", reject);
        out.on("error", reject);
        out.on("finish", resolve);
        stream.pipe(out);
      });
    } else {
      const res = await fetch(sourceUrl);
      if (!res.ok) throw new Error(`download ${res.status}`);
      const total = Number(res.headers.get("content-length")) || 0;
      const fileStream = fs.createWriteStream(inFile);
      const reader = res.body.getReader();
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        got += value.length; if (total) job.percent = Math.round((got / total) * 100);
        await new Promise((r, j) => fileStream.write(Buffer.from(value), (e) => (e ? j(e) : r())));
      }
      await new Promise((r) => fileStream.end(r));
    }

    // 2) PITCH-SHIFT
    job.phase = "transpose"; job.percent = 0;
    const d = semitones(fromKey, toKey);
    const ratio = Math.pow(2, d / 12);
    await new Promise((resolve, reject) => {
      const cmd = ffmpeg(inFile).audioCodec("libmp3lame").audioBitrate("192k");
      // FĂRĂ normalizare (strica calitatea) — păstrăm sunetul cât mai aproape de original.
      if (d !== 0) cmd.audioFilters([`aresample=44100`, `asetrate=44100*${ratio.toFixed(6)}`, `aresample=44100`, `atempo=${(1 / ratio).toFixed(6)}`]);
      cmd.on("progress", (p) => { if (p.percent) job.percent = Math.min(99, Math.round(p.percent)); })
        .on("error", reject)
        .on("end", resolve)
        .save(outFile);
    });

    // 3) UPLOAD — audio ca "video" (Cloudinary tratează audio sub video): limită ~100MB,
    // nu 10MB ca la "raw". upload_large urcă în bucăți (robust pt. fișiere mari).
    job.phase = "upload"; job.percent = 0;
    const folder = `pc/${orgId || "org"}`;
    const publicId = `${name.replace(/[^\w-]+/g, "_").slice(0, 60)}_${Date.now().toString(36)}`;
    const up = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_large(
        outFile,
        { resource_type: "video", format: "mp3", folder, public_id: publicId, use_filename: false, unique_filename: false, chunk_size: 6 * 1024 * 1024 },
        (err, result) => (err ? reject(err) : resolve(result))
      );
    });

    // 4) CREATE FILE
    const { PcSongFile } = require("../models");
    const doc = await PcSongFile.create({
      orgId, songId, arrangementId: arrId, keyId: keyId || null, scope: keyId ? "key" : "arrangement",
      kind: "audio", name, url: up.secure_url, source: "generated",
    });
    job.fileId = String(doc._id); job.phase = "done"; job.percent = 100; job.done = true;
  } finally {
    cleanup();
    // păstrează jobul 5 min pt. citirea statusului, apoi curăță
    setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
  }
}

module.exports = { start, get, isYouTube, configured: () => !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) };
