/**
 * pc_alerts — „Planning Center Alert": mesaj OBLIGATORIU (cu confirmare de citire) trimis DOAR oamenilor
 * programați în anumite echipe pe un plan (săptămâna respectivă), nu tuturor. Creat din tab-ul Alerts.
 * Apare ca pop-up full-screen (mobil 80% / web centrat) care nu se poate închide până la „Am înțeles".
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", required: true },
  createdByPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null },
  title: { type: String, default: "" },
  body: { type: String, default: "" },
  teamIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcTeam", default: [] }, // echipele-țintă (din săptămâna aceea)
  attachments: { type: [{ name: String, url: String, kind: String, resourceType: String, bytes: Number }], default: [] }, // kind: file|image|video|audio
  links: { type: [{ label: String, url: String }], default: [] },
  status: { type: String, enum: ["sent", "scheduled"], default: "sent" },
  scheduledAt: { type: Date, default: null }, // dacă status=scheduled → devine activă când scheduledAt <= now
  sentAt: { type: Date, default: null },
  pushedAt: { type: Date, default: null }, // push trimis o singură dată (guard pt. scheduler)
});

schema.index({ orgId: 1, planId: 1, createdAt: -1 });

module.exports = pcModel("PcAlert", schema, "pc_alerts");
