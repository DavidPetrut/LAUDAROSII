/** pc_planNotes — note pe plan, grupate pe categorii (§4.2, #14/#16). Ex. CHOIR/MUSIC/PASSAGES. */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", required: true },
  categoryName: { type: String, default: "General" },
  content: { type: String, default: "" },
  sortOrder: { type: Number, default: 0 },
});

schema.index({ orgId: 1, planId: 1, sortOrder: 1 });

module.exports = pcModel("PcPlanNote", schema, "pc_planNotes");
