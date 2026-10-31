/**
 * pc_productionSnippets — șabloane de note reutilizabile ale unui producător (Order-ul Producției).
 * „Producătorul își are propriile notițe deja, doar selectează deja notița aia" (meeting Paula).
 * Per-owner (fiecare producător ale lui). Aditiv, org-scoped. Se inserează în nota unui item din RH.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", required: true },
  text: { type: String, required: true },
  sortOrder: { type: Number, default: 0 },
});

schema.index({ orgId: 1, ownerId: 1, sortOrder: 1 });

module.exports = pcModel("PcProductionSnippet", schema, "pc_productionSnippets");
