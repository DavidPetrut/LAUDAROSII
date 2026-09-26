import { api } from "../../../../global/functions";

/**
 * Wrappere peste API-ul de template-uri de devotional.
 */
export const templatesApi = {
  list: (q) => api.get(`/devotional-templates${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  get: (id) => api.get(`/devotional-templates/${id}`),
  create: (data) => api.post("/devotional-templates", data),
  remove: (id) => api.delete(`/devotional-templates/${id}`),
};
