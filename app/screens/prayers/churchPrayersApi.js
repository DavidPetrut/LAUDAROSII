import { api } from "../../global/functions";

/**
 * Wrappere peste API-ul listei de rugaciuni a bisericii (globala, unica).
 * Citirea e permisa oricui logat; scrierea cere church_prayers.manage pe server.
 */
export const churchPrayersApi = {
  list: () => api.get("/church-prayers"),
  add: (data) => api.post("/church-prayers", data),
  update: (id, data) => api.patch(`/church-prayers/${id}`, data),
  remove: (id) => api.delete(`/church-prayers/${id}`),
};
