import AsyncStorage from "@react-native-async-storage/async-storage";
import { CONFIG } from "../config";

const getKey = (key) => CONFIG.CACHE_KEY_PREFIX + key;

export const cache = {
  set: async (key, data, duration = CONFIG.CACHE_DURATION) => {
    const item = {
      data,
      expiry: Date.now() + duration,
    };
    await AsyncStorage.setItem(getKey(key), JSON.stringify(item));
  },

  get: async (key) => {
    const item = await AsyncStorage.getItem(getKey(key));
    if (!item) return null;

    const parsed = JSON.parse(item);
    if (Date.now() > parsed.expiry) {
      await AsyncStorage.removeItem(getKey(key));
      return null;
    }

    return parsed.data;
  },

  remove: async (key) => {
    await AsyncStorage.removeItem(getKey(key));
  },

  clear: async () => {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CONFIG.CACHE_KEY_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  },
};
