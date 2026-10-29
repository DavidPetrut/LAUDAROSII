/**
 * pc_whatsapp_sessions — sesiunea Baileys (credențiale WhatsApp Web) a unui NUMĂR-ROBOT.
 * Stocăm creds+keys ca JSON în DB (nu pe disc) ca să supraviețuiască restart-urilor (Render e ephemeral,
 * iar puntea rulează local/always-on). O sesiune per botNumber. NU conține mesaje, doar cheile de sesiune.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  botNumber: { type: String, default: "" },          // numărul-robot (E.164, doar cifre), gol până la pairing
  data: { type: mongoose.Schema.Types.Mixed, default: {} }, // { creds, keys } serializate cu BufferJSON
  status: { type: String, default: "disconnected" }, // disconnected|connecting|qr|connected|logged-out
  me: { type: mongoose.Schema.Types.Mixed, default: null }, // { id, name } al numărului conectat
  lastConnectedAt: { type: Date, default: null },
  lastError: { type: String, default: "" },          // ex. „logged-out" / „banned"
});

schema.index({ orgId: 1, botNumber: 1 });

module.exports = pcModel("PcWhatsappSession", schema, "pc_whatsapp_sessions");
