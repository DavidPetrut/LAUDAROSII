const mongoose = require("mongoose");

/**
 * Template de devotional: un devotional "premade" creat de un user cu grant
 * (capabilitatea templates.manage), pe care ceilalti il pot alege si importa.
 * Pe fiecare moment, creatorul poate lasa lista si/sau muzica pe "userul alege"
 * (chooseList / chooseMusic) — la import, userul le configureaza el.
 * Stergerea unui template NU atinge devotionalele deja importate de useri.
 */
const templateTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 60 },
    icon: { type: String, default: "flower-outline" },
    iconSet: { type: String, default: "ionicons" },
    color: { type: String, default: "#10b981" },
    durationMin: { type: Number, default: 5, min: 1, max: 180 },
    music: {
      enabled: { type: Boolean, default: false },
      category: { type: String, enum: ["instrumental", "lyrics"], default: "instrumental" },
    },
    chooseMusic: { type: Boolean, default: false },
    prayerList: {
      kind: { type: String, enum: ["public", "private", "prayroom", null], default: null },
      boardId: { type: mongoose.Schema.Types.ObjectId, ref: "PrayerBoard", default: null },
      roomId: { type: mongoose.Schema.Types.ObjectId, ref: "PrayRoom", default: null },
    },
    chooseList: { type: Boolean, default: false },
  },
  { _id: true }
);

const devotionalTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  icon: { type: String, default: "book-outline" },
  iconSet: { type: String, default: "ionicons" },
  color: { type: String, default: "#10b981" },
  image: { type: String, default: "" },
  tasks: { type: [templateTaskSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  createdByName: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

devotionalTemplateSchema.index({ name: 1 });

module.exports = mongoose.model("DevotionalTemplate", devotionalTemplateSchema);
