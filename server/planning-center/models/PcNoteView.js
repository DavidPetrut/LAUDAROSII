/**
 * pc_noteViews — note de plan cu „view-uri" țintite (cerință David). Un coordonator scrie mai multe view-uri;
 * fiecare are audiență = echipe + roluri (poziții) + opțional „anumiți oameni" (pinned = suprascrie tot).
 * Un privitor vede UN SINGUR view: cel mai prioritar care-l prinde (pinned > restul, apoi după `priority`).
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", required: true },
  createdByPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null },
  title: { type: String, default: "" },
  content: { type: String, default: "" },
  teamIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcTeam", default: [] },
  roleNames: { type: [String], default: [] },                                   // nume de poziții care pot vedea
  specificPersonIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcPerson", default: [] }, // dacă ≥1 → pinned
  pinned: { type: Boolean, default: false },                                    // view cu „anumiți oameni" (prioritate maximă)
  priority: { type: Number, default: 0 },                                       // ordine drag (mai mare = mai prioritar)
});

schema.index({ orgId: 1, planId: 1, priority: -1 });

module.exports = pcModel("PcNoteView", schema, "pc_noteViews");
