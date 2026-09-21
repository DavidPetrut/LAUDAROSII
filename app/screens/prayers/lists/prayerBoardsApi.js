import { api } from "../../../global/functions";

/**
 * Wrappere peste API-ul listelor private de rugaciuni (CRUD lista + motive).
 * Lista publica NU trece pe aici: ea foloseste /prayers/personal.
 */
export const prayerBoardsApi = {
  list: () => api.get("/prayer-boards"),
  create: (data) => api.post("/prayer-boards", data),
  update: (id, data) => api.patch(`/prayer-boards/${id}`, data),
  remove: (id) => api.delete(`/prayer-boards/${id}`),
  renew: (id, durationDays) => api.post(`/prayer-boards/${id}/renew`, { durationDays }),
  addPrayer: (id, data) => api.post(`/prayer-boards/${id}/prayers`, data),
  updatePrayer: (id, prayerId, data) =>
    api.patch(`/prayer-boards/${id}/prayers/${prayerId}`, data),
  removePrayer: (id, prayerId) =>
    api.delete(`/prayer-boards/${id}/prayers/${prayerId}`),
};
