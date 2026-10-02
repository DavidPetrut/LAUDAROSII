import { Platform } from "react-native";

// Verificare si aplicare update OTA prin expo-updates (doar pe nativ)
export const checkForUpdate = async () => {
  if (Platform.OS === "web") {
    return { available: false, message: "Updates nu sunt disponibile pe web" };
  }

  try {
    const Updates = require("expo-updates");

    if (!Updates.isEnabled) {
      return { available: false, message: "Updates dezactivate in dev mode" };
    }

    const check = await Updates.checkForUpdateAsync();
    if (check.isAvailable) {
      return { available: true, message: "Update disponibil" };
    }
    return { available: false, message: "Esti la ultima versiune" };
  } catch (e) {
    return { available: false, message: "Nu s-a putut verifica" };
  }
};

export const applyUpdate = async () => {
  if (Platform.OS === "web") return;

  try {
    const Updates = require("expo-updates");
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch (e) {
    const { showError } = require("../../global/functions");
    showError("Eroare la instalarea update-ului");
  }
};

/**
 * Refresh instant intr-un singur pas: verifica, descarca si reporneste cu noul
 * bundle OTA (asa userul nu mai trebuie sa iasa/intre de mai multe ori).
 * Arunca eroare la probleme de retea (prinse de apelant). Daca nu exista update,
 * intoarce { reloaded:false, message } fara sa reporneasca.
 */
export const refreshNow = async () => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.location.reload();
    return { reloaded: true };
  }

  const Updates = require("expo-updates");
  if (!Updates.isEnabled) {
    return { reloaded: false, message: "Refresh disponibil doar în aplicația publicată" };
  }

  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) {
    return { reloaded: false, message: "Ești deja la zi" };
  }

  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
  return { reloaded: true };
};
