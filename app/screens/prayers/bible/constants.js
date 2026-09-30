// Traduceri implicite (fallback daca serverul nu raspunde inca la /bible/translations).
// Serverul ramane sursa de adevar pentru ce e permis la proxy.
export const FALLBACK_TRANSLATIONS = [
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

export const GROUP_LABELS = {
  ro: "Română",
  en: "English",
  orig: "Limbi originale",
};

export const DEFAULTS = {
  primary: "VDCL",
  compare: ["NTR", "KJV"],
  fontScale: 1,
  position: { book: 43, chapter: 1 }, // Ioan 1
};

// Radacina cuvantului (Strong's): versiunea tagata din care luam maparea cuvant->numar
// si lexiconul implicit pentru definitii.
export const STRONG_TAGGED = "KJV";
export const DEFAULT_LEXICON = "BDBT";

export const FONT_MIN = 0.85;
export const FONT_MAX = 1.7;
export const FONT_STEP = 0.15;

export const STORAGE_KEYS = {
  primary: "bible_primary",
  compare: "bible_compare",
  fontScale: "bible_fontscale",
  position: "bible_pos",
};
