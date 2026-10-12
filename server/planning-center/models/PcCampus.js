/** pc_campus — filiale (§4.2). RO default, dar fiecare filială cu timezone propriu (invariant §1.9). */
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  name: { type: String, required: true, trim: true },
  country: { type: String, default: "Romania" },
  timezone: { type: String, default: "Europe/Bucharest" }, // IANA
  timeFormat: { type: String, enum: ["12", "24"], default: "24" },
  dateFormat: { type: String, enum: ["DMY", "MDY"], default: "DMY" },
  address: { type: String, default: "" },
  isMain: { type: Boolean, default: false },
});

schema.index({ orgId: 1, isMain: 1 });

module.exports = pcModel("PcCampus", schema, "pc_campuses");
