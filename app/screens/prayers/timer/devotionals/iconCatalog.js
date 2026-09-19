/**
 * Catalog curatoriat de iconite (din @expo/vector-icons) pentru devotionale.
 * Grupate pe categorii si cu cuvinte-cheie pentru cautare. Fara pachet nou.
 */
export const ICON_CATALOG = [
  {
    category: "Închinare",
    items: [
      { set: "material", name: "hands-pray", kw: "inchinare rugaciune maini worship" },
      { set: "material", name: "church", kw: "biserica church inchinare" },
      { set: "material", name: "candle", kw: "lumanare candle lumina" },
      { set: "material", name: "cross", kw: "cruce cross" },
      { set: "material", name: "peace", kw: "pace peace" },
      { set: "ionicons", name: "sparkles-outline", kw: "slava glorie sparkles" },
    ],
  },
  {
    category: "Rugăciune",
    items: [
      { set: "material", name: "meditation", kw: "meditatie rugaciune liniste" },
      { set: "ionicons", name: "heart-outline", kw: "inima dragoste iubire" },
      { set: "material", name: "hand-heart", kw: "daruire inima mana" },
      { set: "ionicons", name: "flame-outline", kw: "foc pasiune flacara" },
      { set: "ionicons", name: "infinite-outline", kw: "vesnic infinit" },
      { set: "ionicons", name: "bulb-outline", kw: "idee lumina revelatie" },
    ],
  },
  {
    category: "Cuvânt",
    items: [
      { set: "ionicons", name: "book-outline", kw: "carte biblie cuvant citire" },
      { set: "material", name: "book-cross", kw: "biblie cuvant scriptura" },
      { set: "ionicons", name: "journal-outline", kw: "jurnal notite scriere" },
      { set: "ionicons", name: "bookmark-outline", kw: "semn carte marcaj" },
      { set: "ionicons", name: "chatbubble-ellipses-outline", kw: "vorbire mesaj cuvant" },
      { set: "ionicons", name: "reader-outline", kw: "citire text lectura" },
    ],
  },
  {
    category: "Recunoștință",
    items: [
      { set: "ionicons", name: "happy-outline", kw: "bucurie fericire zambet" },
      { set: "ionicons", name: "star-outline", kw: "stea recunostinta" },
      { set: "ionicons", name: "ribbon-outline", kw: "premiu multumire" },
      { set: "ionicons", name: "gift-outline", kw: "dar cadou binecuvantare" },
      { set: "ionicons", name: "hand-left-outline", kw: "mana daruire" },
      { set: "ionicons", name: "thumbs-up-outline", kw: "apreciere multumire" },
    ],
  },
  {
    category: "Natură",
    items: [
      { set: "ionicons", name: "flower-outline", kw: "floare natura" },
      { set: "ionicons", name: "leaf-outline", kw: "frunza natura crestere" },
      { set: "ionicons", name: "sunny-outline", kw: "soare dimineata lumina" },
      { set: "ionicons", name: "moon-outline", kw: "luna noapte seara" },
      { set: "ionicons", name: "water-outline", kw: "apa rau viata" },
      { set: "ionicons", name: "planet-outline", kw: "creatie univers" },
    ],
  },
  {
    category: "Ritm",
    items: [
      { set: "ionicons", name: "time-outline", kw: "timp ceas" },
      { set: "ionicons", name: "musical-notes-outline", kw: "muzica cantec note" },
      { set: "material", name: "guitar-acoustic", kw: "chitara muzica inchinare" },
      { set: "ionicons", name: "walk-outline", kw: "plimbare miscare" },
      { set: "ionicons", name: "cafe-outline", kw: "cafea dimineata liniste" },
      { set: "ionicons", name: "people-outline", kw: "oameni comunitate grup" },
    ],
  },
];

const FLAT = ICON_CATALOG.flatMap((g) => g.items.map((it) => ({ ...it, category: g.category })));

/**
 * Filtreaza catalogul dupa un termen de cautare (nume sau cuvinte-cheie).
 */
export const searchIcons = (query) => {
  const q = query.trim().toLowerCase();
  if (!q) return ICON_CATALOG;
  const items = FLAT.filter(
    (it) => it.name.toLowerCase().includes(q) || it.kw.includes(q)
  );
  return [{ category: "Rezultate", items }];
};
