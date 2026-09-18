const mongoose = require("mongoose");

/**
 * Planul devotional al unui user. Un singur plan activ per user (poate fi sters
 * = active:false). Pentru moment doar "monthly": la creare se genereaza ferestre
 * saptamanale exacte (start/end), fiecare cu un target (de cate ori sa se roage)
 * si un contor `completed`. Scorul saptamanal se calculeaza din completed/target
 * la citire; nu masoara "standardul lui Dumnezeu", ci intentionalitatea userului.
 */
const weekSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    target: { type: Number, required: true, min: 1 },
    completed: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const devotionalPlanSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  // deocamdata doar "monthly" (pregatit pentru saptamanal/custom in viitor)
  period: {
    type: String,
    enum: ["monthly"],
    default: "monthly",
  },
  // de cate ori pe saptamana isi propune sa se roage
  weeklyGoal: {
    type: Number,
    required: true,
    min: 1,
    max: 50,
  },
  // ariile pe care vrea sa se concentreze (din quiz) - etichete scurte
  focusAreas: {
    type: [String],
    default: [],
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  weeks: { type: [weekSchema], default: [] },
  active: {
    type: Boolean,
    default: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Genereaza ferestre saptamanale de 7 zile de la start pana la end (perioada lunara).
 */
devotionalPlanSchema.statics.buildWeeks = function (startDate, endDate, target) {
  const weeks = [];
  const dayMs = 24 * 60 * 60 * 1000;
  let cursor = new Date(startDate);
  let index = 1;
  while (cursor < endDate) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(Math.min(cursor.getTime() + 7 * dayMs, endDate.getTime()));
    weeks.push({ index, startDate: weekStart, endDate: weekEnd, target, completed: 0 });
    cursor = weekEnd;
    index += 1;
  }
  return weeks;
};

module.exports = mongoose.model("DevotionalPlan", devotionalPlanSchema);
