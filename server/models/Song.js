const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  artist: {
    type: String,
    default: "",
  },
  lyrics: {
    type: String,
    default: "",
  },
  key: {
    type: String,
    default: "",
  },
  tempo: {
    type: Number,
  },
  videoUrl: {
    type: String,
    default: "",
  },
  audioUrl: {
    type: String,
    default: "",
  },
  chordsUrl: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    enum: ["worship", "praise", "hymn", "special"],
    default: "worship",
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

songSchema.index({ title: "text", artist: "text" });
songSchema.index({ category: 1 });

module.exports = mongoose.model("Song", songSchema);
