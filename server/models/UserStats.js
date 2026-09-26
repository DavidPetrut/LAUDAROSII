const mongoose = require("mongoose");

const userStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Prayer stats
    totalPrayersAdded: {
      type: Number,
      default: 0,
    },
    totalPrayersAnswered: {
      type: Number,
      default: 0,
    },
    totalPrayedForOthers: {
      type: Number,
      default: 0,
    },
    // Winstreak stats
    currentWinstreak: {
      type: Number,
      default: 0,
    },
    bestWinstreak: {
      type: Number,
      default: 0,
    },
    lastWinstreakUpdate: {
      type: Date,
      default: null,
    },
    // Devotional stats
    devotionalDaysCompleted: {
      type: Number,
      default: 0,
    },
    lastDevotionalDay: {
      type: String,
      default: null,
    },
    // Activity streak stats
    activityStreak: {
      type: Number,
      default: 0,
    },
    bestActivityStreak: {
      type: Number,
      default: 0,
    },
    lastActivityDay: {
      type: String,
      default: null,
    },
    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Static method: Get or create stats for user
userStatsSchema.statics.getOrCreate = async function (userId) {
  let stats = await this.findOne({ userId });
  if (!stats) {
    stats = await this.create({ userId });
  }
  return stats;
};

// Static method: Increment prayer count
userStatsSchema.statics.incrementPrayersAdded = async function (userId) {
  return this.findOneAndUpdate(
    { userId },
    {
      $inc: { totalPrayersAdded: 1 },
      $set: { updatedAt: new Date() },
    },
    { upsert: true, new: true }
  );
};

// Static method: Increment answered prayer count
userStatsSchema.statics.incrementPrayersAnswered = async function (userId) {
  return this.findOneAndUpdate(
    { userId },
    {
      $inc: { totalPrayersAnswered: 1 },
      $set: { updatedAt: new Date() },
    },
    { upsert: true, new: true }
  );
};

// Static method: Update winstreak (called when user prays for someone)
userStatsSchema.statics.updateWinstreak = async function (userId, newCount) {
  const stats = await this.findOne({ userId });
  const now = new Date();

  let update = {
    currentWinstreak: newCount,
    lastWinstreakUpdate: now,
    $inc: { totalPrayedForOthers: 1 },
    updatedAt: now,
  };

  // Update best winstreak if current is higher
  if (!stats || newCount > (stats.bestWinstreak || 0)) {
    update.bestWinstreak = newCount;
  }

  return this.findOneAndUpdate(
    { userId },
    { $set: update, $inc: { totalPrayedForOthers: 1 } },
    { upsert: true, new: true }
  );
};

// Static method: Reset winstreak
userStatsSchema.statics.resetWinstreak = async function (userId) {
  return this.findOneAndUpdate(
    { userId },
    {
      $set: {
        currentWinstreak: 0,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
};

// Cheia zilei calendaristice (UTC) pentru comparatii de streak
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const isYesterday = (prevKey, todayKey) => {
  const prev = new Date(`${prevKey}T00:00:00Z`).getTime();
  const today = new Date(`${todayKey}T00:00:00Z`).getTime();
  return today - prev === 86400000;
};

// Static method: Inregistreaza activitatea de azi si actualizeaza streak-ul zilnic
userStatsSchema.statics.touchActivity = async function (userId) {
  const stats = await this.getOrCreate(userId);
  const today = dayKey();
  if (stats.lastActivityDay === today) return stats;

  if (stats.lastActivityDay && isYesterday(stats.lastActivityDay, today)) {
    stats.activityStreak = (stats.activityStreak || 0) + 1;
  } else {
    stats.activityStreak = 1;
  }
  if (stats.activityStreak > (stats.bestActivityStreak || 0)) {
    stats.bestActivityStreak = stats.activityStreak;
  }
  stats.lastActivityDay = today;
  await stats.save();
  return stats;
};

// Static method: Marcheaza o zi de devotional finalizata (o singura data pe zi)
userStatsSchema.statics.markDevotionalDay = async function (userId) {
  const stats = await this.getOrCreate(userId);
  const today = dayKey();
  if (stats.lastDevotionalDay === today) return stats;
  stats.devotionalDaysCompleted = (stats.devotionalDaysCompleted || 0) + 1;
  stats.lastDevotionalDay = today;
  await stats.save();
  return stats;
};

module.exports = mongoose.model("UserStats", userStatsSchema);
