/** pc_plans — o slujbă datată într-un service type (§4.2, #2/#15). Order+Teams+Times+Notes+Files. */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  serviceTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "PcServiceType", required: true },
  title: { type: String, default: "" }, // ex. „Contemporary Service" (opțional; data e principală)
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: "PcSeries", default: null },
  sortDate: { type: Date, required: true }, // data planului (din service time)
  publicView: { type: Boolean, default: false },
});

schema.index({ orgId: 1, serviceTypeId: 1, sortDate: 1 });

module.exports = pcModel("PcPlan", schema, "pc_plans");
