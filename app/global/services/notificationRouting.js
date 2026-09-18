/**
 * Rutarea notificarilor: cand userul apasa pe o notificare, o ducem la ecranul
 * potrivit in functie de data.screen. Fiecare ecran care emite notificari isi
 * pune propriul `screen` (si optional `params`) in data; aici traducem asta in
 * actiuni de navigatie. Tintele imbricate (ex: PrayerTimer) sunt mapate explicit.
 */
const NESTED_TARGETS = {
  PrayerTimer: { tab: "Prayers", stackScreen: "PrayerTimer" },
  PrayerAnalysis: { tab: "Prayers", stackScreen: "PrayerAnalysis" },
  Achievements: { tab: "Prayers", stackScreen: "Achievements" },
};

export const navigateFromNotification = (navigationRef, data = {}) => {
  if (!navigationRef?.isReady?.()) return;
  const screen = data?.screen;
  if (!screen) return;

  try {
    const nested = NESTED_TARGETS[screen];
    if (nested) {
      navigationRef.navigate("MainTabs", {
        screen: nested.tab,
        params: { screen: nested.stackScreen, params: data.params || {} },
      });
      return;
    }
    navigationRef.navigate(screen, data.params || {});
  } catch (e) {}
};
