import { api } from "../../../../global/functions";

/**
 * Wrappere peste API-ul de devotionale (CRUD, default, complete, share).
 */
export const devotionalsApi = {
  list: () => api.get("/devotionals"),
  create: (data) => api.post("/devotionals", data),
  update: (id, data) => api.patch(`/devotionals/${id}`, data),
  remove: (id) => api.delete(`/devotionals/${id}`),
  setDefault: (id) => api.post(`/devotionals/${id}/default`, {}),
  complete: (id) => api.post(`/devotionals/${id}/complete`, {}),
  share: (id, toUserId) => api.post(`/devotionals/${id}/share`, { toUserId }),
  incomingShares: () => api.get("/devotionals/shares/incoming"),
  acceptShare: (id) => api.post(`/devotionals/shares/${id}/accept`, {}),
  declineShare: (id) => api.post(`/devotionals/shares/${id}/decline`, {}),
  searchUsers: (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`),
};
