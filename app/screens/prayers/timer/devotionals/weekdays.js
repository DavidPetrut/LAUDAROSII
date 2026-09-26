// Zilele saptamanii: 1=Duminica .. 7=Sambata (ca in schema Devotional).
export const WD_ORDER = [2, 3, 4, 5, 6, 7, 1]; // Lu -> Du
export const WD_LABELS = { 1: "Du", 2: "Lu", 3: "Ma", 4: "Mi", 5: "Jo", 6: "Vi", 7: "Sa" };

// Etichetele zilelor asignate unui devotional, in ordine Lu..Du
export const daysBadge = (weekdays = []) =>
  WD_ORDER.filter((w) => weekdays.includes(w)).map((w) => WD_LABELS[w]);
