/** pc_timePreferenceOptions — orele de serviciu ale unui service type (PCO TimePreferenceOption). Pt. split teams. */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  serviceTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "PcServiceType", required: true },
  dayOfWeek: { type: Number, default: 0 },      // 0=Dum … 6=Sâm
  minuteOfDay: { type: Number, default: 0 },    // 0=12:00am … 2359=11:59pm (convenția PCO)
  description: { type: String, default: "" },
  timeType: { type: String, default: "service" },
  sortIndex: { type: Number, default: 0 },
});

schema.index({ orgId: 1, serviceTypeId: 1, dayOfWeek: 1 });

module.exports = pcModel("PcTimePreferenceOption", schema, "pc_timePreferenceOptions");
