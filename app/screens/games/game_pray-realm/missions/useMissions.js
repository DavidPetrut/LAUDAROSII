import { useState, useEffect, useCallback } from "react";
import { MissionsApi } from "./missionsApi";
import {
  initMissionSocket,
  onMissionEvent,
  disconnectMissionSocket,
} from "./missionsSocket";
import { showMissionNotification } from "../../../../global/functions/toast";

/**
 * Hook principal pentru gestionarea misiunilor
 * @param {string} userId - ID-ul userului curent
 * @param {object} options - Opțiuni
 * @param {function} options.onNewMission - Callback când apare o misiune nouă (pentru navigare)
 */
export const useMissions = (userId, options = {}) => {
  const [missions, setMissions] = useState([]);
  const [isMissionAdmin, setIsMissionAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Încarcă toate misiunile
   */
  const loadMissions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await MissionsApi.getAll();
      setMissions(data);
      setError(null);
    } catch (err) {
      console.error("Error loading missions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verifică dacă user-ul e admin de misiuni
   */
  const checkAdminStatus = useCallback(async () => {
    try {
      const { isMissionAdmin: isAdmin } = await MissionsApi.checkAdmin();
      setIsMissionAdmin(isAdmin);
    } catch (err) {
      console.error("Error checking admin status:", err);
      setIsMissionAdmin(false);
    }
  }, []);

  /**
   * Cere răsplata pentru o misiune
   */
  const requestReward = useCallback(async (missionId) => {
    try {
      await MissionsApi.requestReward(missionId);
      // Actualizează local
      setMissions((prev) =>
        prev.map((m) =>
          m.id === missionId
            ? { ...m, userStatus: { ...m.userStatus, status: "requested" } }
            : m
        )
      );
      return { success: true };
    } catch (err) {
      console.error("Error requesting reward:", err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Revendică premiul pentru o misiune aprobată
   */
  const claimReward = useCallback(async (missionId) => {
    try {
      const result = await MissionsApi.claimReward(missionId);
      // Elimină misiunea din listă (a fost revendicată)
      setMissions((prev) => prev.filter((m) => m.id !== missionId));
      return { success: true, reward: result.reward };
    } catch (err) {
      console.error("Error claiming reward:", err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Obține o misiune după ID
   */
  const getMissionById = useCallback(
    (missionId) => {
      return missions.find((m) => m.id === missionId);
    },
    [missions]
  );

  // Inițializare
  useEffect(() => {
    if (userId) {
      loadMissions();
      checkAdminStatus();

      // Inițializează socket
      initMissionSocket(userId);

      // Ascultă evenimente socket
      const unsubNew = onMissionEvent("mission:new", (mission) => {
        setMissions((prev) => [mission, ...prev]);
        // Afișează notificare toast pentru misiune nouă
        const adminName = mission.createdBy?.name || "Admin";
        showMissionNotification(adminName, () => {
          options.onNewMission?.(mission);
        });
      });

      const unsubClosed = onMissionEvent("mission:closed", ({ missionId }) => {
        setMissions((prev) => prev.filter((m) => m.id !== missionId));
      });

      const unsubApproved = onMissionEvent("mission:approved", ({ missionId }) => {
        setMissions((prev) =>
          prev.map((m) =>
            m.id === missionId
              ? { ...m, userStatus: { ...m.userStatus, status: "approved" } }
              : m
          )
        );
      });

      const unsubRejected = onMissionEvent("mission:rejected", ({ missionId }) => {
        setMissions((prev) =>
          prev.map((m) =>
            m.id === missionId
              ? { ...m, userStatus: { ...m.userStatus, status: "rejected" } }
              : m
          )
        );
      });

      // Cleanup
      return () => {
        unsubNew();
        unsubClosed();
        unsubApproved();
        unsubRejected();
      };
    }
  }, [userId, loadMissions, checkAdminStatus]);

  // Cleanup la unmount
  useEffect(() => {
    return () => {
      disconnectMissionSocket();
    };
  }, []);

  return {
    missions,
    isMissionAdmin,
    loading,
    error,
    loadMissions,
    requestReward,
    claimReward,
    getMissionById,
  };
};

/**
 * Hook pentru administrarea misiunilor (doar pentru admini)
 * @param {string} userId - ID-ul adminului
 */
export const useMissionAdmin = (userId) => {
  const [myMissions, setMyMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Încarcă misiunile create de admin
   */
  const loadMyMissions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await MissionsApi.getMyMissions();
      setMyMissions(data);
    } catch (err) {
      console.error("Error loading my missions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crează o misiune nouă
   */
  const createMission = useCallback(async (missionData) => {
    try {
      const newMission = await MissionsApi.create(missionData);
      setMyMissions((prev) => [newMission, ...prev]);
      return { success: true, mission: newMission };
    } catch (err) {
      console.error("Error creating mission:", err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Închide o misiune
   */
  const closeMission = useCallback(async (missionId) => {
    try {
      await MissionsApi.close(missionId);
      setMyMissions((prev) => prev.filter((m) => m.id !== missionId));
      return { success: true };
    } catch (err) {
      console.error("Error closing mission:", err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Obține lista jucătorilor pentru o misiune
   */
  const getPlayers = useCallback(async (missionId) => {
    try {
      return await MissionsApi.getPlayers(missionId);
    } catch (err) {
      console.error("Error getting players:", err);
      return [];
    }
  }, []);

  /**
   * Obține cererile de aprobare pentru o misiune
   */
  const getRequests = useCallback(async (missionId) => {
    try {
      return await MissionsApi.getRequests(missionId);
    } catch (err) {
      console.error("Error getting requests:", err);
      return [];
    }
  }, []);

  /**
   * Aprobă un user pentru misiune
   */
  const approveUser = useCallback(async (missionId, targetUserId) => {
    try {
      await MissionsApi.approveUser(missionId, targetUserId);
      return { success: true };
    } catch (err) {
      console.error("Error approving user:", err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Refuză un user pentru misiune
   */
  const rejectUser = useCallback(async (missionId, targetUserId) => {
    try {
      await MissionsApi.rejectUser(missionId, targetUserId);
      return { success: true };
    } catch (err) {
      console.error("Error rejecting user:", err);
      return { success: false, error: err.message };
    }
  }, []);

  // Încarcă misiunile la mount
  useEffect(() => {
    if (userId) {
      loadMyMissions();
    }
  }, [userId, loadMyMissions]);

  return {
    myMissions,
    loading,
    loadMyMissions,
    createMission,
    closeMission,
    getPlayers,
    getRequests,
    approveUser,
    rejectUser,
  };
};
