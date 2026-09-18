import { storage } from "../../../../global/utils/storage";
import {
  scheduleWeeklyReminders,
  cancelScheduledNotifications,
} from "../../../../global/services";

const KEY = "devotional_reminders";

const read = async () => {
  try {
    const raw = await storage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const write = async (list) => {
  try {
    await storage.setItem(KEY, JSON.stringify(list));
  } catch (e) {}
};

/**
 * Store local pentru memento-urile devotional. Fiecare reminder e programat prin
 * serviciul global de notificari (repetabil saptamanal) si duce la ecranul
 * Devotional cand e apasat (data.screen). Aici tinem doar lista + id-urile OS.
 */
export const devotionalReminders = {
  list: read,

  add: async ({ hour, minute, weekdays }) => {
    const list = await read();
    const notifIds = await scheduleWeeklyReminders({
      title: "Timpul tău devotional",
      body: "Un moment pus deoparte pentru închinare și rugăciune.",
      data: { screen: "PrayerTimer" },
      weekdays,
      hour,
      minute,
    });
    const item = {
      id: `${Date.now()}`,
      hour,
      minute,
      weekdays,
      notifIds,
      createdAt: new Date().toISOString(),
    };
    const next = [...list, item];
    await write(next);
    return next;
  },

  remove: async (id) => {
    const list = await read();
    const item = list.find((r) => r.id === id);
    if (item) await cancelScheduledNotifications(item.notifIds || []);
    const next = list.filter((r) => r.id !== id);
    await write(next);
    return next;
  },
};
