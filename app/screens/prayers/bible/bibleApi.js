import { api } from "../../../global/functions";
import { storage } from "../../../global/utils/storage";
import { CONFIG } from "../../../global/config";
import { DEFAULTS, STORAGE_KEYS } from "./constants";

// --- Retea (prin proxy-ul nostru /api/bible, nu direct la bolls) ---

export const fetchTranslations = () => api.get("/bible/translations");

export const fetchBooks = (translation) =>
  api.get(`/bible/books/${translation}`);

export const fetchChapter = (translation, book, chapter) =>
  api.get(`/bible/chapter/${translation}/${book}/${chapter}`);

export const fetchVerse = (translation, book, chapter, verse) =>
  api.get(`/bible/verse/${translation}/${book}/${chapter}/${verse}`);

export const fetchDictionary = (dict, strong) =>
  api.get(`/bible/dictionary/${dict}/${strong}`);

// Sursa audio (mp3) a unui capitol pentru expo-audio. Token in query fiindca
// elementul <audio> de pe web nu poate trimite header-e.
export const buildTtsSource = async (translation, book, chapter) => {
  const token = await storage.getItem(CONFIG.TOKEN_KEY);
  const q = token ? `?t=${encodeURIComponent(token)}` : "";
  return { uri: `${CONFIG.API_URL}/bible/tts/${translation}/${book}/${chapter}${q}` };
};

// Sparge un verset tagat Strong's (ex. KJV: "In<S>1722</S> the beginning<S>746</S>")
// in token-uri { text, strong } - strong e null pentru bucatile netagate.
export const parseStrongs = (raw) => {
  const tokens = [];
  const re = /(.*?)<S>(\d+)<\/S>/g;
  let last = 0;
  let m;
  while ((m = re.exec(raw))) {
    tokens.push({ text: m[1].replace(/<[^>]*>/g, ""), strong: m[2] });
    last = re.lastIndex;
  }
  const tail = stripHtml(raw.slice(last));
  if (tail) tokens.push({ text: (last ? " " : "") + tail, strong: null });
  return tokens;
};

// Formateaza definitia unui lexicon (HTML) in text lizibil, pastrand paragrafele.
export const formatLexicon = (html) =>
  String(html || "")
    .replace(/<\s*(p|br|li|\/li|\/p)[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// Curata textul de tag-uri HTML (note de subsol <sup>, tag-uri Strong's etc.)
// pentru afisare ca text simplu - fara HTML injection pe web.
export const stripHtml = (raw) =>
  String(raw || "")
    .replace(/<sup[^>]*>.*?<\/sup>/gis, "")
    .replace(/<S>\d+<\/S>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

// --- Persistenta setari + ultima pozitie ---

const readJSON = async (key, fallback) => {
  try {
    const raw = await storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};

export const loadSettings = async () => {
  const [primary, compare, fontScale, position] = await Promise.all([
    storage.getItem(STORAGE_KEYS.primary),
    readJSON(STORAGE_KEYS.compare, DEFAULTS.compare),
    storage.getItem(STORAGE_KEYS.fontScale),
    readJSON(STORAGE_KEYS.position, DEFAULTS.position),
  ]);
  return {
    primary: primary || DEFAULTS.primary,
    compare: Array.isArray(compare) ? compare : DEFAULTS.compare,
    fontScale: parseFloat(fontScale) || DEFAULTS.fontScale,
    position: position && position.book ? position : DEFAULTS.position,
  };
};

export const savePrimary = (code) => storage.setItem(STORAGE_KEYS.primary, code);

export const saveCompare = (codes) =>
  storage.setItem(STORAGE_KEYS.compare, JSON.stringify(codes));

export const saveFontScale = (scale) =>
  storage.setItem(STORAGE_KEYS.fontScale, String(scale));

export const savePosition = (position) =>
  storage.setItem(STORAGE_KEYS.position, JSON.stringify(position));
