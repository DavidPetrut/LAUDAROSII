import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "devotional:progress";

const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/**
 * Salveaza progresul devotionalului curent (moment + timp ramas) pentru ziua de
 * azi. Reluarea e valabila doar in aceeasi zi calendaristica (reset la miezul noptii).
 */
export const saveProgress = async (devotionalId, taskIndex, remaining) => {
  try {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ devotionalId: String(devotionalId), taskIndex, remaining, day: dayKey() })
    );
  } catch (e) {}
};

/**
 * Intoarce progresul salvat pentru un devotional, doar daca e din ziua curenta si
 * are valori valide; altfel il curata si intoarce null.
 */
export const loadProgress = async (devotionalId) => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p.devotionalId !== String(devotionalId)) return null;
    if (p.day !== dayKey()) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }
    if (typeof p.taskIndex !== "number" || typeof p.remaining !== "number") return null;
    return { taskIndex: p.taskIndex, remaining: p.remaining };
  } catch (e) {
    return null;
  }
};

export const clearProgress = async () => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {}
};
