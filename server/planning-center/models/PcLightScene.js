/**
 * pc_lightScenes — scene de lumini presetate pentru Order-ul Producției (tab Rehearse).
 * O scenă = nume + culori pe fixtures (Par / LED / Tobe / Laterale / Coroană) + notă de intensitate.
 * „Set complet = scenă + 4 culori" (Paula). Scenele standard se seed-ează o dată (isStandard).
 * Producătorul le aplică per item în RH (overlay) — NU atinge Order-ul. Aditiv, org-scoped.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

// Fixtures fizice din sală (ordinea de afișare). „coroana" = setare specială.
const FIXTURES = ["par", "led", "tobe", "laterale", "coroana"];

const schema = pcSchema({
  name: { type: String, required: true },
  fixtures: { type: [{ fixture: { type: String, enum: FIXTURES }, color: String }], default: [] },
  intensityNote: { type: String, default: "" }, // ex. „teatrale mai jos", „intensitate mică" (informativ)
  isStandard: { type: Boolean, default: false }, // scenele clasice seed-ate (Intrare sală, Worship, …)
  sortOrder: { type: Number, default: 0 },
  createdByPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null },
});

schema.index({ orgId: 1, sortOrder: 1 });

module.exports = pcModel("PcLightScene", schema, "pc_lightScenes");
module.exports.FIXTURES = FIXTURES;
