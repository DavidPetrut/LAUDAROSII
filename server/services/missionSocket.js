/**
 * Mission WebSocket Service
 * Gestionează comunicarea în timp real pentru sistemul de misiuni
 */

// Map pentru a ține evidența conexiunilor user-ilor
const userSockets = new Map();

/**
 * Configurează socket events pentru misiuni
 * @param {Server} io - Socket.IO server instance
 */
const setupMissionSockets = (io) => {
  io.on("connection", (socket) => {
    // Când un user se conectează și se autentifică
    socket.on("mission:auth", ({ userId }) => {
      if (userId) {
        // Asociază socket-ul cu userId
        socket.userId = userId;
        userSockets.set(userId, socket.id);
        
        // Join la room-ul personal pentru mesaje directe
        socket.join(`user:${userId}`);
        
        console.log(`Mission socket: User ${userId} connected`);
      }
    });

    // Când un user se deconectează
    socket.on("disconnect", () => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
        console.log(`Mission socket: User ${socket.userId} disconnected`);
      }
    });

    // Admin cere lista de useri online (optional, pentru debugging)
    socket.on("mission:getOnlineUsers", (callback) => {
      if (typeof callback === "function") {
        callback(Array.from(userSockets.keys()));
      }
    });
  });
};

/**
 * Emite un event către un user specific
 * @param {Server} io - Socket.IO server instance
 * @param {string} userId - ID-ul userului
 * @param {string} event - Numele eventului
 * @param {object} data - Datele de trimis
 */
const emitToUser = (io, userId, event, data) => {
  io.to(`user:${userId}`).emit(event, data);
};

/**
 * Emite un event către toți userii conectați
 * @param {Server} io - Socket.IO server instance
 * @param {string} event - Numele eventului
 * @param {object} data - Datele de trimis
 */
const emitToAll = (io, event, data) => {
  io.emit(event, data);
};

module.exports = {
  setupMissionSockets,
  emitToUser,
  emitToAll,
  userSockets,
};
