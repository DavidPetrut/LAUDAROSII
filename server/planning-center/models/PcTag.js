/** pc_tags — tag individual într-un grup (§4.2). Ex. „Drums", „Soprano". */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  tagGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "PcTagGroup", default: null },
  name: { type: String, required: true, trim: true },
  domain: { type: String, default: "people" },
  color: { type: String, default: "" },
  sortOrder: { type: Number, default: 0 },
});

schema.index({ orgId: 1, domain: 1, tagGroupId: 1, sortOrder: 1 });

module.exports = pcModel("PcTag", schema, "pc_tags");
