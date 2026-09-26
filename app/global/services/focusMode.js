import { Platform, Linking } from "react-native";
import { storage } from "../utils/storage";

let Notifications = null;
try {
  Notifications = require("expo-notifications");
} catch (e) {}

// Modul nativ Android pentru "Nu deranja" de sistem. Absent pe iOS / web / builduri
// vechi -> ramane null si feature-ul cade elegant pe suprimarea notificarilor proprii.
let FocusDnd = null;
try {
  FocusDnd = require("expo-modules-core").requireNativeModule("FocusDnd");
} catch (e) {}

export const isSystemDndSupported = () => {
  try {
    return Platform.OS === "android" && !!FocusDnd?.isSupported?.();
  } catch (e) {
    return false;
  }
};

export const isSystemDndGranted = () => {
  try {
    return !!FocusDnd?.isGranted?.();
  } catch (e) {
    return false;
  }
};

const KEY = "focusModeConfig";

// enabled: userul vrea "nu deranja" in timpul rugaciunii/devotionalului
// muteAppNotifs: opreste notificarile PROPRII ale aplicatiei pe durata sesiunii
let config = { enabled: false, muteAppNotifs: true };
let active = false;

const setHandler = (show) => {
  if (!Notifications?.setNotificationHandler) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: show,
      shouldPlaySound: show,
      shouldSetBadge: show,
    }),
  });
};

export const loadFocusConfig = async () => {
  try {
    const raw = await storage.getItem(KEY);
    if (raw) config = { ...config, ...JSON.parse(raw) };
  } catch (e) {}
  return { ...config };
};

export const saveFocusConfig = async (partial) => {
  config = { ...config, ...partial };
  try {
    await storage.setItem(KEY, JSON.stringify(config));
  } catch (e) {}
  return { ...config };
};

export const getFocusConfig = () => ({ ...config });

// Pornit DOAR in timpul unei sesiuni (rugaciune/devotional).
export const activateFocus = async () => {
  if (!config.enabled || active) return;
  active = true;
  if (config.muteAppNotifs) setHandler(false);
  try {
    if (Platform.OS === "android" && FocusDnd?.isGranted?.()) FocusDnd.setDnd(true);
  } catch (e) {}
};

export const deactivateFocus = async () => {
  if (!active) return;
  active = false;
  setHandler(true);
  try {
    if (Platform.OS === "android" && FocusDnd?.isGranted?.()) FocusDnd.setDnd(false);
  } catch (e) {}
};

// Deschide setarea de "Nu deranja" a telefonului (pentru apeluri/SMS/alte apps,
// pe care o aplicatie NU le poate bloca singura). Android: ecranul Zen/DND.
// iOS: nu exista API de Focus -> deschidem Setarile.
export const openSystemDnd = async () => {
  try {
    if (Platform.OS === "android") {
      if (FocusDnd?.openSettings) {
        FocusDnd.openSettings();
        return;
      }
      await Linking.sendIntent("android.settings.ZEN_MODE_PRIORITY_SETTINGS");
      return;
    }
    await Linking.openSettings();
  } catch (e) {
    try {
      await Linking.openSettings();
    } catch (err) {}
  }
};
