/**
 * pc_serviceTypes — container de planuri de același tip (§4.2, #2).
 * Minimal acum (felia People îl folosește doar ca etichetă pt. echipe/My Teams);
 * se EXTINDE aditiv la felia Services core (frequency, folderId, settings…), nu se rescrie.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  name: { type: String, required: true, trim: true }, // ex. „1. Serviciu Cu Impact Maxim"
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "PcFolder", default: null },
  frequency: { type: String, default: "weekly" }, // randomly|daily|weekly|everyWeekday|everyOtherWeek|monthly
  // Șablon de ore de serviciu (wall-clock) → planurile noi moștenesc aceste ore.
  serviceTimeTemplate: { type: [{ start: String, end: String }], default: [] }, // [{start:"08:00", end:"09:00"}]
  // Item row colors (§16): reguli match(tip/keyword)→color. Gol = folosim DEFAULT.
  itemRowColors: { type: [{ match: String, label: String, color: String }], default: [] },
  useCustomRowColors: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  archived: { type: Boolean, default: false },
  // ── Import PCO (aditiv) ──
  permissions: { type: String, default: "" },           // „highest" permission a serviciului
  scheduledPublish: { type: Boolean, default: false },  // publică planul în ziua serviciului
  limitedFileVisibility: { type: Boolean, default: false }, // attachment_types_enabled
  lastPlanFrom: { type: String, default: "" },
  // Public View — ce apare pe planul public (booleans PCO). Aditiv, folosit ulterior.
  publicView: { type: Object, default: {} },
  // Tipuri de item (PCO item types) per service type. Aditiv — importul le mapează sau le ignoră.
  itemTypes: { type: [{ name: String, color: String }], default: [] },
});

schema.index({ orgId: 1, sortOrder: 1 });

module.exports = pcModel("PcServiceType", schema, "pc_serviceTypes");
