/** pc_plans — o slujbă datată într-un service type (§4.2, #2/#15). Order+Teams+Times+Notes+Files. */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  serviceTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "PcServiceType", required: true },
  // Șablonul Order ASOCIAT acestui plan (etichetă/sursă): setat la creare (ales sau default-ul service-type-ului)
  // și la „Aplică șablon". E doar un pointer — aplicarea e cea care rescrie itemii; editarea șablonului NU atinge planul.
  orderTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: "PcOrderTemplate", default: null },
  title: { type: String, default: "" }, // ex. „Contemporary Service" (opțional; data e principală)
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: "PcSeries", default: null },
  seriesTitle: { type: String, default: "" }, // serie fără artwork (PCO series_title)
  sortDate: { type: Date, required: true }, // data planului (din service time)
  publicView: { type: Boolean, default: false },
  // ── Import PCO (aditiv) ──
  remindersDisabled: { type: Boolean, default: false },
  publicBySchedule: { type: Boolean, default: false }, // auto-publicat în ziua serviciului
  createdByPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null },
  updatedByPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null },
});

schema.index({ orgId: 1, serviceTypeId: 1, sortDate: 1 });

module.exports = pcModel("PcPlan", schema, "pc_plans");
