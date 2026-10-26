/**
 * pc_schedulingPreferences — disponibilitate SOFT a unei persoane (pt. auto-scheduler + afișare „As often as needed").
 * ≠ blockout (hard). General (per persoană) sau per echipă. Aditiv; câmpurile fine se extind la Scheduling avansat.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  personId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "PcTeam", default: null }, // null = general
  frequencyLabel: { type: String, default: "As often as needed" },
  maxPerMonth: { type: Number, default: null },
  weeksOfMonth: { type: [Number], default: [] }, // ex. [1,3] = „1 și 3"
  prefs: { type: Object, default: {} }, // extensibil (household, split-team times…)
});

schema.index({ orgId: 1, personId: 1 });
schema.index({ orgId: 1, teamId: 1 });

module.exports = pcModel("PcSchedulingPreference", schema, "pc_schedulingPreferences");
