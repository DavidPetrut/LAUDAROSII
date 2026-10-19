/** pc_arrangements — aranjament al unui cântec (§4.3bis). Length/BPM/Meter/Sequence + album art. */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  songId: { type: mongoose.Schema.Types.ObjectId, ref: "PcSong", required: true },
  name: { type: String, required: true, trim: true }, // ex. „Hillsong Worship", „Acoustic"
  lengthSec: { type: Number, default: 0 },
  bpm: { type: Number, default: null },
  meter: { type: String, default: "" }, // ex. „4/4", „6/8"
  sequence: { type: [String], default: [] }, // [Intro, V1, C1, …]
  albumArtUrl: { type: String, default: "" },
  tagIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcTag", default: [] },
  notes: { type: String, default: "" },
  archived: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 }, // ordine/prioritate; primul (cel mai mic) = implicit
});

schema.index({ orgId: 1, songId: 1 });

module.exports = pcModel("PcArrangement", schema, "pc_arrangements");
