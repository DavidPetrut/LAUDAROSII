/**
 * pc_lightArrangements — aranjamente de lumini salvate, reutilizabile pe tranziții.
 * Un aranjament = un nume + o listă de culori (în ordine). Se construiesc în timp și se aleg
 * dintr-un dropdown la tranziție. Scoped pe org. Aditiv — nu atinge order/plan.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const OID = mongoose.Schema.Types.ObjectId;

const schema = pcSchema({
  name: { type: String, required: true, trim: true },
  colors: { type: [String], default: [] }, // culori în ordine (hex sau rgba)
  createdByPersonId: { type: OID, ref: "PcPerson", default: null },
});

schema.index({ orgId: 1, name: 1 });

module.exports = pcModel("PcLightArrangement", schema, "pc_lightArrangements");
