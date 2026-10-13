/**
 * pc_planFiles — fișiere pe plan, grupate pe scope (§4.2, #16/#21).
 * scope: serviceType (comune) | plan | item | song. Fișierele reale pe object storage (invariant §1.8).
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", default: null },
  serviceTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "PcServiceType", default: null },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlanItem", default: null },
  scope: { type: String, enum: ["serviceType", "plan", "item", "song"], default: "plan" },
  groupLabel: { type: String, default: "" }, // ex. numele cântecului pt. scope song
  name: { type: String, required: true },
  kind: { type: String, default: "upload" }, // upload|link|youtube|vimeo|chordChart|audio|stageLayout
  url: { type: String, default: "" },
  audioAccess: { type: String, enum: ["stream", "download"], default: "stream" },
  sortOrder: { type: Number, default: 0 },
});

schema.index({ orgId: 1, planId: 1, scope: 1 });

module.exports = pcModel("PcPlanFile", schema, "pc_planFiles");
