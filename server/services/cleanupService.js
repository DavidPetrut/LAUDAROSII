const { User, Announcement, Game, Course, Song, PrayRoom } = require("../models");

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
  cleanupPrayRoomUserData,
};
