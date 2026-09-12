import { Platform, Dimensions } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Updates from "expo-updates";

/**
 * Colecteaza context tehnic SIGUR pentru un raport de bug.
 *
 * REGULA DE AUR (GDPR / securitate): NU colectam NICIODATA date sensibile:
 *   - fara token-uri / parole / header-e Authorization
 *   - fara body-uri de request/response de retea
 *   - fara date personale in afara de userId + numele afisat (minim necesar)
 *
 * Tot ce e aici e menit sa ne ajute sa reproducem si sa localizam bug-ul rapid.
 */

// Breadcrumb minimal de retea: DOAR ultimul path + status, fara body/headers.
// Populat non-invaziv din functions/api daca vrem (optional). Momentan gol.
let lastApiBreadcrumb = null;
export const setLastApiBreadcrumb = (method, path, status) => {
  try {
    lastApiBreadcrumb = {
      method: String(method || "").toUpperCase(),
      path: String(path || "").split("?")[0], // fara query string (poate contine date)
      status: typeof status === "number" ? status : null,
      at: new Date().toISOString(),
    };
  } catch (e) {
    lastApiBreadcrumb = null;
  }
};

const safe = (fn, fallback = null) => {
  try {
    const v = fn();
    return v === undefined ? fallback : v;
  } catch (e) {
    return fallback;
  }
};

export const collectContext = () => {
  const win = safe(() => Dimensions.get("window"), { width: 0, height: 0, scale: 1, fontScale: 1 });

  return {
    // aplicatie
    appVersion: safe(() => Application.nativeApplicationVersion) || safe(() => Constants.expoConfig?.version) || null,
    buildVersion: safe(() => Application.nativeBuildVersion) || null,
    // OTA / updates
    runtimeVersion: safe(() => Updates.runtimeVersion) || null,
    updateId: safe(() => Updates.updateId) || null,
    channel: safe(() => Updates.channel) || null,
    isEmbeddedLaunch: safe(() => Updates.isEmbeddedLaunch),
    // platforma / device (fara identificatori personali)
    platform: Platform.OS,
    osVersion: String(safe(() => Platform.Version, "")),
    deviceName: safe(() => Constants.deviceName) || null,
    isDevice: safe(() => Constants.isDevice),
    // ecran
    screen: {
      width: Math.round(win.width),
      height: Math.round(win.height),
      scale: win.scale,
      fontScale: win.fontScale,
    },
    // limba (best-effort, fara dependinta noua)
    locale: safe(() => Intl.DateTimeFormat().resolvedOptions().locale) || null,
    // breadcrumb retea sigur
    lastApi: lastApiBreadcrumb,
    // moment
    reportedAt: new Date().toISOString(),
  };
};
