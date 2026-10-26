/** pc_noteCategories — categorii de note (PCO ItemNoteCategory + PlanNoteCategory), per service type. */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  serviceTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "PcServiceType", required: true },
  kind: { type: String, enum: ["item", "plan"], required: true },
  name: { type: String, required: true, trim: true },
  sortOrder: { type: Number, default: 0 },
  frequentlyUsed: { type: Boolean, default: true },
  teamIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcTeam", default: [] }, // plan note category → echipe
});

schema.index({ orgId: 1, serviceTypeId: 1, kind: 1, sortOrder: 1 });

module.exports = pcModel("PcNoteCategory", schema, "pc_noteCategories");
