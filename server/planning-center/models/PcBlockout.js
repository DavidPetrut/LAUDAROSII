/**
 * pc_blockouts — zile în care o persoană NU e disponibilă (personal, My Schedule).
 * Datele = string "YYYY-MM-DD" (evită capcanele de timezone la comparații de zile).
 * Validare: startDate <= endDate; dedup concurent (vezi routes/schedule.js).
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  personId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", required: true },
  startDate: { type: String, required: true }, // YYYY-MM-DD
  endDate: { type: String, required: true },   // YYYY-MM-DD (inclusiv)
  allDay: { type: Boolean, default: true },
  startTime: { type: String, default: "" },    // HH:mm (dacă !allDay)
  endTime: { type: String, default: "" },
  repeat: { type: String, enum: ["none", "weekly", "monthly", "yearly"], default: "none" },
  reason: { type: String, default: "" },
});

schema.index({ orgId: 1, personId: 1, startDate: 1 });

module.exports = pcModel("PcBlockout", schema, "pc_blockouts");
