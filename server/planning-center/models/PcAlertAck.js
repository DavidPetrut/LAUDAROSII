/** pc_alertAcks — confirmarea „Am înțeles" per alertă per persoană (ca să nu mai apară pop-up-ul). */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  alertId: { type: mongoose.Schema.Types.ObjectId, ref: "PcAlert", required: true },
  personId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", required: true },
  acknowledgedAt: { type: Date, default: Date.now },
});

schema.index({ orgId: 1, alertId: 1, personId: 1 }, { unique: true });

module.exports = pcModel("PcAlertAck", schema, "pc_alertAcks");
