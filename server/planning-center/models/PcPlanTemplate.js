/**
 * pc_planTemplates — șablon unificat (PCO PlanTemplate): order items + notes + membri + needed positions.
 * NU are times (planul generat primește orele din frequency/serviceTimeTemplate). Import = MERGE (adaugă).
 * Conținutul e stocat ca SNAPSHOT (embedded) — șablonul nu e linkat la planurile create din el.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  serviceTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "PcServiceType", required: true },
  name: { type: String, required: true, trim: true },
  // Snapshot-uri (structură aliniată cu PcPlanItem/PcPlanNote/PcNeededPosition, minimal):
  items: { type: [Object], default: [] },   // [{type,title,description,lengthSec,leaders,...}]
  notes: { type: [Object], default: [] },    // [{categoryName,content,teamIds}]
  members: { type: [Object], default: [] },  // [{personId,teamId,positionId,status}]
  needed: { type: [Object], default: [] },   // [{teamId,positionId,count}]
  sortOrder: { type: Number, default: 0 },
});

schema.index({ orgId: 1, serviceTypeId: 1, sortOrder: 1 });

module.exports = pcModel("PcPlanTemplate", schema, "pc_planTemplates");
