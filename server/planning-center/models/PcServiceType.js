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
  // ── Recurență (aditiv) — ziua în care pică slujba, pt. sugestii de dată la Times ──
  recurringDayOfWeek: { type: Number, default: null }, // 0=Dum … 6=Sâm (null = nesetat)
  recurringWeekOfMonth: { type: Number, default: 0 },  // 0=fiecare; 1-4=a n-a; -1=ultima (cadență lunară)
  // ── Template de repetiție (aditiv) — materializat ca PcPlanTime type:"rehearsal" la crearea planului ──
  rehearsalTemplate: {
    type: new mongoose.Schema({
      enabled: { type: Boolean, default: false },
      dayOffset: { type: Number, default: 1 },        // zile ÎNAINTE de slujbă (1 = ziua dinainte)
      start: { type: String, default: "" },           // "HH:MM" 24h
      end: { type: String, default: "" },
      visibleToTeamIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "PcTeam" }], default: [] },
      visibleCapability: { type: String, default: "" }, // opțional, suplimentar echipelor
    }, { _id: false }),
    default: () => ({}),
  },
  // Preseturi de ore (chips în modalul Times) — editabile per service type.
  timePresets: {
    type: [{ label: String, start: String, end: String }],
    default: () => ([{ label: "SIM 1", start: "10:00", end: "12:00" }, { label: "SIM 2", start: "12:00", end: "14:00" }]),
  },
});

schema.index({ orgId: 1, sortOrder: 1 });

module.exports = pcModel("PcServiceType", schema, "pc_serviceTypes");
