/**
 * pc_integrations — integrări de fișiere muzicale la nivel de ORG (§11.6). MultiTracks = principala.
 * pc_integrationAccounts — contul linkat (per-user sau org) + status.
 * ⚠️ Realitate (§11.6): MultiTracks NU are API public pt. terți → linkarea + import-adapter = seam
 * pregătit; fetch-ul efectiv al fișierelor depinde de accesul MultiTracks.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const integrationSchema = pcSchema({
  provider: { type: String, required: true }, // multitracks|songselect|praisecharts
  enabled: { type: Boolean, default: false },
  config: { type: Object, default: {} },
});
integrationSchema.index({ orgId: 1, provider: 1 }, { unique: true });

const accountSchema = pcSchema({
  provider: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // per-user; null = org-level
  status: { type: String, enum: ["connected", "error", "needsRelink", "disconnected"], default: "disconnected" },
  externalLabel: { type: String, default: "" },
  linkedAt: { type: Date, default: null },
});
accountSchema.index({ orgId: 1, provider: 1, userId: 1 });

module.exports = {
  PcIntegration: pcModel("PcIntegration", integrationSchema, "pc_integrations"),
  PcIntegrationAccount: pcModel("PcIntegrationAccount", accountSchema, "pc_integrationAccounts"),
};
