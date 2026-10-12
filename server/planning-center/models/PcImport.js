/**
 * pc_imports — job-uri de import CSV bulk (§4.2, #11). Preview → commit → undo 48h.
 * Pattern pe `people_import_template.csv`. Extensibil pe viitor (regula ta).
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  type: { type: String, default: "people" },
  status: {
    type: String,
    enum: ["preview", "committed", "undone", "failed"],
    default: "preview",
  },
  mapping: { type: Object, default: {} }, // coloană CSV → câmp pc_people
  rowCount: { type: Number, default: 0 },
  createdCount: { type: Number, default: 0 },
  updatedCount: { type: Number, default: 0 },
  errors: { type: [Object], default: [] }, // [{ row, message }]
  createdPersonIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcPerson", default: [] }, // pt. undo
  undoableUntil: { type: Date, default: null },
  importedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

schema.index({ orgId: 1, createdAt: -1 });

module.exports = pcModel("PcImport", schema, "pc_imports");
