const { PrayRoom } = require("../models");

const prayRoomConnections = new Map();

const setupPrayRoomSockets = (io) => {
  const prayNamespace = io.of("/pray-rooms");

  prayNamespace.on("connection", (socket) => {
    socket.on("join-pray-room", async ({ roomId, userId }) => {
      try {
        // daca socketul are identitate din token, userId trebuie sa fie al lui
        const authedId = socket.data.user?.id;
        if (authedId && userId && authedId !== userId) {
          socket.emit("error", { message: "Identitate invalida" });
          return;
        }

        const room = await PrayRoom.findById(roomId);
        if (!room) {
          socket.emit("error", { message: "Camera nu exista" });
          return;
        }

        const member = room.members.find(
          (m) => m.userId.toString() === userId && m.hasAccepted
        );
        if (!member) {
          socket.emit("error", { message: "Nu ai acces la aceasta camera" });
          return;
        }

        socket.join(roomId);
        socket.roomId = roomId;
        socket.odId = userId;

        if (!prayRoomConnections.has(roomId)) {
          prayRoomConnections.set(roomId, new Set());
        }
        prayRoomConnections.get(roomId).add(userId);

        const dailyScore = await PrayRoom.calculateDailyScore(roomId, new Date());
        const activeMembers = room.members.filter((m) => m.hasAccepted).length;

        socket.emit("room-state", {
          roomId,
          dailyScore,
          activeMembers,
          connectedUsers: prayRoomConnections.get(roomId).size,
        });

        prayNamespace.to(roomId).emit("user-connected", {
          userId,
          connectedUsers: prayRoomConnections.get(roomId).size,
        });
      } catch (error) {
        socket.emit("error", { message: "Eroare la conectare" });
      }
    });

    socket.on("leave-pray-room", ({ roomId, userId }) => {
      handleLeaveRoom(socket, prayNamespace, roomId, userId);
    });

    socket.on("prayer-completed", async ({ roomId, userId }) => {
      try {
        const dailyScore = await PrayRoom.calculateDailyScore(roomId, new Date());
        const room = await PrayRoom.findById(roomId);
        const activeMembers = room.members.filter((m) => m.hasAccepted).length;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayProgress = room.dailyProgress.find((dp) => {
          const dpDate = new Date(dp.date);
          dpDate.setHours(0, 0, 0, 0);
          return dpDate.getTime() === today.getTime();
        });
        const completedToday = todayProgress ? todayProgress.completions.length : 0;

        prayNamespace.to(roomId).emit("progress-updated", {
          roomId,
          dailyScore,
          activeMembers,
          completedToday,
        });
      } catch (error) {
        socket.emit("error", { message: "Eroare la update progress" });
      }
    });

    socket.on("disconnect", () => {
      if (socket.roomId && socket.odId) {
        handleLeaveRoom(socket, prayNamespace, socket.roomId, socket.odId);
      }
    });
  });
};

const handleLeaveRoom = (socket, prayNamespace, roomId, userId) => {
  socket.leave(roomId);

  if (prayRoomConnections.has(roomId)) {
    prayRoomConnections.get(roomId).delete(userId);

    if (prayRoomConnections.get(roomId).size === 0) {
      prayRoomConnections.delete(roomId);
    } else {
      prayNamespace.to(roomId).emit("user-disconnected", {
        userId,
        connectedUsers: prayRoomConnections.get(roomId).size,
      });
    }
  }
};

const emitRoomFinalized = async (io, roomId, finalScore, verdict) => {
  const prayNamespace = io.of("/pray-rooms");
  prayNamespace.to(roomId).emit("room-finalized", {
    roomId,
    finalScore,
    verdict,
  });
};

const emitMemberJoined = async (io, roomId, member) => {
  const prayNamespace = io.of("/pray-rooms");
  const room = await PrayRoom.findById(roomId);
  const activeMembers = room.members.filter((m) => m.hasAccepted).length;

  prayNamespace.to(roomId).emit("member-joined", {
    roomId,
    member,
    activeMembers,
  });
};

const emitMemberLeft = async (io, roomId, userId) => {
  const prayNamespace = io.of("/pray-rooms");
  const room = await PrayRoom.findById(roomId);
  const activeMembers = room.members.filter((m) => m.hasAccepted).length;

  prayNamespace.to(roomId).emit("member-left", {
    roomId,
    userId,
    activeMembers,
  });
};

module.exports = {
  setupPrayRoomSockets,
  emitRoomFinalized,
  emitMemberJoined,
  emitMemberLeft,
};
