/** pc_neededPositions — goluri de acoperit pe o echipă/poziție într-un plan (§4.2, #14). „Needed". */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "PcTeam", required: true },
  positionId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPosition", default: null },
  count: { type: Number, default: 1 },
});

schema.index({ orgId: 1, planId: 1, teamId: 1 });

module.exports = pcModel("PcNeededPosition", schema, "pc_neededPositions");
