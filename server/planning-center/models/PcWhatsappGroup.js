/**
 * pc_whatsapp_groups — maparea unui GRUP WhatsApp (existent, cu istoricul lui) ↔ o LUCRARE.
 * Un grup permanent per lucrare; sistemul rotește membrii ca să reflecte oamenii săptămânii curente.
 * `mode` e toggle-ul per lucrare ales de coordonator: semi (job pregătește, confirmi) / manual (apeși tu).
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  jid: { type: String, required: true },             // id-ul grupului WhatsApp (ex. „1203...@g.us")
  nameCached: { type: String, default: "" },         // numele grupului (cache din WhatsApp, pt. UI)
  ministryGroup: { type: String, default: "" },      // „Laudă și Închinare" / „Vertical Kids" / „Asimilare" ...
  serviceTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "PcServiceType", default: null },
  botNumber: { type: String, default: "" },          // numărul-robot admin în acest grup
  mode: { type: String, default: "semi" },           // semi | manual
  enabled: { type: Boolean, default: true },
  lastSyncAt: { type: Date, default: null },
});

schema.index({ orgId: 1, ministryGroup: 1 });
schema.index({ orgId: 1, jid: 1 }, { unique: true, partialFilterExpression: { jid: { $type: "string" } } });

module.exports = pcModel("PcWhatsappGroup", schema, "pc_whatsapp_groups");
