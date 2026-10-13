/** pc_keys — cheie a unui aranjament (§4.3bis). Start/End (key change) + descriere + capos. */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  arrangementId: { type: mongoose.Schema.Types.ObjectId, ref: "PcArrangement", required: true },
  songId: { type: mongoose.Schema.Types.ObjectId, ref: "PcSong", required: true },
  startKey: { type: String, required: true }, // ex. „D", „Gb", „Am"
  endKey: { type: String, default: "" }, // „" sau „Same" = egal cu start
  description: { type: String, default: "" }, // ex. „Male Low", „Female Key"
  capos: { type: [{ fret: Number, note: String }], default: [] },
  sortOrder: { type: Number, default: 0 },
});

schema.index({ orgId: 1, arrangementId: 1, sortOrder: 1 });

module.exports = pcModel("PcKey", schema, "pc_keys");
