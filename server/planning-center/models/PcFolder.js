/** pc_folders — organizare service types (PCO Folder). Folder → campus → timezone; nested (parentId). */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  name: { type: String, required: true, trim: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: "PcFolder", default: null }, // nested
  campusId: { type: mongoose.Schema.Types.ObjectId, ref: "PcCampus", default: null }, // dă timezone-ul (remindere/feeds)
  sortOrder: { type: Number, default: 0 },
});

schema.index({ orgId: 1, parentId: 1, sortOrder: 1 });

module.exports = pcModel("PcFolder", schema, "pc_folders");
