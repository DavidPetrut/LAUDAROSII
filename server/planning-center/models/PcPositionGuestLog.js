/**
 * pc_position_guest_logs — jurnal „om real pus ca GUEST pe o poziție (doar pentru o zi)".
 * Diferit de invitatul clasic (PcAssignment.isGuest = nume liber, fără PcPerson): aici persoana
 * EXISTĂ în baza noastră, dar NU face parte din rosterul poziției. O punem temporar pe un plan și
 * logăm faptul, ca să putem ști mai târziu „X a fost guest de N ori pe poziția Y" (→ eventual îl
 * promovăm în roster). Asignarea în sine rămâne în PcAssignment; ăsta e doar jurnalul de context.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  personId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", required: true },
  positionId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPosition", required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "PcTeam", default: null },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", default: null },
  date: { type: Date, default: null },            // data planului (pt. afișare/filtrare)
  positionName: { type: String, default: "" },     // snapshot (poziția poate fi redenumită ulterior)
  teamName: { type: String, default: "" },
});

schema.index({ orgId: 1, personId: 1 });
schema.index({ orgId: 1, positionId: 1 });
schema.index({ orgId: 1, personId: 1, positionId: 1 });

module.exports = pcModel("PcPositionGuestLog", schema, "pc_position_guest_logs");
