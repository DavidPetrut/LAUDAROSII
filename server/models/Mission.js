const mongoose = require("mongoose");

/**
 * Schema pentru statusul unui user în cadrul unei misiuni
 */
const userMissionStatusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "requested", "approved", "rejected", "claimed"],
      default: "pending",
    },
    requestedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

/**
 * Schema pentru Misiuni create de admini
 */
const missionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 18,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 180,
    trim: true,
  },
  reward: {
    type: Number,
    required: true,
    enum: [80, 100, 150],
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["active", "closed", "expired"],
    default: "active",
  },
  // Tracking pentru fiecare user
  userStatuses: {
    type: [userMissionStatusSchema],
    default: [],
  },
});

// Indexuri pentru performanță
missionSchema.index({ status: 1, expiresAt: 1 });
missionSchema.index({ createdBy: 1 });
missionSchema.index({ "userStatuses.userId": 1 });

/**
 * Obține statusul unui user specific pentru această misiune
 */
missionSchema.methods.getUserStatus = function (userId) {
  const userStatus = this.userStatuses.find(
    (us) => us.userId.toString() === userId.toString()
  );
  return userStatus || { status: "pending" };
};

/**
 * Actualizează statusul unui user
 */
missionSchema.methods.updateUserStatus = function (userId, newStatus) {
  let userStatus = this.userStatuses.find(
    (us) => us.userId.toString() === userId.toString()
  );

  if (!userStatus) {
    userStatus = { userId, status: "pending" };
    this.userStatuses.push(userStatus);
    userStatus = this.userStatuses[this.userStatuses.length - 1];
  }

  userStatus.status = newStatus;

  // Set timestamps based on status
  const now = new Date();
  switch (newStatus) {
    case "requested":
      userStatus.requestedAt = now;
      break;
    case "approved":
      userStatus.approvedAt = now;
      break;
    case "rejected":
      userStatus.rejectedAt = now;
      break;
    case "claimed":
      userStatus.claimedAt = now;
      break;
  }

  return userStatus;
};

/**
 * Verifică dacă misiunea a expirat
 */
missionSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

/**
 * Returnează misiunea formatată pentru client
 */
missionSchema.methods.toClientFormat = function (userId = null) {
  const obj = {
    id: this._id,
    title: this.title,
    description: this.description,
    reward: this.reward,
    expiresAt: this.expiresAt,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    status: this.status,
  };

  if (userId) {
    obj.userStatus = this.getUserStatus(userId);
  }

  return obj;
};

module.exports = mongoose.model("Mission", missionSchema);
