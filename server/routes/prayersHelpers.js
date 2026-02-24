const crypto = require("crypto");

const generateShareCode = () => crypto.randomBytes(6).toString("hex");

/**
 * Calculeaza perioada saptamânala pentru rugaciuni în funcție de tipul programului
 * SIM Duminica: Luni 00:01 → Luni viitor 00:01 (7 zile, centrat pe duminica)
 * Kingdom Youth: Sâmbata 00:01 → Sâmbata viitor 00:01 (7 zile, centrat pe vineri)
 */
const getWeekBounds = (programType = "sim", date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();

  let weekStart, weekEnd;

  if (programType === "tineret") {
    const diffToSaturday = day === 6 ? 0 : day === 0 ? -1 : -(day + 1);
    weekStart = new Date(d);
    weekStart.setDate(d.getDate() + diffToSaturday);
    weekStart.setHours(0, 1, 0, 0);

    weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setHours(0, 0, 59, 999);
  } else {
    const diffToMonday = day === 0 ? -6 : 1 - day;
    weekStart = new Date(d);
    weekStart.setDate(d.getDate() + diffToMonday);
    weekStart.setHours(0, 1, 0, 0);

    weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setHours(0, 0, 59, 999);
  }

  return { weekStart, weekEnd };
};

const formatPrayersWithUsers = (list) => {
  const usersMap = new Map();
  const predicatorId = list.predicatorId?._id?.toString();

  list.prayers.forEach((p) => {
    const oderId = p.userId?._id?.toString();
    if (!oderId) return;

    if (!usersMap.has(oderId)) {
      usersMap.set(oderId, {
        _id: oderId,
        personalData: p.userId.personalData,
        prayers: [],
        isPredicator: oderId === predicatorId,
      });
    }

    const reactionCounts = { thumbsup: 0, heart: 0, pray: 0, laugh: 0 };
    const reactors = [];
    (p.reactions || []).forEach((r) => {
      if (reactionCounts[r.type] !== undefined) reactionCounts[r.type]++;
      if (r.oderId) {
        reactors.push({
          oderId: r.oderId.toString(),
          type: r.type,
        });
      }
    });

    usersMap.get(oderId).prayers.push({
      _id: p._id,
      text: p.text,
      isUrgent: p.isUrgent,
      mood: p.mood,
      createdAt: p.createdAt,
      reactions: reactionCounts,
      totalReactions: Object.values(reactionCounts).reduce((a, b) => a + b, 0),
      reactors,
    });
  });

  const users = Array.from(usersMap.values());
  users.forEach((u) => {
    u.prayers.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  });
  users.sort((a, b) => (a.isPredicator ? -1 : b.isPredicator ? 1 : 0));

  return users;
};

const formatAllPrayers = (users) => {
  const prayers = [];
  users.forEach((user) => {
    user.content.prayers.forEach((prayer) => {
      prayers.push({
        _id: prayer._id,
        text: prayer.text,
        date: prayer.date,
        answered: prayer.answered,
        isUrgent: prayer.isUrgent || false,
        mood: prayer.mood || null,
        prayedBy: prayer.prayedBy || [],
        userId: { _id: user._id, personalData: user.personalData },
      });
    });
  });
  prayers.sort((a, b) => {
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    return new Date(b.date) - new Date(a.date);
  });
  return prayers;
};

module.exports = {
  generateShareCode,
  getWeekBounds,
  formatPrayersWithUsers,
  formatAllPrayers,
};
