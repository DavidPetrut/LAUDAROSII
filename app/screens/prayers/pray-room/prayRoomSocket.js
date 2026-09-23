import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { CONFIG } from "../../../global/config";
import { socketAuthOption } from "../../../global/services/socketAuth";

export const usePrayRoomSocket = (roomId, userId) => {
  const [socketProgress, setSocketProgress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
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

    socket.on("room-state", (data) => {
      setSocketProgress({
        dailyScore: data.dailyScore,
        activeMembers: data.activeMembers,
      });
    });

    socket.on("progress-updated", (data) => {
      if (data.roomId === roomId) {
        setSocketProgress({
          dailyScore: data.dailyScore,
          activeMembers: data.activeMembers,
        });
      }
    });

    socket.on("room-finalized", (data) => {
      if (data.roomId === roomId) {
        setSocketProgress((prev) => ({
          ...prev,
          finalScore: data.finalScore,
          verdict: data.verdict,
          isFinished: true,
        }));
      }
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

  const emitPrayerCompleted = useCallback(
    (prayerId) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("prayer-completed", { roomId, userId, prayerId });
      }
    },
    [roomId, userId, isConnected]
  );

  return { socketProgress, isConnected, emitPrayerCompleted };
};
