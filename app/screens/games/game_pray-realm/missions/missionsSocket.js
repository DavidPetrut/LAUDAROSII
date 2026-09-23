import { io } from "socket.io-client";
import { CONFIG } from "../../../../global/config";
import { socketAuthOption } from "../../../../global/services/socketAuth";

let socket = null;
let isConnected = false;
let userId = null;

// Callback-uri pentru evenimente
const eventCallbacks = {
  "mission:new": [],
  "mission:closed": [],
  "mission:approved": [],
  "mission:rejected": [],
};

/**
 * Inițializează conexiunea WebSocket pentru misiuni
 * @param {string} currentUserId - ID-ul userului curent
 */
export const initMissionSocket = (currentUserId) => {
  if (socket && isConnected) {
    // Dacă e deja conectat cu același user, nu reconecta
    if (userId === currentUserId) return;
    // Dacă e alt user, deconectează și reconectează
    disconnectMissionSocket();
  }

  userId = currentUserId;

  socket = io(CONFIG.SOCKET_URL, {
    transports: ["websocket"],
    autoConnect: true,
    ...socketAuthOption,
  });

  socket.on("connect", () => {
    isConnected = true;
    console.log("Mission socket connected");

    // Autentifică user-ul
    if (userId) {
      socket.emit("mission:auth", { userId });
    }
  });

  socket.on("disconnect", () => {
    isConnected = false;
    console.log("Mission socket disconnected");
  });

  socket.on("connect_error", (error) => {
    console.error("Mission socket connection error:", error);
  });

  // Setup event listeners
  setupEventListeners();
};

/**
 * Configurează listenerii pentru evenimente de misiuni
 */
const setupEventListeners = () => {
  if (!socket) return;

  // Misiune nouă creată
  socket.on("mission:new", (mission) => {
    console.log("New mission received:", mission);
    eventCallbacks["mission:new"].forEach((cb) => cb(mission));
  });

  // Misiune închisă
  socket.on("mission:closed", (data) => {
    console.log("Mission closed:", data);
    eventCallbacks["mission:closed"].forEach((cb) => cb(data));
  });

  // User aprobat pentru misiune
  socket.on("mission:approved", (data) => {
    console.log("Mission approved:", data);
    // Verifică dacă e pentru user-ul curent
    if (data.userId === userId) {
      eventCallbacks["mission:approved"].forEach((cb) => cb(data));
    }
  });

  // User refuzat pentru misiune
  socket.on("mission:rejected", (data) => {
    console.log("Mission rejected:", data);
    // Verifică dacă e pentru user-ul curent
    if (data.userId === userId) {
      eventCallbacks["mission:rejected"].forEach((cb) => cb(data));
    }
  });
};

/**
 * Deconectează socket-ul
 */
export const disconnectMissionSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
    userId = null;
  }
};

/**
 * Înregistrează un callback pentru un event
 * @param {string} event - Numele eventului
 * @param {function} callback - Funcția de apelat
 * @returns {function} - Funcție pentru dezabonare
 */
export const onMissionEvent = (event, callback) => {
  if (eventCallbacks[event]) {
    eventCallbacks[event].push(callback);

    // Returnează funcție pentru dezabonare
    return () => {
      const index = eventCallbacks[event].indexOf(callback);
      if (index > -1) {
        eventCallbacks[event].splice(index, 1);
      }
    };
  }
  return () => {};
};

/**
 * Verifică dacă socket-ul e conectat
 */
export const isMissionSocketConnected = () => isConnected;

/**
 * Obține instanța socket-ului (pentru debugging)
 */
export const getMissionSocket = () => socket;
