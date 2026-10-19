/**
 * Client API — un singur loc prin care web-ul vorbește cu backend-ul.
 * Toate căile sunt relative (`/api/...`); Next face proxy spre backend (vezi next.config.mjs).
 * Atașează automat Bearer tokenul. Pe 401 curăță sesiunea și trimite la /login.
 *
 * ANTI-HARDCODING: nicio bază de date / endpoint hardcodat altundeva. Tot traficul trece de aici.
 */
import { getToken, clearSession } from "@/lib/auth/auth";

const PC_BASE = "/api/pc/v1";

async function request(path, { method = "GET", body, headers, raw } = {}) {
  const token = getToken();
  const res = await fetch(path.startsWith("/api") ? path : `${PC_BASE}${path}`, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
      location.href = "/login";
    }
    throw new Error("Sesiune expirată.");
  }

  if (raw) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Eroare ${res.status}`);
  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  patch: (path, body, opts) => request(path, { ...opts, method: "PATCH", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  del: (path, opts) => request(path, { ...opts, method: "DELETE" }),
  raw: request,
};

/* ─── Felii tipate pe API-ul real (server/planning-center/routes/songs.js) ─── */
export const songsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== "")).toString();
    return api.get(`/songs${qs ? `?${qs}` : ""}`);
  },
  create: (payload) => api.post("/songs", payload),
  patchSong: (id, payload) => api.patch(`/songs/${id}`, payload),
  get: (id) => api.get(`/songs/${id}`),
  arrangement: (id, aid) => api.get(`/songs/${id}/arrangements/${aid}`),
  addArrangement: (id, payload) => api.post(`/songs/${id}/arrangements`, payload),
  updateArrangement: (id, aid, payload) => api.patch(`/songs/${id}/arrangements/${aid}`, payload),
  deleteArrangement: (id, aid) => api.del(`/songs/${id}/arrangements/${aid}`),
  reorderArrangements: (id, order) => api.post(`/songs/${id}/arrangements/reorder`, { order }),
  addKey: (id, aid, payload) => api.post(`/songs/${id}/arrangements/${aid}/keys`, payload),
  updateKey: (id, aid, kid, payload) => api.patch(`/songs/${id}/arrangements/${aid}/keys/${kid}`, payload),
  deleteKey: (id, aid, kid) => api.del(`/songs/${id}/arrangements/${aid}/keys/${kid}`),
  addFile: (id, aid, payload) => api.post(`/songs/${id}/arrangements/${aid}/files`, payload),
  deleteFile: (id, aid, fid) => api.del(`/songs/${id}/arrangements/${aid}/files/${fid}`),
  patchFile: (id, aid, fid, payload) => api.patch(`/songs/${id}/arrangements/${aid}/files/${fid}`, payload),
  uploadBlob: async (blob, filename, rt) => { const fd = new FormData(); fd.append("file", blob, filename); fd.append("name", filename); return api.post(`/uploads${rt ? `?rt=${rt}` : ""}`, fd); },
  tags: (domain = "song") => api.get(`/songs/meta/tags?domain=${domain}`),
  transposeAudio: (id, aid, payload) => api.post(`/songs/${id}/arrangements/${aid}/transpose-audio`, payload),
  transposeAudioStatus: (id, aid, jobId) => api.get(`/songs/${id}/arrangements/${aid}/transpose-audio/${jobId}`),
};
