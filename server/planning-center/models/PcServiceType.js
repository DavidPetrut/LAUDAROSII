/**
 * pc_serviceTypes — container de planuri de același tip (§4.2, #2).
 * Minimal acum (felia People îl folosește doar ca etichetă pt. echipe/My Teams);
 * se EXTINDE aditiv la felia Services core (frequency, folderId, settings…), nu se rescrie.
 */
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  name: { type: String, required: true, trim: true }, // ex. „1. Serviciu Cu Impact Maxim"
  folderId: { type: Object, default: null }, // pc_folders (viitor)
  sortOrder: { type: Number, default: 0 },
  archived: { type: Boolean, default: false },
});

schema.index({ orgId: 1, sortOrder: 1 });

module.exports = pcModel("PcServiceType", schema, "pc_serviceTypes");
