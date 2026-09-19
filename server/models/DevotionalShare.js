const mongoose = require("mongoose");

/**
 * Partajarea unui devotional catre alt user. Pastreaza un snapshot complet al
 * devotionalului (nume, iconita, culoare, task-uri) ca sa poata fi copiat identic
 * la acceptare, independent de modificarile ulterioare ale sursei.
 */
const snapshotTaskSchema = new mongoose.Schema(
  {
    title: String,
    icon: String,
    iconSet: String,
    color: String,
    durationMin: Number,
  },
  { _id: false }
);

const devotionalShareSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fromUserName: { type: String, default: "" },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  snapshot: {
    name: String,
    icon: String,
    iconSet: String,
    color: String,
    tasks: { type: [snapshotTaskSchema], default: [] },
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    default: "pending",
    index: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DevotionalShare", devotionalShareSchema);
