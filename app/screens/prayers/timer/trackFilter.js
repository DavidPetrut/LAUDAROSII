/**
 * Verifica daca URL-ul unei piese e redabil de expo-audio: http(s) direct catre
 * un fisier audio. Link-urile YouTube (si intrarile fara URL) nu sunt redabile.
 */
const isPlayableUrl = (url) => {
  const u = String(url || "");
  if (!/^https?:\/\//i.test(u)) return false;
  if (/youtube\.com|youtu\.be/i.test(u)) return false;
  return true;
};

/**
 * Selecteaza doar piesele dintr-o singura categorie (instrumental / lyrics) cu URL
 * redabil. Exclude intrarile fara categorie sau cu link-uri neredabile, ca sa nu
 * se amestece genurile si sa nu apara piese "mute" la swipe.
 */
export const pickTracks = (playlist, category) =>
  (playlist || []).filter((t) => t.category === category && isPlayableUrl(t.url));
