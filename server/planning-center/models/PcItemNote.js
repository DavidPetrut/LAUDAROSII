/** pc_itemNotes — note pe un item de plan, pe categorie (PCO ItemNote). Text-only; nu se schimbă la reprogramare. */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", required: true },
  planItemId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlanItem", required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "PcNoteCategory", default: null },
  categoryName: { type: String, default: "" }, // denormalizat (PCO permite doar set la create)
  content: { type: String, default: "" },
});

schema.index({ orgId: 1, planItemId: 1 });

module.exports = pcModel("PcItemNote", schema, "pc_itemNotes");
