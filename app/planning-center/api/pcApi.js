/**
 * Client API Planning Center. Refolosește clientul global al app-ului (Bearer token auto),
 * doar prefixează namespace-ul versionat `/pc/v1` (§11.1). Un singur loc de acces la backend-ul PC.
 */
import { api } from "../../global/functions";

const B = "/pc/v1";
const qs = (params = {}) => {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return pairs.length ? `?${pairs.join("&")}` : "";
};

export const pcApi = {
  // viewer curent + permisiuni + echipele lui
  me: () => api.get(`${B}/people/me`),

  people: {
    list: (params = {}) => api.get(`${B}/people${qs(params)}`),
    filters: () => api.get(`${B}/people/meta/filters`),
    get: (id) => api.get(`${B}/people/${id}`),
    teams: (id) => api.get(`${B}/people/${id}/teams`),
    schedule: (id) => api.get(`${B}/people/${id}/schedule`),
    blockouts: (id) => api.get(`${B}/people/${id}/blockouts`),
    messages: (id) => api.get(`${B}/people/${id}/messages`),
    create: (data) => api.post(`${B}/people`, data),
    updateContact: (id, data) => api.patch(`${B}/people/${id}/contact`, data),
  },

  admin: {
    status: () => api.get(`${B}/admin/status`),
    seed: () => api.post(`${B}/admin/seed`, {}),
  },
};

export default pcApi;
