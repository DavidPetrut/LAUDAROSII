const EXPO_SEND = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS = "https://exp.host/--/api/v2/push/getReceipts";

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/**
 * Trimite notificari push prin serviciul Expo catre o lista de token-uri. Citeste ticket-urile
 * SI receipt-urile ca sa vada erorile reale (APNs/FCM lipsa, DeviceNotRegistered etc.) in loc sa
 * le inghita. Intoarce { sent, errors, invalidTokens } — invalidTokens pot fi curatati de apelant.
 * Trimite in loturi de 100 (limita Expo).
 */
const sendExpoPush = async (tokens, { title, body, data = {}, channelId = "default", sound = "default" }) => {
  const valid = [...new Set(tokens)].filter(
    (t) => typeof t === "string" && t.startsWith("ExponentPushToken"),
  );
  if (valid.length === 0) return { sent: 0, errors: [], invalidTokens: [] };

  let sent = 0;
  const errors = [];
  const invalidTokens = [];
  const tickets = []; // { token, id }

  for (const group of chunk(valid, 100)) {
    const messages = group.map((to) => ({ to, title, body, data, sound, channelId }));
    try {
      const res = await fetch(EXPO_SEND, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });
      const json = await res.json().catch(() => ({}));
      const arr = (json && json.data) || [];
      arr.forEach((t, i) => {
        const token = group[i];
        if (t && t.status === "ok") {
          sent++;
          if (t.id) tickets.push({ token, id: t.id });
        } else if (t) {
          const err = t.details && t.details.error;
          errors.push({ token, message: t.message, error: err });
          if (err === "DeviceNotRegistered") invalidTokens.push(token);
        }
      });
      if (arr.length === 0 && json && json.errors) errors.push({ api: json.errors });
    } catch (e) {
      errors.push({ fetch: e.message });
    }
  }

  // Receipt-urile prind erorile de LIVRARE (ex: APNs/FCM InvalidCredentials, MessageTooBig).
  if (tickets.length) {
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const res = await fetch(EXPO_RECEIPTS, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ ids: tickets.map((t) => t.id) }),
      });
      const json = await res.json().catch(() => ({}));
      const map = (json && json.data) || {};
      for (const { token, id } of tickets) {
        const rec = map[id];
        if (rec && rec.status === "error") {
          const err = rec.details && rec.details.error;
          errors.push({ token, message: rec.message, error: err });
          if (err === "DeviceNotRegistered") invalidTokens.push(token);
        }
      }
    } catch (e) {
      /* receipts optionale */
    }
  }

  if (errors.length) console.warn("[push] erori:", JSON.stringify(errors).slice(0, 1200));
  return { sent, errors, invalidTokens: [...new Set(invalidTokens)] };
};

module.exports = { sendExpoPush };
