/** pc_positions — poziții într-o echipă (§4.2). Ex. „Parcare", „Intrare auditorium & colecta". */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "PcTeam", required: true },
  name: { type: String, required: true, trim: true },
  sortOrder: { type: Number, default: 0 },
  fileTags: { type: [String], default: [] }, // limited file visibility (PCO)
  // ── Nou (lider): filtre pre-selectate + recomandare + instrucțiuni per poziție ──
  defaultGender: { type: String, enum: ["M", "F", "any"], default: "any" },   // parcare=M, etc.
  defaultProgram: { type: String, enum: ["1", "2", "any"], default: "any" },  // SIM/program
  recommendRule: { type: Object, default: {} }, // ex. { targetPerMonth: 2 } → sortarea listei din dreapta
  instructions: { type: String, default: "" },  // „manual" per poziție (onboarding) → in-app/email/push
});

schema.index({ orgId: 1, teamId: 1, sortOrder: 1 });

module.exports = pcModel("PcPosition", schema, "pc_positions");
