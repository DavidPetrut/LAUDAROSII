const mongoose = require("mongoose");

/**
 * Schema pentru programele de rugaciune / devotional cu playlisturi.
 * Scalabil: `type` distinge worship/prayer/study/bible; `ownerId` null = program
 * global (built-in), altfel un program creat de un user (viitor). Fiecare piesa are
 * `category` (instrumental / lyrics) ca sa poti alege genul in ecran.
 */
const prayerProgramSchema = new mongoose.Schema({
  programId: {
    type: String,
    required: true,
    unique: true,
  },
  // worship | prayer | study | bible ... (pregatit pentru programe viitoare per-user)
  type: {
    type: String,
    default: "worship",
    index: true,
  },
  // null = program global (built-in); altfel apartine unui user (customizare viitoare)
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
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
  // Durata minima permisa (min), ex: worship = 15
  minMinutes: {
    type: Number,
    default: 15,
  },
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
      // instrumental (fisiere "audio*") sau lyrics (fisiere "words*")
      category: {
        type: String,
        enum: ["instrumental", "lyrics"],
        default: "instrumental",
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
