import { api } from "../functions";

/**
 * Wrappere peste API-ul de tutoriale (config autor + CRUD).
 */
export const tutorialApi = {
  config: () => api.get("/tutorials/config"),
  setConfig: (authoringEnabled) => api.put("/tutorials/config", { authoringEnabled }),
  list: (all) => api.get(`/tutorials${all ? "?all=1" : ""}`),
  get: (id) => api.get(`/tutorials/${id}`),
  create: (data) => api.post("/tutorials", data),
  update: (id, data) => api.patch(`/tutorials/${id}`, data),
  remove: (id) => api.delete(`/tutorials/${id}`),
};
