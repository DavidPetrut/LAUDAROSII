const mongoose = require("mongoose");

/**
 * Schema pentru programele de rugaciune cu playlisturi
 * Scalabil pentru adaugarea de noi programe și melodii
 */
const prayerProgramSchema = new mongoose.Schema({
  programId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  emoji: {
    type: String,
    default: "🙏",
  },
  description: String,
  durations: [Number],
  hasOptions: {
    type: Boolean,
    default: false,
  },
  playlist: [
    {
      title: String,
      url: {
        type: String,
        required: true,
      },
      duration: Number,
      addedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("PrayerProgram", prayerProgramSchema);
