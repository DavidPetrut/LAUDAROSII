/**
 * @TEST-DATA: PRODUCTION NEXT
 * Vezi PRODUCTION.md pentru instructiuni de deployment
 */
import { Platform } from "react-native";

// Pe web: localhost; pe telefon (nativ): IP-ul LAN al PC-ului
const LAN_IP = "192.168.1.137";
const BASE = Platform.OS === "web" ? "http://localhost:3000" : `http://${LAN_IP}:3000`;

export const CONFIG = {
  API_URL: `${BASE}/api`,
  SOCKET_URL: BASE,
  APP_URL: Platform.OS === "web" ? "http://localhost:8081" : BASE,

  APP_NAME: "Laudarosii Vertical",
  VERSION: "1.0.0",

  CACHE_DURATION: 5 * 60 * 1000,
  TOKEN_KEY: "authToken",
  CACHE_KEY_PREFIX: "laudarosii_cache_",
};

export const setApiUrl = (url) => {
  CONFIG.API_URL = url + "/api";
  CONFIG.SOCKET_URL = url;
};
