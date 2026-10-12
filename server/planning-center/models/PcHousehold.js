/** pc_households — gospodării (§4.2). Oamenii se leagă prin pc_people.householdId. */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  name: { type: String, required: true, trim: true },
  primaryContactPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null },
});

schema.index({ orgId: 1, name: 1 });

module.exports = pcModel("PcHousehold", schema, "pc_households");
