/** pc_series — serie de predici (PCO Series). Leagă planuri cu același mesaj, chiar cross-service-type. */
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  title: { type: String, required: true, trim: true },
  artworkUrl: { type: String, default: "" }, // URL (NU în DB — invariant §1.8)
  hasArtwork: { type: Boolean, default: false },
});

schema.index({ orgId: 1, title: 1 });

module.exports = pcModel("PcSeries", schema, "pc_series");
