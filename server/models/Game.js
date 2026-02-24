const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  gameKey: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  multiplayer: {
    type: Boolean,
    default: false,
  },
  highScores: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      score: {
        type: Number,
        required: true,
        min: 0,
      },
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  rules: {
    questionsPerGame: { type: Number, default: 8 },
    timePerQuestion: { type: Number, default: 15 },
    pointsPerCorrect: { type: Number, default: 100 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

gameSchema.index({ gameKey: 1 }, { unique: true });
gameSchema.index({ "highScores.userId": 1 });
gameSchema.index({ "highScores.score": -1 });

module.exports = mongoose.model("Game", gameSchema);
