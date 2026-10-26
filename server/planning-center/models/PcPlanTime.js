/** pc_planTimes — ore multiple per plan (service/rehearsal/other) (§4.2, #2/#15). UTC, afișare tz campus. */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", required: true },
  type: { type: String, enum: ["service", "rehearsal", "other"], default: "service" },
  name: { type: String, default: "" }, // ex. „Band Practice", „Pre-Service Prayer"
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, default: null },
  // ── „Times conduc totul" (PCO): ce echipe/poziții sunt asignate la acest timp + remindere per echipă ──
  assignedTeamIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcTeam", default: [] },
  assignedPositionIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcPosition", default: [] },
  teamReminders: { type: Map, of: Number, default: {} }, // teamId → zile (0–7) înainte
  recorded: { type: Boolean, default: false }, // Services LIVE (ulterior)
});

schema.index({ orgId: 1, planId: 1, startsAt: 1 });

module.exports = pcModel("PcPlanTime", schema, "pc_planTimes");
