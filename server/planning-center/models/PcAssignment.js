/**
 * pc_assignments — programarea unei persoane pe o poziție/echipă într-un plan (§4.2, #2/#14/#17).
 * Sursa tab-ului Teams (grupat echipă → poziție → oameni + status).
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "PcTeam", required: true },
  positionId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPosition", default: null },
  personId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", required: true },
  timeIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcPlanTime", default: [] },
  status: { type: String, enum: ["unconfirmed", "confirmed", "declined"], default: "unconfirmed" },
  source: { type: String, default: "manual" }, // manual|template|autoSchedule|signup|group
  declineReason: { type: String, default: "" },
  // Scheduling + email
  prepared: { type: Boolean, default: false }, // „prepared" = nu vede până nu trimiți emailul
  repliesToPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null },
  notes: { type: String, default: "" },
  isGuest: { type: Boolean, default: false },
  isTemporaryPosition: { type: Boolean, default: false },
  tempPositionName: { type: String, default: "" },
  notificationSentAt: { type: Date, default: null }, // când s-a trimis emailul de programare
  responseToken: { type: String, default: null, index: true }, // token public pt. Accept/Decline din email
  // Istoric răspuns (pt. Reporting): când a acceptat/refuzat + dacă a refuzat DUPĂ ce confirmase.
  acceptedAt: { type: Date, default: null },
  declinedAt: { type: Date, default: null },
  declinedAfterConfirm: { type: Boolean, default: false },
  // ── Import PCO + flux de înlocuire (aditiv) ──
  scheduledByPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null },
  preparedAt: { type: Date, default: null }, // timeline: pregătit
  readAt: { type: Date, default: null },     // timeline: citit
  replacementPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null }, // cine l-a înlocuit
});

schema.index({ orgId: 1, planId: 1, teamId: 1 });
schema.index({ orgId: 1, personId: 1, status: 1 });
schema.index({ orgId: 1, planId: 1, positionId: 1, personId: 1 }, { unique: true, partialFilterExpression: { positionId: { $type: "objectId" } } });

module.exports = pcModel("PcAssignment", schema, "pc_assignments");
