const mongoose = require("mongoose");

/**
 * Schema pentru reacții - reutilizabila și scalabila
 */
const reactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["thumbsup", "heart", "pray", "laugh"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  body: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  mediaUrl: {
    type: String,
    default: "",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  expiresAt: {
    type: Date,
    default: null,
  },
  bgColor: {
    type: String,
    default: null,
  },
  bgImage: {
    type: String,
    default: null,
  },
  reactions: [reactionSchema],
});

announcementSchema.index({ date: -1 });
announcementSchema.index({ authorId: 1 });
announcementSchema.index({ expiresAt: 1 });

announcementSchema.virtual("isExpired").get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

announcementSchema.virtual("reactionCounts").get(function () {
  const counts = { thumbsup: 0, heart: 0, pray: 0, laugh: 0, total: 0 };
  if (this.reactions) {
    this.reactions.forEach((r) => {
      counts[r.type]++;
      counts.total++;
    });
  }
  return counts;
});

announcementSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Announcement", announcementSchema);
