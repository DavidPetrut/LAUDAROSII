import { Platform } from "react-native";
import { storage } from "./utils/storage";

// Adresa serverului de productie. Se schimba aici dupa deployment.
const PRODUCTION_BASE = "https://laudarosii-api.onrender.com";

// In development (expo start) se foloseste serverul local de pe PC.
const LAN_IP = "192.168.1.137";
const DEV_BASE =
  Platform.OS === "web" ? "http://localhost:3000" : `http://${LAN_IP}:3000`;

const DEFAULT_BASE = __DEV__ ? DEV_BASE : PRODUCTION_BASE;

const OVERRIDE_KEY = "laudarosii_server_base";

const normalize = (url) => url.trim().replace(/\/+$/, "");

const isWeb = Platform.OS === "web";

export const CONFIG = {
  SERVER_BASE: DEFAULT_BASE,
  API_URL: `${DEFAULT_BASE}/api`,
  SOCKET_URL: DEFAULT_BASE,
  // Adresa aplicatiei web, folosita pentru link-urile de partajare.
  APP_URL: isWeb ? "http://localhost:8081" : DEFAULT_BASE,

  APP_NAME: "Laudarosii Vertical",
  VERSION: "1.0.0",

  CACHE_DURATION: 5 * 60 * 1000,
  TOKEN_KEY: "authToken",
  CACHE_KEY_PREFIX: "laudarosii_cache_",
};

const applyBase = (base) => {
  const clean = normalize(base);
  CONFIG.SERVER_BASE = clean;
  CONFIG.API_URL = `${clean}/api`;
  CONFIG.SOCKET_URL = clean;
  if (!isWeb) CONFIG.APP_URL = clean;
};

// Trebuie apelat la pornirea aplicatiei, inainte de orice cerere de retea.
export const initApiUrl = async () => {
  try {
    const saved = await storage.getItem(OVERRIDE_KEY);
    if (saved) applyBase(saved);
  } catch (e) {}
};

export const setApiUrl = async (base) => {
  applyBase(base);
  await storage.setItem(OVERRIDE_KEY, normalize(base));
};

export const resetApiUrl = async () => {
  applyBase(DEFAULT_BASE);
  await storage.deleteItem(OVERRIDE_KEY);
};

export const getDefaultBase = () => DEFAULT_BASE;
