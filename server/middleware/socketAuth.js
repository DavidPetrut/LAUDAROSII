const jwt = require("jsonwebtoken");
const { User } = require("../models");

/**
 * Autentificare pentru conexiunile WebSocket (socket.io), aplicata ca middleware
 * de namespace (io.use / namespace.use).
 *
 * IMPORTANT — rollout fara sa spargi testerii:
 *  - MOD IMPLICIT (soft): daca tokenul lipseste/e invalid, conexiunea E PERMISA
 *    dar fara identitate (socket.data.user = null) si se logheaza. Clientii vechi
 *    (fara token) continua sa mearga. Clientii noi trimit tokenul si capata identitate.
 *  - MOD STRICT: cand SOCKET_AUTH_STRICT="true", conexiunile fara token valid sunt
 *    REFUZATE. Se activeaza dupa ce toti testerii sunt pe build-ul nou (OTA cu token).
 */
const STRICT = process.env.SOCKET_AUTH_STRICT === "true";

const socketAuth = async (socket, next) => {
  const reject = (msg) => (STRICT ? next(new Error(msg)) : allowAnon(socket, next, msg));

  try {
    const token =
      socket.handshake?.auth?.token ||
      socket.handshake?.headers?.authorization?.replace("Bearer ", "");

    if (!token) return reject("Neautentificat");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "role status.isBanned tokenVersion deletedAt"
    );

    if (!user || user.deletedAt) return reject("Cont inexistent");
    if (user.status?.isBanned) return next(new Error("Cont blocat")); // banul se aplica mereu
    if (typeof decoded.tv === "number" && decoded.tv !== user.tokenVersion) {
      return reject("Sesiune revocata");
    }

    socket.data.user = { id: user._id.toString(), role: user.role };
    next();
  } catch (err) {
    reject("Token invalid");
  }
};

// mod soft: lasa conexiunea sa treaca fara identitate, dar logheaza motivul
function allowAnon(socket, next, reason) {
  socket.data.user = null;
  console.warn(`[socketAuth soft] conexiune fara identitate (${reason}) - ${socket.id}`);
  next();
}

module.exports = { socketAuth };
