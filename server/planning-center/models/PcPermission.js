/**
 * pc_permissions — permisiuni scoped & multi-dimensionale per user (§5.5).
 * STORED: 3 niveluri + file access, pe un scope (global/folder/serviceType).
 * Restul capabilităților = DERIVATE (core/permissions.js).
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  scope: { type: String, default: "global" }, // "global" | "folder:<id>" | "serviceType:<id>"
  peoplePlansLevel: {
    type: String,
    enum: ["scheduledViewer", "viewer", "scheduler", "editor", "administrator", "orgAdmin"],
    default: "viewer",
  },
  songLevel: {
    type: String,
    enum: ["scheduledViewer", "viewer", "editor", "administrator"],
    default: "viewer",
  },
  mediaLevel: {
    type: String,
    enum: ["scheduledViewer", "viewer", "editor", "administrator"],
    default: "viewer",
  },
  fileAccess: {
    plan: { type: Boolean, default: false },
    song: { type: Boolean, default: false },
    media: { type: Boolean, default: false },
  },
});

schema.index({ orgId: 1, userId: 1, scope: 1 }, { unique: true });

module.exports = pcModel("PcPermission", schema, "pc_permissions");
