const mongoose = require("mongoose");

/**
 * Mesaj salvat de un super-admin, reutilizabil la compunerea unei notificari
 * (ex: titlu "pentru botez" -> populeaza mesajul).
 */
const broadcastTemplateSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 60 },
  message: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("BroadcastTemplate", broadcastTemplateSchema);
