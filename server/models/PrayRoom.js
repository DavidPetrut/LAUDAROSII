const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hasAccepted: {
      type: Boolean,
      default: false,
    },
    hasFinalized: {
      type: Boolean,
      default: false,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const prayerSchema = new mongoose.Schema(
  {
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
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const completionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    prayerId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const dailyProgressSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    completions: [completionSchema],
  },
  { _id: false }
);

const prayRoomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    maxlength: 100,
  },
  icon: {
    type: String,
    enum: ["room_icon1", "room_icon2", "room_icon3"],
    default: "room_icon1",
  },
  roomType: {
    type: String,
    enum: ["common", "targeted", "roulette"],
    default: "common",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  members: [memberSchema],
  settings: {
    durationDays: {
      type: Number,
      enum: [3, 7, 30],
      required: true,
    },
    prayerDays: {
      type: [Number],
      validate: {
        validator: (arr) => arr.every((d) => d >= 0 && d <= 6),
        message: "Zilele trebuie sa fie intre 0 (Duminica) si 6 (Sambata)",
      },
      required: true,
    },
    minMinutes: {
      type: Number,
      enum: [0, 15, 30],
      default: 0,
    },
    whoCanPost: {
      type: String,
      enum: ["CREATOR_ONLY", "ALL"],
      default: "ALL",
    },
    maxPrayers: {
      type: Number,
      default: 2,
      min: 1,
      max: 10,
    },
  },
  prayers: [prayerSchema],
  dailyProgress: [dailyProgressSchema],
  state: {
    type: String,
    enum: ["PENDING", "ACTIVE", "FINISHED"],
    default: "PENDING",
  },
  startDate: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date,
    default: null,
  },
  joinDeadline: {
    type: Date,
    default: null,
  },
  finalScore: {
    type: Number,
    default: null,
  },
  finishedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  selectedParticipants: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ],
  rouletteAssignments: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      assignedAt: { type: Date, default: Date.now },
      revealed: { type: Boolean, default: false },
      completedPrayerIds: [{ type: String }],
      lastCompletedReset: { type: Date, default: Date.now },
    },
  ],
});

prayRoomSchema.index({ state: 1 });
prayRoomSchema.index({ createdBy: 1 });
prayRoomSchema.index({ "members.userId": 1 });
prayRoomSchema.index({ endDate: 1, state: 1 });

// Genereaza cod unic de 6 cifre
prayRoomSchema.statics.generateRoomCode = async function () {
  let code;
  let exists = true;
  while (exists) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    exists = await this.findOne({ roomCode: code });
  }
  return code;
};

// Returneaza numarul de membri activi (hasAccepted = true)
prayRoomSchema.statics.getActiveMembersCount = async function (roomId) {
  const room = await this.findById(roomId);
  if (!room) return 0;
  return room.members.filter((m) => m.hasAccepted).length;
};

// Calculeaza scorul pentru o zi specifica
prayRoomSchema.statics.calculateDailyScore = async function (roomId, date) {
  const room = await this.findById(roomId);
  if (!room) return 0;

  const activeMembers = room.members.filter((m) => m.hasAccepted);
  if (activeMembers.length === 0) return 0;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const dayProgress = room.dailyProgress.find((dp) => {
    const dpDate = new Date(dp.date);
    return dpDate >= dayStart && dpDate <= dayEnd;
  });

  if (!dayProgress) return 0;

  const uniqueUsers = new Set(dayProgress.completions.map((c) => c.userId.toString()));
  return Math.round((uniqueUsers.size / activeMembers.length) * 100);
};

// Calculeaza scorul final - media scorurilor zilnice
prayRoomSchema.statics.calculateFinalScore = async function (roomId) {
  const room = await this.findById(roomId);
  if (!room) return 0;

  const activeMembers = room.members.filter((m) => m.hasAccepted);
  if (activeMembers.length === 0) return 0;

  const prayerDaysSet = new Set(room.settings.prayerDays);
  const startDate = new Date(room.startDate);
  const endDate = new Date(room.endDate);
  const now = new Date();
  const effectiveEnd = now < endDate ? now : endDate;

  let totalDays = 0;
  let totalScore = 0;

  for (let d = new Date(startDate); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (prayerDaysSet.has(dayOfWeek)) {
      totalDays++;
      const dayScore = await this.calculateDailyScore(roomId, new Date(d));
      totalScore += dayScore;
    }
  }

  if (totalDays === 0) return 0;
  return Math.round(totalScore / totalDays);
};

// Returneaza verdictul spiritual bazat pe scor
prayRoomSchema.statics.getVerdict = function (score) {
  if (score === 0) return "Rugaciune Absenta";
  if (score < 25) return "Nivel scazut de rugaciune";
  if (score < 50) return "Nivel mediu de rugaciune";
  if (score < 90) return "Nivel ridicat de rugaciune";
  if (score < 100) return "Nivel foarte ridicat de rugaciune";
  return "Toti s-au rugat de fiecare data";
};

// Numara roomurile care ocupa slot (ACTIVE + FINISHED nefinalizate de user)
prayRoomSchema.statics.countActiveRooms = async function (userId) {
  return this.countDocuments({
    members: {
      $elemMatch: {
        userId,
        hasAccepted: true,
        hasFinalized: false,
      },
    },
  });
};

// Verifica daca user-ul poate crea/join un room
prayRoomSchema.statics.canJoinOrCreate = async function (userId) {
  const count = await this.countActiveRooms(userId);
  return count < 3;
};

// Derangement: genereaza atribuiri unde nimeni nu primeste pe el insusi
prayRoomSchema.statics.generateDerangement = function (ids) {
  const n = ids.length;
  if (n < 2) return null;

  const strs = ids.map((id) => id.toString());
  let shuffled;
  let valid = false;

  while (!valid) {
    shuffled = [...strs];
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    valid = shuffled.every((id, idx) => id !== strs[idx]);
  }

  return strs.map((userId, idx) => ({
    userId,
    assignedTo: shuffled[idx],
    assignedAt: new Date(),
  }));
};

module.exports = mongoose.model("PrayRoom", prayRoomSchema);
