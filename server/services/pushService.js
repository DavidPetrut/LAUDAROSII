const EXPO_URL = "https://exp.host/--/api/v2/push/send";

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/**
 * Trimite notificari push prin serviciul Expo catre o lista de token-uri. Ignora
 * token-urile invalide si trimite in loturi de 100 (limita Expo).
 */
const sendExpoPush = async (tokens, { title, body, data = {} }) => {
  const valid = [...new Set(tokens)].filter(
    (t) => typeof t === "string" && t.startsWith("ExponentPushToken")
  );
  if (valid.length === 0) return { sent: 0 };

  let sent = 0;
  for (const group of chunk(valid, 100)) {
    const messages = group.map((to) => ({ to, title, body, data, sound: "default" }));
    try {
      await fetch(EXPO_URL, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });
      sent += group.length;
    } catch (e) {}
  }
  return { sent };
};

module.exports = { sendExpoPush };
