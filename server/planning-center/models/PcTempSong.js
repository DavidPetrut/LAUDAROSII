/**
 * pc_tempSongs — „clona" TEMPORARĂ a unei melodii editate în Mashup Studio (tabul Order).
 *
 * IZOLARE TOTALĂ (decizia D1 din ORDER_EDITOR_PLAN.md): aceste documente NU sunt în biblioteca Songs
 * (`pc_songs`) și NU apar NICIODATĂ în căutarea/lista Songs. Trăiesc DOAR în contextul unui Order
 * (plan + item). Single-edit SAU mashup → tot aici se clonează. Butonul global „Curăță melodiile
 * temporare" șterge aceste documente. Volum mic (~10–15 / 1–2 ani).
 *
 * Snapshot-ul e SELF-CONTAINED: după creare nu mai depinde de melodia originală. `sources` păstrează
 * doar referințe informative (pt. afișarea containerelor de resurse + eventual „Save as new").
 * NIMIC din asta nu scrie vreodată în pc_songs/pc_arrangements/pc_keys/pc_songFiles.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

// Un „bloc" = o secțiune editabilă (ex. „Bridge 1" + corpul ei ChordPro). `id` = id-ul NOSTRU (string, stabil
// la drag/reorder); `sourceIdx` = din ce melodie-sursă vine (index în `sources`); `custom` = scris de la zero.
const BlockSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, default: "" },
  chordpro: { type: String, default: "" },
  sourceIdx: { type: Number, default: 0 },
  custom: { type: Boolean, default: false },
}, { _id: false });

// O gamă a snapshot-ului. La mashup pot fi mai multe (se afișează „A / B"). `sourceIdx` = melodia de proveniență.
const KeySchema = new mongoose.Schema({
  label: { type: String, default: "" },     // eticheta afișată (ex. „A")
  startKey: { type: String, default: "" },   // gama reală (ex. „Ab", „Em")
  sourceIdx: { type: Number, default: 0 },
}, { _id: false });

// Header de mashup inserat manual: titlu + bpm/meter; `afterBlockId` = după ce bloc stă (sequence-ul
// headerului se derivă DINAMIC din blocurile de sub el, vezi lib/songs/snapshot.js).
const HeaderSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, default: "" },
  bpm: { type: Number, default: null },
  meter: { type: String, default: "" },
  afterBlockId: { type: String, default: "" },
}, { _id: false });

// Melodie-sursă (informativ + pt. containerele de resurse / „Save as new").
const SourceSchema = new mongoose.Schema({
  songId: { type: mongoose.Schema.Types.ObjectId, ref: "PcSong", default: null },
  arrangementId: { type: mongoose.Schema.Types.ObjectId, ref: "PcArrangement", default: null },
  keyId: { type: mongoose.Schema.Types.ObjectId, ref: "PcKey", default: null },
  keyName: { type: String, default: "" },
  title: { type: String, default: "" },
}, { _id: false });

// Snapshot-ul complet, self-contained (vezi §4.2 din plan).
const SnapshotSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  bpm: { type: Number, default: null },
  meter: { type: String, default: "" },
  lengthSec: { type: Number, default: 0 },
  keys: { type: [KeySchema], default: [] },
  blocks: { type: [BlockSchema], default: [] },
  sequence: { type: [String], default: [] },   // derivat din blocks (sau custom), tokeni PCO
  headers: { type: [HeaderSchema], default: [] },
  sources: { type: [SourceSchema], default: [] },
}, { _id: false });

const schema = pcSchema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlanItem", default: null }, // itemul care o ține acum
  kind: { type: String, enum: ["single", "mashup"], default: "single" },
  snapshot: { type: SnapshotSchema, default: () => ({}) },
  sourceItemIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcPlanItem", default: [] }, // la mashup: itemii „consumați"
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null },
  savedAt: { type: Date, default: null },
});

schema.index({ orgId: 1, planId: 1 });

module.exports = pcModel("PcTempSong", schema, "pc_tempSongs");
