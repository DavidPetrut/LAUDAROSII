const mongoose = require("mongoose");

/**
 * Devotional creat de user: o rutina (in stil "Structured") formata din task-uri
 * (fiecare cu iconita, culoare si durata). Un singur devotional poate fi "default"
 * (activ) per user. `schedule.weekdays` = zilele in care apare (1=Duminica..7=Sambata);
 * `completions` = zilele in care a fost terminat, pentru gating (ascunde butonul pana
 * la urmatoarea zi programata).
 */
const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 60 },
    icon: { type: String, default: "flower-outline" },
    iconSet: { type: String, default: "ionicons" },
    color: { type: String, default: "#10b981" },
    durationMin: { type: Number, default: 5, min: 1, max: 180 },
  },
  { _id: true }
);

const devotionalSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  icon: { type: String, default: "book-outline" },
  iconSet: { type: String, default: "ionicons" },
  color: { type: String, default: "#10b981" },
  tasks: { type: [taskSchema], default: [] },
  schedule: {
    weekdays: { type: [Number], default: [] },
  },
  isDefault: { type: Boolean, default: false, index: true },
  completions: { type: [Date], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Devotional", devotionalSchema);
