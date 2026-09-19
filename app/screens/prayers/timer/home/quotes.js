import quotesData from "./quotes.json";

// aplatizeaza toate categoriile intr-o singura lista {text, author}
const ALL = Object.values(quotesData).flat().filter((q) => q && q.text);

/**
 * Intoarce un citat aleator; optional il alege diferit de cel anterior, ca la
 * fiecare intrare in ecran sa apara alt citat.
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
