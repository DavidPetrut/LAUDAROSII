const { setupGameSockets } = require("./gameSocket");
const {
  cleanupUserData,
  cleanupCourseData,
  cleanupGameData,
  validateReferences,
  finalizePrayRooms,
  cleanupFinishedPrayRooms,
  cleanupPrayRoomUserData,
} = require("./cleanupService");
const {
  setupMissionSockets,
  emitToUser,
  emitToAll,
} = require("./missionSocket");
const {
  setupPrayRoomSockets,
  emitRoomFinalized,
  emitMemberJoined,
  emitMemberLeft,
} = require("./prayRoomSocket");

module.exports = {
  setupGameSockets,
  cleanupUserData,
  cleanupCourseData,
  cleanupGameData,
  validateReferences,
  finalizePrayRooms,
  cleanupFinishedPrayRooms,
  cleanupPrayRoomUserData,
  setupMissionSockets,
  emitToUser,
  emitToAll,
  setupPrayRoomSockets,
  emitRoomFinalized,
  emitMemberJoined,
  emitMemberLeft,
};
