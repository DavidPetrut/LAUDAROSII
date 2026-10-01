const express = require("express");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { authMiddleware } = require("../middleware");

const router = express.Router();

const BOLLS_BASE = "https://bolls.life";
const ELEVEN_BASE = "https://api.elevenlabs.io/v1/text-to-speech";

// Traducerile permise la proxy (whitelist anti-SSRF). Codurile ajung direct in
// URL-ul upstream, deci NU acceptam nimic din afara acestei liste.
const TRANSLATIONS = [
  { code: "VDCL", name: "Cornilescu 1931", lang: "Română", group: "ro" },
  { code: "NTR", name: "Noua Traducere Românească", lang: "Română", group: "ro" },
  { code: "KJV", name: "King James Version", lang: "English", group: "en" },
  { code: "ASV", name: "American Standard Version", lang: "English", group: "en" },
  { code: "YLT", name: "Young's Literal", lang: "English", group: "en" },
  { code: "TR", name: "Textus Receptus", lang: "Ελληνικά (NT)", group: "orig" },
  { code: "SBLGNT", name: "SBL Greek NT", lang: "Ελληνικά (NT)", group: "orig" },
  { code: "WLC", name: "Westminster Leningrad", lang: "עברית (VT)", group: "orig" },
  { code: "LXX", name: "Septuaginta", lang: "Ελληνικά (VT)", group: "orig" },
];
const ALLOWED = new Set(TRANSLATIONS.map((t) => t.code));

// Lexicoane Strong's permise la proxy (whitelist).
const DICTIONARIES = new Set(["BDBT", "SCGES", "SECE", "RUSD"]);
// Numar Strong valid: G/H urmat de cifre (G=greaca/NT, H=ebraica/VT).
const STRONG_RE = /^[GH]\d{1,5}$/;

// Cache in-memory: textul biblic e static, deci il tinem mult si evitam apeluri
// repetate la bolls.life. Plafon de intrari ca sa nu creasca memoria la nesfarsit.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 800;
const cache = new Map();

const getCached = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    cache.delete(key);
    return null;
  }
  return hit.data;
};

const setCached = (key, data) => {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { data, exp: Date.now() + CACHE_TTL_MS });
};

// Numere pozitive rezonabile pentru carte/capitol/verset (upstream valideaza fin).
const toNum = (v, max) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 && n <= max ? n : null;
};

const isValidTranslation = (t) => typeof t === "string" && ALLOWED.has(t);

// Preia si cache-uieste un JSON de la bolls.life; arunca la esec de retea/upstream.
const fetchBolls = async (path) => {
  const cached = getCached(path);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let res;
  try {
    res = await fetch(`${BOLLS_BASE}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const err = new Error(`Upstream ${res.status}`);
    err.status = 502;
    throw err;
  }
  const data = await res.json();
  setCached(path, data);
  return data;
};

/**
 * GET /bible/translations - lista curata de traduceri permise (pentru pickere).
 */
router.get("/translations", authMiddleware, (req, res) => {
  res.json({ translations: TRANSLATIONS });
});

/**
 * GET /bible/books/:translation - cartile unei traduceri (nume + nr capitole).
 */
router.get("/books/:translation", authMiddleware, async (req, res) => {
  const { translation } = req.params;
  if (!isValidTranslation(translation)) {
    return res.status(400).json({ error: "Traducere invalidă" });
  }
  try {
    const books = await fetchBolls(`/get-books/${translation}/`);
    res.json({ books });
  } catch (e) {
    res.status(e.status || 500).json({ error: "Eroare la încărcarea cărților" });
  }
});

/**
 * GET /bible/chapter/:translation/:book/:chapter - versetele unui capitol.
 */
router.get("/chapter/:translation/:book/:chapter", authMiddleware, async (req, res) => {
  const { translation } = req.params;
  const book = toNum(req.params.book, 100);
  const chapter = toNum(req.params.chapter, 200);
  if (!isValidTranslation(translation) || !book || !chapter) {
    return res.status(400).json({ error: "Parametri invalizi" });
  }
  try {
    const verses = await fetchBolls(`/get-text/${translation}/${book}/${chapter}/`);
    res.json({ verses });
  } catch (e) {
    res.status(e.status || 500).json({ error: "Eroare la încărcarea capitolului" });
  }
});

/**
 * GET /bible/verse/:translation/:book/:chapter/:verse - un singur verset (comparare).
 */
router.get("/verse/:translation/:book/:chapter/:verse", authMiddleware, async (req, res) => {
  const { translation } = req.params;
  const book = toNum(req.params.book, 100);
  const chapter = toNum(req.params.chapter, 200);
  const verse = toNum(req.params.verse, 200);
  if (!isValidTranslation(translation) || !book || !chapter || !verse) {
    return res.status(400).json({ error: "Parametri invalizi" });
  }
  try {
    const data = await fetchBolls(`/get-verse/${translation}/${book}/${chapter}/${verse}/`);
    res.json({ verse: data });
  } catch (e) {
    res.status(e.status || 500).json({ error: "Eroare la încărcarea versetului" });
  }
});

/**
 * GET /bible/dictionary/:dict/:strong - definitie Strong's dintr-un lexicon (radacina cuvantului).
 */
router.get("/dictionary/:dict/:strong", authMiddleware, async (req, res) => {
  const { dict, strong } = req.params;
  if (!DICTIONARIES.has(dict) || !STRONG_RE.test(strong)) {
    return res.status(400).json({ error: "Parametri invalizi" });
  }
  try {
    const data = await fetchBolls(`/dictionary-definition/${dict}/${strong}/`);
    const entry = Array.isArray(data) ? data[0] : data;
    res.json({ entry: entry || null });
  } catch (e) {
    res.status(e.status || 500).json({ error: "Eroare la încărcarea definiției" });
  }
});

// --- Text-to-speech (citirea cu voce) prin ElevenLabs, cu cache pe disc ---

const TTS_DIR = path.join(__dirname, "..", "cache", "bible-tts");
const TTS_MAX_TOTAL = 40000; // plafon caractere/capitol (control cost)
const TTS_CHUNK = 9000; // max per apel ElevenLabs

// Curata textul unui verset pentru citit cu voce (fara note, taguri, referinte).
const plainVerse = (raw) =>
  String(raw || "")
    .replace(/<sup[^>]*>.*?<\/sup>/gis, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const chunkText = (text) => {
  const chunks = [];
  let rest = text;
  while (rest.length > TTS_CHUNK) {
    let cut = rest.lastIndexOf(" ", TTS_CHUNK);
    if (cut < TTS_CHUNK * 0.5) cut = TTS_CHUNK;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.trim()) chunks.push(rest);
  return chunks;
};

// Genereaza audio pentru un text prin ElevenLabs (mp3 Buffer).
const elevenTts = async (text) => {
  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voice) {
    const err = new Error("TTS neconfigurat");
    err.status = 503;
    throw err;
  }
  const model = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
  // 192 kbps (perk de plan) - calitate buna, acelasi cost (creditele sunt pe caractere, nu pe bitrate).
  const res = await fetch(`${ELEVEN_BASE}/${voice}?output_format=mp3_44100_192`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: { stability: 0.8, similarity_boost: 0.9, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    const err = new Error(`ElevenLabs ${res.status}`);
    err.status = 502;
    throw err;
  }
  return Buffer.from(await res.arrayBuffer());
};

// Permite token si prin query (?t=), fiindca <audio> pe web nu trimite header-e.
const tokenFromQuery = (req, res, next) => {
  if (!req.headers.authorization && req.query.t) {
    req.headers.authorization = `Bearer ${req.query.t}`;
  }
  next();
};

/**
 * GET /bible/tts/:translation/:book/:chapter - audio (mp3) al unui capitol, cu cache pe disc.
 */
router.get("/tts/:translation/:book/:chapter", tokenFromQuery, authMiddleware, async (req, res) => {
  const { translation } = req.params;
  const book = toNum(req.params.book, 100);
  const chapter = toNum(req.params.chapter, 200);
  if (!isValidTranslation(translation) || !book || !chapter) {
    return res.status(400).json({ error: "Parametri invalizi" });
  }

  // Cache GLOBAL pe disc: o data generat un capitol (per versiune+voce+model), e servit
  // tuturor userilor - nu se mai consuma credite la urmatoarele ascultari.
  const voice = process.env.ELEVENLABS_VOICE_ID || "default";
  const model = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
  const file = path.join(TTS_DIR, `${translation}-${book}-${chapter}-${voice}-${model}.mp3`);

  try {
    if (fs.existsSync(file)) {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=604800");
      return res.sendFile(file);
    }

    const data = await fetchBolls(`/get-text/${translation}/${book}/${chapter}/`);
    const text = (Array.isArray(data) ? data : [])
      .map((v) => plainVerse(v.text))
      .filter(Boolean)
      .join(" ")
      .slice(0, TTS_MAX_TOTAL);
    if (!text) return res.status(404).json({ error: "Capitol gol" });

    const parts = [];
    for (const piece of chunkText(text)) {
      parts.push(await elevenTts(piece));
    }
    const audio = Buffer.concat(parts);

    await fsp.mkdir(TTS_DIR, { recursive: true });
    await fsp.writeFile(file, audio);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=604800");
    res.send(audio);
  } catch (e) {
    const status = e.status || 500;
    const msg =
      status === 503
        ? "Audio neconfigurat pe server"
        : "Eroare la generarea audio";
    res.status(status).json({ error: msg });
  }
});

module.exports = router;
