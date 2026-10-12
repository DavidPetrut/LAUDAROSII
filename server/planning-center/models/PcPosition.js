/** pc_positions — poziții într-o echipă (§4.2). Ex. „Parcare", „Intrare auditorium & colecta". */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "PcTeam", required: true },
  name: { type: String, required: true, trim: true },
  sortOrder: { type: Number, default: 0 },
});

schema.index({ orgId: 1, teamId: 1, sortOrder: 1 });

module.exports = pcModel("PcPosition", schema, "pc_positions");
