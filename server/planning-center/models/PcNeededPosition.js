/** pc_neededPositions — goluri de acoperit pe o echipă/poziție într-un plan (§4.2, #14). „Needed". */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "PcTeam", required: true },
  positionId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPosition", default: null },
  positionName: { type: String, default: "" }, // numele poziției din PCO (team_position_name) — păstrat chiar dacă FK nu se rezolvă
  count: { type: Number, default: 1 },
  // ── Import PCO (aditiv) — needed per service time / split team ──
  timeId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlanTime", default: null },
  timePreferenceOptionId: { type: mongoose.Schema.Types.ObjectId, ref: "PcTimePreferenceOption", default: null },
});

schema.index({ orgId: 1, planId: 1, teamId: 1 });

module.exports = pcModel("PcNeededPosition", schema, "pc_neededPositions");
