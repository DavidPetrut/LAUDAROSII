import quotesData from "./quotes.json";
import { storage } from "../../../../global/utils/storage";

// aplatizeaza toate categoriile intr-o singura lista {text, author}
const ALL = Object.values(quotesData).flat().filter((q) => q && q.text);

const DAILY_KEY = "devotionalDailyQuote";
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/**
 * Intoarce un citat aleator; optional il alege diferit de cel anterior.
 */
export const randomQuote = (prev) => {
  if (ALL.length === 0) return { text: "", author: "" };
  if (ALL.length === 1) return ALL[0];
  let q = ALL[Math.floor(Math.random() * ALL.length)];
  let guard = 0;
  while (prev && q.text === prev.text && guard < 8) {
    q = ALL[Math.floor(Math.random() * ALL.length)];
    guard += 1;
  }
  return q;
};

/**
 * Citatul zilei: se alege o singura data pe zi si tine pana la miezul noptii.
 * Persistat local; la o zi noua se re-alege.
 */
export const getDailyQuote = async () => {
  if (ALL.length === 0) return { text: "", author: "" };
  try {
    const raw = await storage.getItem(DAILY_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved && saved.date === todayKey() && ALL[saved.i]) return ALL[saved.i];
  } catch {}
  const i = Math.floor(Math.random() * ALL.length);
  try {
    await storage.setItem(DAILY_KEY, JSON.stringify({ date: todayKey(), i }));
  } catch {}
  return ALL[i];
};
