/**
 * pc_songFiles — fișiere atașate la ARANJAMENT (comune: lyrics, original mix) SAU la o CHEIE
 * anume (chord chart în acea cheie, audio transpus). §21/§22. Fișierele reale pe object storage.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  songId: { type: mongoose.Schema.Types.ObjectId, ref: "PcSong", required: true },
  arrangementId: { type: mongoose.Schema.Types.ObjectId, ref: "PcArrangement", required: true },
  keyId: { type: mongoose.Schema.Types.ObjectId, ref: "PcKey", default: null }, // null = nivel aranjament
  scope: { type: String, enum: ["arrangement", "key"], default: "arrangement" },
  kind: { type: String, default: "other" }, // lyrics|chordChart|numberChart|numeralChart|audio|link|other
  name: { type: String, required: true },
  url: { type: String, default: "" },
  source: { type: String, default: "upload" }, // upload|multitracks|songselect|praisecharts|link|chordpro|transpose
  importRef: { type: String, default: "" }, // referință la fișierul din integrare
  audioAccess: { type: String, enum: ["stream", "download"], default: "stream" },
  keyLabel: { type: String, default: "" }, // ex. „Chord Chart in D"
  // Lyrics & Chords editor (ChordPro) — master editabil la nivel de aranjament:
  chordpro: { type: String, default: "" }, // sursa ChordPro (editabilă)
  originalKey: { type: String, default: "" }, // cheia în care e scris ChordPro-ul
  formatting: { type: Object, default: {} }, // { columns, chordColor, fontSize } per chart
  // Transpunere audio (DSP = seam):
  transposeStatus: { type: String, enum: ["", "pending", "done", "error"], default: "" },
  fromKey: { type: String, default: "" },
  toKey: { type: String, default: "" },
  // Detecție gamă din audio (estimare pe cromă, în browser la upload):
  detectedKey: { type: String, default: "" }, // ex. „D major" / „E minor"
  detectedLabel: { type: String, default: "" }, // etichetă scurtă, ex. „D" / „Em"
  detectedConf: { type: Number, default: 0 }, // 0..1 încredere estimare
  sortOrder: { type: Number, default: 0 },
});

schema.index({ orgId: 1, arrangementId: 1 });
schema.index({ orgId: 1, keyId: 1 });

module.exports = pcModel("PcSongFile", schema, "pc_songFiles");
