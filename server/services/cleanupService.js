const { User, Announcement, Game, Course, Song, PrayRoom, Notification } = require("../models");

const cleanupUserData = async (userId) => {
  await Promise.all([
    Announcement.updateMany({}, { $pull: { readBy: userId } }),

    Game.updateMany({}, { $pull: { highScores: { userId: userId } } }),

    Announcement.updateMany({ authorId: userId }, { $set: { authorId: null } }),

    Course.updateMany({ postedBy: userId }, { $set: { postedBy: null } }),

    Song.updateMany({ addedBy: userId }, { $set: { addedBy: null } }),
  ]);
};

const cleanupCourseData = async (courseId) => {
  await User.updateMany(
    {},
    { $pull: { "content.coursesProgress": { courseId: courseId } } }
  );
};

const cleanupGameData = async (gameKey) => {
  await User.updateMany({}, { $unset: { [`games.${gameKey}`]: "" } });
};

const validateReferences = async () => {
  const users = await User.find({}, { _id: 1 });
  const userIds = users.map((u) => u._id.toString());

  await Game.updateMany(
    {},
    { $pull: { highScores: { userId: { $nin: userIds } } } }
  );

  await Announcement.updateMany({}, { $pull: { readBy: { $nin: userIds } } });

  const courses = await Course.find({}, { _id: 1 });
  const courseIds = courses.map((c) => c._id.toString());

  await User.updateMany(
    {},
    {
      $pull: {
        "content.coursesProgress": {
          courseId: { $nin: courseIds },
        },
      },
    }
  );

  return { validatedUsers: userIds.length, validatedCourses: courseIds.length };
};

// Finalizeaza roomurile expirate si trimite notificari
const finalizePrayRooms = async () => {
  const now = new Date();
  const expiredRooms = await PrayRoom.find({
    state: { $in: ["PENDING", "ACTIVE"] },
    endDate: { $lt: now },
  });

  for (const room of expiredRooms) {
    const finalScore = await PrayRoom.calculateFinalScore(room._id);
    const verdict = PrayRoom.getVerdict(finalScore);

    room.state = "FINISHED";
    room.finalScore = finalScore;
    room.finishedAt = now;
    await room.save();

    const activeMembers = room.members.filter((m) => m.hasAccepted);
    for (const member of activeMembers) {
      await Notification.create({
        userId: member.userId,
        type: "pray_room_finished",
        category: "more",
        title: "Camera s-a terminat",
        body: `${room.name}: ${verdict}`,
        data: { roomId: room._id, finalScore, verdict },
      });
    }
  }

  return expiredRooms.length;
};

// Sterge roomurile FINISHED unde toti membrii au dat finalize
const cleanupFinishedPrayRooms = async () => {
  const finished = await PrayRoom.find({ state: "FINISHED" });
  let deleted = 0;

  for (const room of finished) {
    const remaining = room.members.filter(
      (m) => m.hasAccepted && !m.hasFinalized
    );
    if (remaining.length === 0) {
      await PrayRoom.findByIdAndDelete(room._id);
      deleted++;
    }
  }

  return deleted;
};

// Curata referintele PrayRoom cand un user e sters
const cleanupPrayRoomUserData = async (userId) => {
  await PrayRoom.updateMany(
    { "members.userId": userId },
    { $pull: { members: { userId: userId } } }
  );
  await PrayRoom.updateMany(
    { "prayers.userId": userId },
    { $pull: { prayers: { userId: userId } } }
  );
};

module.exports = {
  cleanupUserData,
  cleanupCourseData,
  cleanupGameData,
  validateReferences,
  finalizePrayRooms,
  cleanupFinishedPrayRooms,
  cleanupPrayRoomUserData,
};
