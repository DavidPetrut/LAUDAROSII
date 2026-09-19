const mongoose = require("mongoose");

/**
 * Catalog de statusuri/etichete pe care super-adminul le poate crea si atribui
 * userilor, pentru targetarea notificarilor (ex: lider de casa, echipa media).
 */
const notificationTagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("NotificationTag", notificationTagSchema);
