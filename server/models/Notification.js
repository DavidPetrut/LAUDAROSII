const mongoose = require("mongoose");

/**
 * Model pentru notificări în-app
 * Suportă mai multe tipuri de notificări cu criterii personalizate de "seen"
 */
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      "prayer_received", // Cineva s-a rugat pentru rugăciunea ta
      "new_community_prayer", // Rugăciune nouă în comunitate
      "feature_update", // Element nou în UI (tab "Mai multe")
      "prayer_answered", // Rugăciunea ta a fost marcată ca împlinită
      "system", // Notificări de sistem
      "pray_room_invite", // Invitație la o cameră de rugăciune
      "pray_room_joined", // Cineva s-a alăturat camerei tale
      "pray_room_reminder", // Reminder zilnic pentru rugăciune
      "pray_room_finished", // Camera de rugăciune s-a terminat
      "pray_room_request", // Cineva vrea sa intre cu cod (spre creator)
      "pray_room_rejected", // Creatorul ti-a refuzat intrarea
      "pray_room_started", // Tragerea la sort a inceput
      "role_changed", // Rolul tău a fost schimbat de un super-admin
    ],
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: ["personal", "church", "more", "system"],
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  body: {
    type: String,
    maxlength: 500,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  seen: {
    type: Boolean,
    default: false,
    index: true,
  },
  seenAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 zile
    index: true,
  },
});

// Index compus pentru query-uri frecvente
notificationSchema.index({ userId: 1, category: 1, seen: 1 });
notificationSchema.index({ userId: 1, seen: 1, createdAt: -1 });

// TTL index pentru expirare automată
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Metodă statică pentru a număra notificările nevăzute pe categorii
notificationSchema.statics.getUnseenCounts = async function (userId) {
  const counts = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), seen: false } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);

  return counts.reduce(
    (acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    },
    { personal: 0, church: 0, more: 0, system: 0 }
  );
};

// Metodă statică pentru a marca notificările ca văzute
notificationSchema.statics.markAsSeen = async function (userId, category) {
  return this.updateMany(
    { userId, category, seen: false },
    { $set: { seen: true, seenAt: new Date() } }
  );
};

// Metodă statică pentru a crea notificare "prayer_received"
notificationSchema.statics.createPrayerReceived = async function (
  ownerId,
  prayerId,
  prayerByUser
) {
  return this.create({
    userId: ownerId,
    type: "prayer_received",
    category: "personal",
    title: "Cineva s-a rugat pentru tine",
    body: `${
      prayerByUser.personalData?.fullName || "Cineva"
    } s-a rugat pentru motivul tău`,
    data: { prayerId, prayedByUserId: prayerByUser._id },
  });
};

// Metodă statică pentru notificări de rugăciuni noi în comunitate
notificationSchema.statics.createNewCommunityPrayer = async function (
  excludeUserId,
  prayerId,
  prayerOwner
) {
  const User = mongoose.model("User");
  const users = await User.find(
    { _id: { $ne: excludeUserId }, "status.isActive": true },
    { _id: 1 }
  ).limit(1000);

  const notifications = users.map((u) => ({
    userId: u._id,
    type: "new_community_prayer",
    category: "church",
    title: "Rugăciune nouă în comunitate",
    body: `${
      prayerOwner.personalData?.fullName || "Cineva"
    } a adăugat un motiv de rugăciune`,
    data: { prayerId, ownerId: prayerOwner._id },
  }));

  if (notifications.length > 0) {
    return this.insertMany(notifications, { ordered: false });
  }
  return [];
};

module.exports = mongoose.model("Notification", notificationSchema);
