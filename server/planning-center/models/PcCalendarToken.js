/** pc_calendarTokens — token-uri OAuth per persoană pt. a scrie evenimente în calendarul lor (Google). */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  personId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", required: true },
  provider: { type: String, default: "google" },
  accessToken: { type: String, default: "" },
  refreshToken: { type: String, default: "" },
  expiresAt: { type: Date, default: null },
  email: { type: String, default: "" },
});

schema.index({ orgId: 1, personId: 1, provider: 1 }, { unique: true });

module.exports = pcModel("PcCalendarToken", schema, "pc_calendarTokens");
