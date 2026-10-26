/**
 * pc_planItems — ordinea serviciului (§4.2, #2/#15/#16). Un item poate fi:
 *  - header  = secțiune (bară gri: „ÎNCHINARE PRIN CÂNTARE")
 *  - item    = element liber (ex. „Verificări", „Welcome")
 *  - song / media = cântec/media linkate
 * Fiecare item deschide un ecran de detaliu (titlu, timp, During All, Description, leader, NOTES/SONG/MEDIA/FILES).
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", required: true },
  type: { type: String, enum: ["header", "item", "song", "media"], default: "item" },
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  lengthSec: { type: Number, default: 0 },
  leaderId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null }, // back-compat (single)
  // Lideri de item (co-lideri): prin persoană SAU prin poziție (se auto-rezolvă persoana programată).
  leaders: {
    type: [{ personId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson" }, positionId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPosition" } }],
    default: [],
  },
  keyName: { type: String, default: "" }, // badge key pt. song (ex. „C", „D"); „M" pt. media
  // Plasare față de serviciu + la ce ore apare.
  placement: { type: String, enum: ["before", "during", "after"], default: "during" },
  duringAll: { type: Boolean, default: true },
  timeIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcPlanTime", default: [] }, // ore aplicabile (gol = toate)
  // Dacă e song/media linkat:
  songId: { type: mongoose.Schema.Types.ObjectId, ref: "PcSong", default: null },
  arrangementId: { type: mongoose.Schema.Types.ObjectId, ref: "PcArrangement", default: null },
  keyId: { type: mongoose.Schema.Types.ObjectId, ref: "PcKey", default: null },
  mediaItemId: { type: mongoose.Schema.Types.ObjectId, ref: "PcMediaItem", default: null }, // dacă type=media linkat din bibliotecă
  sequence: { type: [String], default: [] }, // secvență one-time pt. acest plan (gol = moștenește din aranjament)
  rowColor: { type: String, default: "" },
  sortOrder: { type: Number, default: 0 },
  // ── Import PCO (aditiv) ──
  htmlDetails: { type: String, default: "" }, // tab „Detail" (rich-text → raport)
  // Per-service-time: exclude item de la un timp + offset de lungime (pt. „exclude item from a time").
  itemTimes: { type: [{ timeId: mongoose.Schema.Types.ObjectId, exclude: Boolean, lengthOffsetSec: Number }], default: [] },
  ccli: { type: Object, default: {} }, // CCLI reporting data per song item (print/digital/recording…)
});

schema.index({ orgId: 1, planId: 1, sortOrder: 1 });

module.exports = pcModel("PcPlanItem", schema, "pc_planItems");
