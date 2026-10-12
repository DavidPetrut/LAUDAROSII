/**
 * pc_teamMembers — apartenența persoanei la o echipă (§4.2, #2/#3).
 * Sursa pt. roster + „teams they lead" + My Teams. Poartă pozițiile + etichetele de preferință
 * afișate în screenshot („As often as needed" / „All times").
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "PcTeam", required: true },
  personId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", required: true },
  positionIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcPosition", default: [] },
  isLeader: { type: Boolean, default: false },
  roleInTeam: { type: String, default: "" },
  // Etichete de preferință afișate în My Teams (se formalizează la Scheduling, aditiv).
  frequencyLabel: { type: String, default: "As often as needed" },
  timesLabel: { type: String, default: "" }, // ex. „All times"
});

schema.index({ orgId: 1, personId: 1 });
schema.index({ orgId: 1, teamId: 1 });
schema.index({ orgId: 1, teamId: 1, personId: 1 }, { unique: true }); // o apartenență/echipă

module.exports = pcModel("PcTeamMember", schema, "pc_teamMembers");
