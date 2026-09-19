import { api } from "../../../global/functions";

const BASE = "/admin/broadcasts";

/**
 * Wrappere peste API-ul de broadcast (doar super-admin): statusuri, audienta,
 * mesaje salvate si notificarile propriu-zise (imediate sau programate).
 */
export const broadcastApi = {
  listTags: () => api.get(`${BASE}/tags`),
  createTag: (name) => api.post(`${BASE}/tags`, { name }),
  deleteTag: (id) => api.delete(`${BASE}/tags/${id}`),

  searchUsers: (q) => api.get(`${BASE}/users?q=${encodeURIComponent(q || "")}`),
  setUserTags: (id, tags) => api.patch(`${BASE}/users/${id}/tags`, { tags }),

  audience: (tags, roles) =>
    api.get(`${BASE}/audience?tags=${encodeURIComponent(tags.join(","))}&roles=${encodeURIComponent(roles.join(","))}`),

  listTemplates: () => api.get(`${BASE}/templates`),
  createTemplate: (title, message) => api.post(`${BASE}/templates`, { title, message }),
  deleteTemplate: (id) => api.delete(`${BASE}/templates/${id}`),

  list: () => api.get(BASE),
  create: (payload) => api.post(BASE, payload),
  cancel: (id) => api.delete(`${BASE}/${id}`),
};
