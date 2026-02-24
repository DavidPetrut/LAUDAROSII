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
