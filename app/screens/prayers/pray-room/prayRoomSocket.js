import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { CONFIG } from "../../../global/config";
import { socketAuthOption } from "../../../global/services/socketAuth";

export const usePrayRoomSocket = (roomId, userId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [roomUpdatedAt, setRoomUpdatedAt] = useState(0);
  const socketRef = useRef(null);

  const connect = useCallback(() => {
    if (!roomId || !userId) return;

    const socket = io(`${CONFIG.API_URL.replace("/api", "")}/pray-rooms`, {
      transports: ["websocket"],
      autoConnect: true,
      ...socketAuthOption,
    });

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join-pray-room", { roomId, userId });
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("room-updated", (data) => {
      if (data.roomId === roomId) setRoomUpdatedAt(Date.now());
    });

    socketRef.current = socket;
  }, [roomId, userId]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave-pray-room", { roomId, userId });
        socketRef.current.disconnect();
      }
    };
  }, [connect, roomId, userId]);

  const emitPrayerChanged = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("prayer-changed", { roomId });
    }
  }, [roomId, isConnected]);

  return { isConnected, roomUpdatedAt, emitPrayerChanged };
};
