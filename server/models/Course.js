const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    default: "",
    maxlength: 2000,
  },
  videoUrl: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    enum: ["muzica", "tehnic", "spiritual", "leadership", "general"],
    default: "general",
  },
  duration: {
    type: Number,
    default: 0,
    min: 0,
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  postedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

courseSchema.index({ category: 1 });
courseSchema.index({ postedAt: -1 });
courseSchema.index({ isActive: 1 });
courseSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Course", courseSchema);
