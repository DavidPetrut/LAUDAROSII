/**
 * pc_teams — echipe (§4.2). Minimal pt. felia People (My Teams + filtre).
 * flags (rehearsal/secure/split/tag) există din start; se folosesc la Services core (aditiv).
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  name: { type: String, required: true, trim: true }, // ex. „Asimilare (SIM 1)"
  serviceTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "PcServiceType", default: null },
  serviceTypeIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcServiceType", default: [] }, // multi (PCO 2026)
  flags: {
    rehearsal: { type: Boolean, default: false },
    secure: { type: Boolean, default: false },
    split: { type: Boolean, default: false },
    tag: { type: Boolean, default: false },
  },
  sortOrder: { type: Number, default: 0 },
  archived: { type: Boolean, default: false },
  // ── Import PCO (aditiv) ──
  repliesToMode: { type: String, default: "currentScheduler" }, // currentScheduler|allLeaders|person
  onDecline: { type: String, default: "manual" }, // doNotReschedule|manual|replacement|autoSchedule|signup
  scheduledViewerAccess: { type: String, default: "myScheduleOnly" }, // fullPlan|myScheduleOnly
  defaultStatus: { type: String, default: "unconfirmed" }, // unconfirmed|confirmed
  defaultPrepared: { type: Boolean, default: false },
  relatedTeamIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcTeam", default: [] },
  // ── Nou (lider): gruparea în cele 5 slujiri mari (grila People→asignare) ──
  ministryGroup: { type: String, default: "" }, // „Asimilare"|„Laudă și Închinare"|„Vertical Kids"|„Media"|„Creative"
});

schema.index({ orgId: 1, serviceTypeId: 1, sortOrder: 1 });

module.exports = pcModel("PcTeam", schema, "pc_teams");
