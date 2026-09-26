import { api } from "../../../global/functions";

/**
 * Wrappere peste API-ul de control al accesului (doar super-admin pe server).
 * Schimbarea rolului / ban / stergere raman pe rutele existente /users.
 */
export const accessApi = {
  catalog: () => api.get("/access/catalog"),
  roles: () => api.get("/access/roles"),
  setRolePerms: (role, perms) => api.put(`/access/roles/${role}`, { perms }),
  members: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.role) qs.set("role", params.role);
    const q = qs.toString();
    return api.get(`/access/members${q ? `?${q}` : ""}`);
  },
  member: (id) => api.get(`/access/members/${id}`),
  setGrants: (id, grants) => api.put(`/access/members/${id}/grants`, { grants }),
  changeRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  ban: (id, isBanned, reason) => api.patch(`/users/${id}/ban`, { isBanned, reason }),
  remove: (id) => api.delete(`/users/${id}`),
};
