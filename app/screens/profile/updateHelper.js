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
