const mongoose = require("mongoose");

/**
 * O notificare-broadcast trimisa de un super-admin catre segmente de useri
 * (dupa taguri/roluri). Poate fi trimisa imediat sau programata (sendAt in viitor);
 * un scheduler o livreaza cand devine scadenta. Optional trimite si email.
 */
const broadcastSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fromName: { type: String, default: "" },
  title: { type: String, default: "", maxlength: 80 },
  message: { type: String, required: true, maxlength: 500 },
  targetTags: { type: [String], default: [] },
  targetRoles: { type: [String], default: [] },
  sendEmail: { type: Boolean, default: false },
  sendAt: { type: Date, required: true, index: true },
  status: {
    type: String,
    enum: ["pending", "sent", "failed", "canceled"],
    default: "pending",
    index: true,
  },
  recipientCount: { type: Number, default: 0 },
  sentAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Broadcast", broadcastSchema);
