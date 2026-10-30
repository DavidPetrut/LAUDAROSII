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
  // maparea = ECHIPĂ + a câta săptămână din viitor. Grupul reflectă oamenii echipei pe acea săptămână,
  // iar offset-ul e RELATIV la „azi" → când o săptămână trece, se rotește singur (nu numărăm câte grupuri sunt).
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "PcTeam", default: null },
  // ancoră STABILĂ: a câta slujire din LUNĂ (1-5). Grupul rămâne pe aceeași săptămână-din-lună prin rotație
  // (ex. „a 3-a" ia mereu a 3-a slujire a lunii curente/următoare). Numele se regenerează, slotul rămâne fix.
  weekOfMonth: { type: Number, default: 1 },
  weekOffset: { type: Number, default: 0 },          // (învechit) fostul offset relativ; păstrat pt. compat.
  lucrareId: { type: mongoose.Schema.Types.ObjectId, ref: "PcWhatsappLucrare", default: null }, // containerul (lucrarea) editabil
  ministryGroup: { type: String, default: "" },      // din echipă; folosit la migrarea inițială spre lucrareId
  // numele grupului se GENEREAZĂ la sync: „{namePrefix} - {dată} - {lider}" (NU ne bazăm pe numele de pe WhatsApp).
  namePrefix: { type: String, default: "" },         // prefixul ales de user (ex. „SIM1", „Kingdom Youth 2"); gol → numele echipei
  leaderPositionId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPosition", default: null }, // liderul din nume = cine e pe ACEASTĂ poziție săpt. aia
  communityJid: { type: String, default: "" },       // comunitatea-părinte (din WhatsApp), doar pt. grupare în UI
  botNumber: { type: String, default: "" },          // numărul-robot admin în acest grup
  mode: { type: String, default: "semi" },           // semi | manual
  enabled: { type: Boolean, default: true },
  lastSyncAt: { type: Date, default: null },
});

schema.index({ orgId: 1, ministryGroup: 1 });
schema.index({ orgId: 1, jid: 1 }, { unique: true, partialFilterExpression: { jid: { $type: "string" } } });

module.exports = pcModel("PcWhatsappGroup", schema, "pc_whatsapp_groups");
