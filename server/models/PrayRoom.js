const mongoose = require("mongoose");

const MOODS = [
  "tulburat",
  "incredere",
  "eliberare",
  "voia_lui",
  "persistent",
  "nelinistit",
  "astept",
];

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
    isUrgent: {
      type: Boolean,
      default: false,
    },
    mood: {
      type: String,
      enum: [...MOODS, null],
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const rouletteAssignmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    revealed: { type: Boolean, default: false },
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
      required: true,
      min: 1,
      max: 3650,
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
      max: 50,
    },
  },
  prayers: [prayerSchema],
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: null,
  },
  joinDeadline: {
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
  rouletteAssignments: [rouletteAssignmentSchema],
  rouletteDay: {
    type: Date,
    default: null,
  },
});

prayRoomSchema.index({ createdBy: 1 });
prayRoomSchema.index({ "members.userId": 1 });
prayRoomSchema.index({ endDate: 1 });
prayRoomSchema.index({ roomType: 1 });

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

// Data de stergere definitiva: miezul noptii de dupa ultima zi (ziua crearii = ziua 1)
prayRoomSchema.statics.computeEndDate = function (durationDays) {
  const days = parseInt(durationDays, 10);
  const safe = !days || days < 1 ? 1 : Math.min(days, 3650);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + safe);
  return end;
};

// Numara camerele in care userul e membru activ
prayRoomSchema.statics.countActiveRooms = async function (userId) {
  return this.countDocuments({
    members: { $elemMatch: { userId, hasAccepted: true } },
  });
};

// Poti fi in maxim 5 camere (create sau in care ai fost adaugat)
prayRoomSchema.statics.canJoinOrCreate = async function (userId) {
  const count = await this.countActiveRooms(userId);
  return count < 5;
};

// Derangement bijectiv: fiecare primeste pe altcineva, nimeni pe el insusi si
// (cand se poate) nimeni aceeasi persoana ca in ziua precedenta.
prayRoomSchema.statics.generateDerangement = function (ids, prevMap = null) {
  const n = ids.length;
  if (n < 2) return null;

  const strs = ids.map((id) => id.toString());
  const avoidPrev = prevMap && n > 2;
  let shuffled = [...strs];

  for (let attempt = 0; attempt < 300; attempt++) {
    shuffled = [...strs];
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const noFixedPoint = shuffled.every((id, idx) => id !== strs[idx]);
    if (!noFixedPoint) continue;
    if (avoidPrev) {
      const repeatsPrev = strs.some((uid, idx) => prevMap[uid] && prevMap[uid] === shuffled[idx]);
      if (repeatsPrev) continue;
    }
    return strs.map((userId, idx) => ({ userId, assignedTo: shuffled[idx], revealed: false }));
  }

  return strs.map((userId, idx) => ({ userId, assignedTo: shuffled[idx], revealed: false }));
};

// Asigura o tragere la sort valida pentru ziua curenta. La o noua zi (00:00) sau la
// creare regenereaza legaturile si reseteaza "revealed". Intoarce true daca a schimbat
// ceva (deci trebuie salvat). Necesita minim 3 participanti activi.
prayRoomSchema.methods.ensureRouletteForToday = function () {
  if (this.roomType !== "roulette") return false;

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const lastDay = this.rouletteDay ? new Date(this.rouletteDay) : null;
  if (lastDay) lastDay.setHours(0, 0, 0, 0);
  const isNewDay = !lastDay || lastDay.getTime() !== todayMidnight.getTime();
  if (!isNewDay) return false;

  const participantIds = this.members
    .filter((m) => m.hasAccepted)
    .map((m) => m.userId.toString());

  if (participantIds.length < 3) {
    if (this.rouletteAssignments.length > 0) {
      this.rouletteAssignments = [];
      return true;
    }
    return false;
  }

  const prevMap = {};
  (this.rouletteAssignments || []).forEach((a) => {
    prevMap[a.userId.toString()] = a.assignedTo ? a.assignedTo.toString() : null;
  });

  const assignments = this.constructor.generateDerangement(participantIds, prevMap);
  this.rouletteAssignments = assignments || [];
  this.rouletteDay = todayMidnight;
  return true;
};

module.exports = mongoose.model("PrayRoom", prayRoomSchema);
