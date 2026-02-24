import { io } from "socket.io-client";
import { CONFIG } from "../config";

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) return socket;

  socket = io(CONFIG.SOCKET_URL, {
    transports: ["websocket"],
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("Socket conectat");
  });

  socket.on("disconnect", () => {
    console.log("Socket deconectat");
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) return connectSocket();
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const createRoom = (gameKey, userId, userName) => {
  const s = getSocket();
  s.emit("createRoom", { gameKey, userId, userName });
};

export const joinRoom = (roomId, userId, userName) => {
  const s = getSocket();
  s.emit("joinRoom", { roomId, userId, userName });
};

export const startGame = (roomId) => {
  const s = getSocket();
  s.emit("startGame", { roomId });
};

export const submitAnswer = (roomId, userId, answerIndex, timeLeft) => {
  const s = getSocket();
  s.emit("submitAnswer", { roomId, userId, answerIndex, timeLeft });
};

export const leaveRoom = () => {
  const s = getSocket();
  s.emit("leaveRoom");
};
