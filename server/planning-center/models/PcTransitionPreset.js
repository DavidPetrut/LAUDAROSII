/**
 * pc_transitionPresets — tipuri de tranziție între melodii la mashup („Transition next song").
 * GLOBALE pe organizație (D8): publice tuturor, nu notițe personale. `createdByPersonId` = doar informativ.
 * Câteva default-uri standard se seed-ează o dată (isStandard). Aditiv, org-scoped.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  label: { type: String, required: true },          // ex. „Directă", „Acapella", „Instrumental"
  slug: { type: String, default: "" },              // id scurt stabil (pt. referință), ex. „direct"
  note: { type: String, default: "" },              // descriere scurtă (ce se întâmplă la tranziție)
  isStandard: { type: Boolean, default: false },     // presetat la seed
  sortOrder: { type: Number, default: 0 },
  createdByPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null },
});

schema.index({ orgId: 1, sortOrder: 1 });

module.exports = pcModel("PcTransitionPreset", schema, "pc_transitionPresets");

// Default-urile standard (seed-ate la prima citire dacă org-ul nu are niciunul).
module.exports.DEFAULTS = [
  { slug: "direct", label: "Directă", note: "Intră direct în melodia următoare, fără pauză.", sortOrder: 0 },
  { slug: "acapella", label: "Acapella", note: "Tranziție cântată fără instrumente.", sortOrder: 1 },
  { slug: "instrumental", label: "Instrumental", note: "Punte instrumentală între melodii.", sortOrder: 2 },
  { slug: "spoken", label: "Vorbit / rugăciune", note: "Moment vorbit sau de rugăciune între melodii.", sortOrder: 3 },
  { slug: "fade", label: "Fade", note: "Prima melodie se stinge treptat, intră următoarea.", sortOrder: 4 },
];
