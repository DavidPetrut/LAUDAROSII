const mongoose = require("mongoose");

/**
 * O "lista de rugaciuni" privata a unui user (max 3 per user). Motivele traiesc
 * embedded in lista: stergerea listei sterge automat toate motivele ei. `expiresAt`
 * marcheaza cand lista devine inactiva (nu se sterg motivele, doar se dezactiveaza
 * pana la reincarcare). Lista publica NU e aici: ea sta pe User.content.prayers.
 */
const boardPrayerSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 1000 },
    isUrgent: { type: Boolean, default: false },
    answered: { type: Boolean, default: false },
    mood: {
      type: String,
      enum: [
        "tulburat",
        "incredere",
        "eliberare",
        "voia_lui",
        "persistent",
        "nelinistit",
        "astept",
        null,
      ],
      default: null,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const prayerBoardSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  title: { type: String, required: true, trim: true, maxlength: 60 },
  image: { type: String, default: "" },
  expiresAt: { type: Date, default: null },
  prayers: { type: [boardPrayerSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

prayerBoardSchema.index({ ownerId: 1, createdAt: 1 });

module.exports = mongoose.model("PrayerBoard", prayerBoardSchema);
