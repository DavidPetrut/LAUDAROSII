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
    music: {
      enabled: { type: Boolean, default: false },
      category: { type: String, enum: ["instrumental", "lyrics"], default: "instrumental" },
    },
    // lista de rugaciuni atasata momentului: "public" = lista publica a userului,
    // "private" = un PrayerBoard al userului (boardId), "prayroom" = o camera de
    // rugaciune a userului (roomId). Rezolvata la rulare.
    prayerList: {
      kind: { type: String, enum: ["public", "private", "prayroom", null], default: null },
      boardId: { type: mongoose.Schema.Types.ObjectId, ref: "PrayerBoard", default: null },
      roomId: { type: mongoose.Schema.Types.ObjectId, ref: "PrayRoom", default: null },
    },
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
  // imaginea devotionalului: "preset:<cheie>" (poza din app) sau data URI (upload)
  image: { type: String, default: "" },
  tasks: { type: [taskSchema], default: [] },
  schedule: {
    weekdays: { type: [Number], default: [] },
    repeatWeekly: { type: Boolean, default: true },
  },
  // o singura notificare (memento) per devotional, locala pe telefonul userului
  notification: {
    enabled: { type: Boolean, default: false },
    message: { type: String, default: "", maxlength: 160 },
    hour: { type: Number, default: 8, min: 0, max: 23 },
    minute: { type: Number, default: 0, min: 0, max: 59 },
  },
  isDefault: { type: Boolean, default: false, index: true },
  completions: { type: [Date], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Devotional", devotionalSchema);
