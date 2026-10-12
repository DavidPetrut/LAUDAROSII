/**
 * pc_tagGroups — grupuri de tag-uri (§4.2). Pt. filtrul People>TAGS din screenshot
 * (ex. „Instruments Played", „Vocal Part"). domain = people|song|arrangement|media|file.
 */
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  name: { type: String, required: true, trim: true },
  domain: { type: String, default: "people" },
  category: { type: String, default: "" }, // ex. „Audio/Visual"
  allowMultiple: { type: Boolean, default: true },
  required: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
});

schema.index({ orgId: 1, domain: 1, sortOrder: 1 });

module.exports = pcModel("PcTagGroup", schema, "pc_tagGroups");
