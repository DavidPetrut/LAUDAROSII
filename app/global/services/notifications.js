import { Platform } from "react-native";
import { api } from "../functions";

let Notifications = null;

if (Platform.OS !== "web") {
  Notifications = require("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export const registerForPushNotifications = async () => {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    await saveDeviceToken(token);

    return token;
  } catch (error) {
    return null;
  }
};

const saveDeviceToken = async (token) => {
  try {
    await api.post("/users/device-token", { token });
  } catch (e) {}
};

export const scheduleLocalNotification = async (title, body, data = {}) => {
  if (Platform.OS === "web" || !Notifications) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null,
  });
};

/**
 * Asigura canalul Android folosit de notificarile programate (repetabile).
 */
export const ensureNotificationChannel = async () => {
  if (Platform.OS !== "android" || !Notifications) return;
  try {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Memento-uri",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch (e) {}
};

/**
 * Programeaza o notificare locala repetabila saptamanal, cate una pentru fiecare zi.
 * weekdays: 1=Duminica ... 7=Sambata (conventia expo). Returneaza id-urile programate.
 */
export const scheduleWeeklyReminders = async ({
  title,
  body,
  data = {},
  weekdays = [],
  hour = 8,
  minute = 0,
}) => {
  if (Platform.OS === "web" || !Notifications) return [];
  await ensureNotificationChannel();

  const weeklyType =
    Notifications.SchedulableTriggerInputTypes?.WEEKLY || "weekly";
  const ids = [];

  for (const weekday of weekdays) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body, data },
        trigger: {
          type: weeklyType,
          weekday,
          hour,
          minute,
          ...(Platform.OS === "android" && { channelId: "reminders" }),
        },
      });
      ids.push(id);
    } catch (e) {}
  }
  return ids;
};

/**
 * Anuleaza o lista de notificari programate dupa id.
 */
export const cancelScheduledNotifications = async (ids = []) => {
  if (Platform.OS === "web" || !Notifications) return;
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {}
  }
};

export const addNotificationListener = (callback) => {
  if (Platform.OS === "web" || !Notifications) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationReceivedListener(callback);
};

export const addNotificationResponseListener = (callback) => {
  if (Platform.OS === "web" || !Notifications) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationResponseReceivedListener(callback);
};
