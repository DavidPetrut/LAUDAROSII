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
  createTagGroup: (data) => api.post("/songs/meta/tag-groups", data),
  createTag: (data) => api.post("/songs/meta/tags", data),
  setSongTags: (id, tagIds) => api.patch(`/songs/${id}/tags`, { tagIds }),
  setArrangementTags: (id, aid, tagIds) => api.patch(`/songs/${id}/arrangements/${aid}/tags`, { tagIds }),
  transposeAudio: (id, aid, payload) => api.post(`/songs/${id}/arrangements/${aid}/transpose-audio`, payload),
  transposeAudioStatus: (id, aid, jobId) => api.get(`/songs/${id}/arrangements/${aid}/transpose-audio/${jobId}`),
  // Import PCO PDF: parse (preview, fără scriere) + commit (creează song + aranjament + ChordPro).
  importPcoParse: (file) => { const fd = new FormData(); fd.append("file", file); return api.post("/songs/import-pco-pdf/parse", fd); },
  importPcoCommit: (payload) => api.post("/songs/import-pco-pdf/commit", payload),
  saveChordChart: (id, aid, payload) => api.put(`/songs/${id}/arrangements/${aid}/chordchart`, payload),
  youtubeTitle: (url) => api.get(`/songs/meta/youtube-title?url=${encodeURIComponent(url)}`),
  fixWordsAuto: (text) => api.post("/songs/meta/fix-words", { text }),
  deleteSong: (id) => api.del(`/songs/${id}`),
  deleteSongInfo: (id) => api.get(`/songs/${id}/delete-info`),
};

/* ─── Plans (tab Plans) — server/planning-center/routes/plans.js ─── */
export const plansApi = {
  // { serviceTypes: [{ id, name, plans: [{ id, title, dateLabel, sortDate }] }] }
  list: () => api.get("/plans"),
  // date = prima dată; opts: { quantity, copyTimesFromPlanId, templatePlanId } (batch N planuri săptămânale)
  create: (serviceTypeId, date, opts = {}) => api.post("/plans", { serviceTypeId, date, ...opts }),
  get: (id) => api.get(`/plans/${id}`),
  teams: (id) => api.get(`/plans/${id}/teams`),
  times: (id) => api.get(`/plans/${id}/times`),
  order: (id) => api.get(`/plans/${id}/order`),
  notes: (id) => api.get(`/plans/${id}/notes`),
  files: (id) => api.get(`/plans/${id}/files`),
  schedulable: (id, q) => api.get(`/plans/${id}/schedulable${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  // bara dreaptă: candidați pt. o poziție (due + conflicte). Nu trimite nimic.
  recommend: (id, { teamId, positionId, q } = {}) => {
    const qs = new URLSearchParams(Object.entries({ teamId, positionId, q }).filter(([, v]) => v)).toString();
    return api.get(`/plans/${id}/recommend${qs ? `?${qs}` : ""}`);
  },
  // asignează o persoană (DOAR DB, status unconfirmed implicit — NU trimite email)
  assign: (id, payload) => api.post(`/plans/${id}/assignments`, payload),
  // detaliu complet pt. modalul „Editing Scheduled Person" (email + times + timeline)
  getAssignment: (id, aid) => api.get(`/plans/${id}/assignments/${aid}`),
  updateAssignment: (id, aid, payload) => api.patch(`/plans/${id}/assignments/${aid}`, payload),
  unassign: (id, aid) => api.del(`/plans/${id}/assignments/${aid}`),
  // replică o echipă pe alta (SIM1→SIM2), după nume poziție
  copyTeam: (id, fromTeamId, toTeamId) => api.post(`/plans/${id}/assignments/copy`, { fromTeamId, toTeamId }),
  // setează câte persoane sunt necesare pe (echipă, poziție) — celula Needed
  setNeeded: (id, teamId, positionId, count) => api.put(`/plans/${id}/needed`, { teamId, positionId, count }),
};

/* ─── People (tab People) — server/planning-center/routes/people.js ─── */
export const peopleApi = {
  // { results:[{id,firstName,lastName,email,phone,permission,createdAt,...}], total, page, limit, hasMore }
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== "")).toString();
    return api.get(`/people${qs ? `?${qs}` : ""}`);
  },
  get: (id) => api.get(`/people/${id}`),
  teams: (id) => api.get(`/people/${id}/teams`),
  schedule: (id) => api.get(`/people/${id}/schedule`),
  blockouts: (id) => api.get(`/people/${id}/blockouts`),
  messages: (id) => api.get(`/people/${id}/messages`),
  // blocaj de biserică (on-break) pus de planificator — ascunde persoana din liste. Fără email.
  setChurchBlock: (id, payload = {}) => api.post(`/people/${id}/church-block`, payload),
  clearChurchBlock: (id) => api.del(`/people/${id}/church-block`),
};

/* ─── My Schedule / calendar — server/planning-center/routes/schedule.js ─── */
export const scheduleApi = {
  my: () => api.get("/schedule/my"),
  calendar: (year, month) => api.get(`/schedule/calendar?year=${year}&month=${month}`),
  blockouts: () => api.get("/schedule/blockouts"),
};

/* ─── Media — server/planning-center/routes/media.js ─── */
export const mediaApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return api.get(`/media${qs ? `?${qs}` : ""}`);
  },
};

/* ─── Matrix (planificare multi-plan) — server/planning-center/routes/matrix.js ─── */
export const matrixApi = {
  // { serviceTypeId, plans:[{id,dateLabel}], teams:[{teamId,name,positions:[{positionId,name,cells:[{people:[{..,status}],needed}]}]}] }
  grid: (serviceTypeId, count = 4) => api.get(`/matrix/${serviceTypeId}?count=${count}`),
  // raport „persoane neplanificate" (interval + slujire) — doar READ, fără scrieri
  coverage: (serviceTypeId, count = 4, teamId) => {
    const qs = new URLSearchParams(Object.entries({ count, teamId }).filter(([, v]) => v != null && v !== "")).toString();
    return api.get(`/matrix/${serviceTypeId}/coverage${qs ? `?${qs}` : ""}`);
  },
  // ATENȚIE: trimite emailuri reale. Se apelează DOAR la acțiune explicită a utilizatorului.
  sendEmails: (serviceTypeId, planIds, teamId) => api.post(`/matrix/${serviceTypeId}/emails`, { planIds, teamId }),
};
