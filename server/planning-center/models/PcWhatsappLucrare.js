/**
 * pc_whatsapp_lucrari — o „lucrare" editabilă (container de grupuri WhatsApp).
 * Nume + imagine (opțional) + numărul-robot folosit. Grupurile (PcWhatsappGroup) o referă prin lucrareId.
 */
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  name: { type: String, default: "", trim: true },   // numele lucrării (ex. „Laudă și Închinare")
  image: { type: String, default: "" },              // data URL (base64) sau URL; gol = fără imagine
  botNumber: { type: String, default: "" },          // numărul-robot al lucrării (E.164, doar cifre)
  sortOrder: { type: Number, default: 0 },
});

schema.index({ orgId: 1, sortOrder: 1 });

module.exports = pcModel("PcWhatsappLucrare", schema, "pc_whatsapp_lucrari");
