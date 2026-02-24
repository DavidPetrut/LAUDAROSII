const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    oderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["thumbsup", "heart", "pray"],
      required: true,
    },
  },
  { _id: false }
);

const prayerItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  isUrgent: {
    type: Boolean,
    default: false,
  },
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
  reactions: [reactionSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const prayerListSchema = new mongoose.Schema({
  programType: {
    type: String,
    enum: ["sim", "tineret"],
    required: true,
  },
  weekStart: {
    type: Date,
    required: true,
  },
  weekEnd: {
    type: Date,
    required: true,
  },
  predicatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  shareCode: {
    type: String,
    unique: true,
    required: true,
  },
  prayers: [prayerItemSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

prayerListSchema.index({ programType: 1, weekStart: 1 });
prayerListSchema.index({ shareCode: 1 }, { unique: true });
prayerListSchema.index({ isActive: 1 });

module.exports = mongoose.model("PrayerList", prayerListSchema);
