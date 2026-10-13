/**
 * pc_messages — istoric de comunicare per persoană (Profile → MESSAGES).
 * direction (din perspectiva persoanei): "received" (ex. cerere de programare, remindere)
 * sau "sent" (ex. confirmare/refuz trimis de ea). unread = received & !read.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  personId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", required: true, index: true },
  direction: { type: String, enum: ["received", "sent"], default: "received" },
  subject: { type: String, default: "" },
  body: { type: String, default: "" },
  read: { type: Boolean, default: false },
  relatedPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", default: null },
});

schema.index({ orgId: 1, personId: 1, createdAt: -1 });

module.exports = pcModel("PcMessage", schema, "pc_messages");
