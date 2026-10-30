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
  // medley = container cu mai multe „snippet"-uri de cântec (vezi `medley[]` mai jos), afișat cu săgeți jos.
  type: { type: String, enum: ["header", "item", "song", "media", "medley"], default: "item" },
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
  // ── Voci structurate (aditiv) — lead / support(S) / alto(A) / tenor(T)… ─────────────────────
  // Sursa de adevăr pt. părți. `description` rămâne text liber (restul notelor). La afișare, dacă
  // `voices` e gol se cade pe `description` (datele PCO importate care au S/A/T doar în text se randează).
  // Multi-rol permis: aceeași persoană poate apărea în mai multe roluri. `name` = fallback pt. guest.
  voices: {
    type: [{
      role: { type: String, enum: ["lead", "support", "alto", "tenor", "soprano", "bass", "custom"], default: "lead" },
      personId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null },
      name: { type: String, default: "" },
    }],
    default: [],
  },
  // ── Alte slujiri (aditiv) — pe un item (element): persoane pe slujiri non-vocale din Matrix-ul săptămânii:
  // host(Gazdă serviciu) / communion(Vorbitor cină) / prayer(Îndemn rugăciune) / preach(Predică). Avatar + nume, ca Lead.
  ministries: {
    type: [{
      kind: { type: String, default: "" }, // host|communion|prayer|preach
      personId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null },
      name: { type: String, default: "" }, // fallback dacă nu e persoană din DB
    }],
    default: [],
  },
  // ── Tranziție (aditiv) — cântec/parte folosit(ă) doar ca punte: indent + „!" + timp EXCLUS din total.
  isTransition: { type: Boolean, default: false },
  // ── Medley (aditiv) — pt. type:"medley": listă de snippet-uri de cântec, în ordine (săgeți jos).
  // Chartul combinat se randează DERIVAT (concatenează chord chart-urile copiilor) — fără storage nou.
  medley: {
    type: [{
      songId: { type: mongoose.Schema.Types.ObjectId, ref: "PcSong", default: null },
      arrangementId: { type: mongoose.Schema.Types.ObjectId, ref: "PcArrangement", default: null },
      keyId: { type: mongoose.Schema.Types.ObjectId, ref: "PcKey", default: null },
      keyName: { type: String, default: "" },
      title: { type: String, default: "" },
      sequence: { type: [String], default: [] }, // doar părțile cântate (ex. „Bridge", „Coda")
      lengthSec: { type: Number, default: 0 },
      note: { type: String, default: "" },
      sortOrder: { type: Number, default: 0 },
    }],
    default: [],
  },
  // ── Import PCO (aditiv) ──
  htmlDetails: { type: String, default: "" }, // tab „Detail" (rich-text → raport)
  // Per-service-time: exclude item de la un timp + offset de lungime (pt. „exclude item from a time").
  itemTimes: { type: [{ timeId: mongoose.Schema.Types.ObjectId, exclude: Boolean, lengthOffsetSec: Number }], default: [] },
  ccli: { type: Object, default: {} }, // CCLI reporting data per song item (print/digital/recording…)
});

schema.index({ orgId: 1, planId: 1, sortOrder: 1 });

module.exports = pcModel("PcPlanItem", schema, "pc_planItems");
