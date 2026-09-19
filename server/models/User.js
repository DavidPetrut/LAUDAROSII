const mongoose = require("mongoose");

const prayerSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    answered: {
      type: Boolean,
      default: false,
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
    prayedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { _id: true }
);

const courseProgressSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const gameStatsSchema = new mongoose.Schema(
  {
    highScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPlayed: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 100,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "admin", "superadmin", "developer"],
    default: "user",
  },
  teamRoles: [
    {
      type: String,
      enum: [
        "vocalist",
        "lider_inchinare",
        "chitara_electrica",
        "chitara_acustica",
        "bass",
        "tobe",
        "pian",
        "clape",
        "vioara",
        "sunet",
        "proiector",
        "director_muzical",
        "lider_asistent",
        "predicator",
      ],
    },
  ],
  personalData: {
    fullName: {
      type: String,
      default: "",
      maxlength: 100,
    },
    age: {
      type: Number,
      min: 0,
      max: 120,
    },
    phone: {
      type: String,
      default: "",
      maxlength: 20,
    },
    birthDate: {
      type: Date,
      default: null,
    },
    profilePicture: {
      type: String,
      default: null,
    },
  },
  status: {
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActiveDate: {
      type: Date,
      default: Date.now,
    },
  },
  content: {
    prayers: {
      type: [prayerSchema],
      default: [],
    },
    coursesProgress: {
      type: [courseProgressSchema],
      default: [],
    },
    bible: {
      favoritePsalm: {
        type: String,
        default: "",
        maxlength: 100,
      },
      favoriteVerse: {
        type: String,
        default: "",
        maxlength: 100,
      },
    },
  },
  games: {
    type: Map,
    of: gameStatsSchema,
    default: new Map(),
  },
  deviceTokens: {
    type: [String],
    default: [],
  },
  // statusuri/etichete atribuite de super-admin pentru targetarea notificarilor
  tags: {
    type: [String],
    default: [],
    index: true,
  },
  hiddenPersonalPrayers: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ "status.isActive": 1 });
userSchema.index({ "personalData.birthDate": 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ teamRoles: 1 });
userSchema.index({ "content.coursesProgress.courseId": 1 });

userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    email: this.email,
    personalData: {
      fullName: this.personalData.fullName,
    },
    teamRoles: this.teamRoles,
    role: this.role,
  };
};

module.exports = mongoose.model("User", userSchema);
