import { storage } from "../../../../global/utils/storage";
import {
  scheduleWeeklyReminders,
  cancelScheduledNotifications,
} from "../../../../global/services";

const keyFor = (id) => `devnotif:${id}`;

export const DEFAULT_NOTIF_MESSAGE =
  "Devotionalul tău te așteaptă. Oprește-te un moment pentru rugăciune și închinare.";

/**
 * Sincronizeaza notificarea locala a unui devotional: anuleaza programarea veche
 * si, daca notificarea e activa, programeaza un memento saptamanal pe zilele
 * devotionalului (sau in fiecare zi daca nu are zile) la ora aleasa.
 */
export const syncDevotionalNotification = async (devotional) => {
  if (!devotional?._id) return;
  const key = keyFor(devotional._id);
  try {
    const raw = await storage.getItem(key);
    if (raw) await cancelScheduledNotifications(JSON.parse(raw));
    await storage.deleteItem(key);
  } catch (e) {}

  const n = devotional.notification;
  if (!n?.enabled) return;

  const weekdays =
    devotional.schedule?.weekdays?.length > 0
      ? devotional.schedule.weekdays
      : [1, 2, 3, 4, 5, 6, 7];

  const ids = await scheduleWeeklyReminders({
    title: devotional.name || "Devotional",
    body: n.message || DEFAULT_NOTIF_MESSAGE,
    data: { screen: "PrayerTimer" },
    weekdays,
    hour: n.hour,
    minute: n.minute,
  });

  try {
    await storage.setItem(key, JSON.stringify(ids));
  } catch (e) {}
};
