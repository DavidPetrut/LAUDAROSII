/** pc_membershipTypes — tipuri de membru configurabile (§4.2, #11). */
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  name: { type: String, required: true, trim: true },
  sortOrder: { type: Number, default: 0 },
});

schema.index({ orgId: 1, sortOrder: 1 });

module.exports = pcModel("PcMembershipType", schema, "pc_membershipTypes");
