import { api } from "../../../../global/functions/api";

/**
 * API pentru sistemul de misiuni
 */
export const MissionsApi = {
  /**
   * Obține toate misiunile active
   */
  getAll: async () => {
    return await api.get("/missions");
  },

  /**
   * Verifică dacă user-ul curent e admin de misiuni
   */
  checkAdmin: async () => {
    return await api.get("/missions/check-admin");
  },

  /**
   * Crează o misiune nouă (doar admin)
   */
  create: async (missionData) => {
    return await api.post("/missions", missionData);
  },

  /**
   * Închide o misiune (doar admin creator)
   */
  close: async (missionId) => {
    return await api.delete(`/missions/${missionId}`);
  },

  /**
   * Obține misiunile create de admin-ul curent
   */
  getMyMissions: async () => {
    return await api.get("/missions/admin/my");
  },

  /**
   * Obține lista jucătorilor pentru o misiune
   */
  getPlayers: async (missionId) => {
    return await api.get(`/missions/${missionId}/players`);
  },

  /**
   * Obține cererile de aprobare pentru o misiune
   */
  getRequests: async (missionId) => {
    return await api.get(`/missions/${missionId}/requests`);
  },

  /**
   * User cere răsplata pentru o misiune
   */
  requestReward: async (missionId) => {
    return await api.post(`/missions/${missionId}/request`);
  },

  /**
   * Admin aprobă un user pentru misiune
   */
  approveUser: async (missionId, userId) => {
    return await api.post(`/missions/${missionId}/approve/${userId}`);
  },

  /**
   * Admin refuză un user pentru misiune
   */
  rejectUser: async (missionId, userId) => {
    return await api.post(`/missions/${missionId}/reject/${userId}`);
  },

  /**
   * User revendică premiul pentru o misiune aprobată
   */
  claimReward: async (missionId) => {
    return await api.post(`/missions/${missionId}/claim`);
  },
};
