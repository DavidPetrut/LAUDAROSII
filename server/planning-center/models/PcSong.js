/**
 * pc_songs — biblioteca de cântări (MINIMAL pt. felia Order — Select Song).
 * Se EXTINDE la felia Songs (arrangements/keys/chord charts/transpunere), aditiv. §4.3bis.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  title: { type: String, required: true, trim: true },
  defaultKey: { type: String, default: "" }, // ex. „D", „Ab"
  bpm: { type: Number, default: null },
  author: { type: String, default: "" },
  ccli: { type: String, default: "" },
  copyrightYear: { type: String, default: "" },
  administration: { type: String, default: "" }, // §Songs — „Administration" din Song Information
  notes: { type: String, default: "" },          // observații la nivel de cântec
  lengthSec: { type: Number, default: 0 },
  themes: { type: [String], default: [] },
  tagIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcTag", default: [] }, // tag-uri la nivel de SONG (domain=song)
  archived: { type: Boolean, default: false },
});

schema.index({ orgId: 1, title: 1 });
schema.index({ title: "text", author: "text" }, { name: "pc_songs_text" });

module.exports = pcModel("PcSong", schema, "pc_songs");
