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
  update: (id, payload) => api.patch(`/plans/${id}`, payload), // ex. { title } — redenumire plan
  teams: (id) => api.get(`/plans/${id}/teams`),
  rehearse: (id) => api.get(`/plans/${id}/rehearse`), // cântecele planului (Rehearse tab)
  times: (id) => api.get(`/plans/${id}/times`),
  addTime: (id, payload) => api.post(`/plans/${id}/times`, payload),       // { type, name, date, startTime, endTime }
  updateTime: (id, timeId, payload) => api.patch(`/plans/${id}/times/${timeId}`, payload),
  deleteTime: (id, timeId) => api.del(`/plans/${id}/times/${timeId}`),
  order: (id) => api.get(`/plans/${id}/order`),
  // ─── Order items (editor) — server/planning-center/routes/plans.js ───
  itemDetail: (id, itemId) => api.get(`/plans/${id}/items/${itemId}`),
  addItem: (id, payload) => api.post(`/plans/${id}/items`, payload), // { type, title?, songId?, arrangementId?, keyId?, mediaItemId?, afterItemId? }
  updateItem: (id, itemId, payload) => api.patch(`/plans/${id}/items/${itemId}`, payload),
  deleteItem: (id, itemId) => api.del(`/plans/${id}/items/${itemId}`),
  reorderItems: (id, itemIds) => api.post(`/plans/${id}/items/reorder`, { itemIds }),
  addLeader: (id, itemId, payload) => api.post(`/plans/${id}/items/${itemId}/leaders`, payload), // { personId } | { positionId }
  removeLeader: (id, itemId, { personId, positionId } = {}) => {
    const qs = new URLSearchParams(Object.entries({ personId, positionId }).filter(([, v]) => v)).toString();
    return api.del(`/plans/${id}/items/${itemId}/leaders${qs ? `?${qs}` : ""}`);
  },
  leaderSearch: (id, q) => api.get(`/plans/${id}/leader-search${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  // Voci structurate (Faza 2): pool-ul de oameni programați pe plan (vocaliști prioritizați).
  voicesPool: (id) => api.get(`/plans/${id}/voices-pool`),
  // Item notes (Faza 1/2)
  itemNotes: (id, itemId) => api.get(`/plans/${id}/items/${itemId}/notes`),
  addItemNote: (id, itemId, payload) => api.post(`/plans/${id}/items/${itemId}/notes`, payload),
  updateItemNote: (id, itemId, noteId, payload) => api.patch(`/plans/${id}/items/${itemId}/notes/${noteId}`, payload),
  deleteItemNote: (id, itemId, noteId) => api.del(`/plans/${id}/items/${itemId}/notes/${noteId}`),
  // Item files (scope item) (Faza 1)
  addItemFile: (id, itemId, payload) => api.post(`/plans/${id}/items/${itemId}/files`, payload),
  deleteItemFile: (id, itemId, fileId) => api.del(`/plans/${id}/items/${itemId}/files/${fileId}`),
  // Medley (Faza 4)
  createMedley: (id, payload) => api.post(`/plans/${id}/items/medley`, payload), // { itemIds?|songIds?, afterItemId? }
  updateMedley: (id, itemId, payload) => api.patch(`/plans/${id}/items/${itemId}/medley`, payload), // { medley: [...] }
  medleyChart: (id, itemId) => api.get(`/plans/${id}/items/${itemId}/medley-chart`),
  // Planning Center Alerts (tab Alerts) — { title, body, teamIds, attachments, links, scheduledAt? }
  alerts: (id) => api.get(`/plans/${id}/alerts`),
  createAlert: (id, payload) => api.post(`/plans/${id}/alerts`, payload),
  updateAlert: (id, alertId, payload) => api.patch(`/plans/${id}/alerts/${alertId}`, payload),
  deleteAlert: (id, alertId) => api.del(`/plans/${id}/alerts/${alertId}`),
  notes: (id) => api.get(`/plans/${id}/notes`),
  // Note de plan cu view-uri țintite (PcNoteView)
  myNote: (id) => api.get(`/plans/${id}/my-note`),                       // nota aplicabilă mie (viewer)
  calendarPrefill: (id) => api.get(`/plans/${id}/calendar-prefill`),     // evenimente precompletate pt. „adaugă în calendar"
  noteViews: (id) => api.get(`/plans/${id}/note-views`),                 // toate view-urile + picker (editor)
  createNoteView: (id, payload) => api.post(`/plans/${id}/note-views`, payload),
  updateNoteView: (id, viewId, payload) => api.patch(`/plans/${id}/note-views/${viewId}`, payload),
  deleteNoteView: (id, viewId) => api.del(`/plans/${id}/note-views/${viewId}`),
  reorderNoteViews: (id, viewIds) => api.post(`/plans/${id}/note-views/reorder`, { viewIds }),
  files: (id) => api.get(`/plans/${id}/files`),
  schedulable: (id, q) => api.get(`/plans/${id}/schedulable${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  // bara dreaptă: candidați pt. o poziție (due + conflicte). Nu trimite nimic.
  recommend: (id, { teamId, positionId, q } = {}) => {
    const qs = new URLSearchParams(Object.entries({ teamId, positionId, q }).filter(([, v]) => v)).toString();
    return api.get(`/plans/${id}/recommend${qs ? `?${qs}` : ""}`);
  },
  // asignează o persoană (DOAR DB, status unconfirmed implicit — NU trimite email)
  assign: (id, payload) => api.post(`/plans/${id}/assignments`, payload),
  // loghează un om REAL pus ca guest (o zi) pe o poziție din care nu face parte (nu-l adaugă în roster)
  guestLog: (id, payload) => api.post(`/plans/${id}/guest-log`, payload),
  // detaliu complet pt. modalul „Editing Scheduled Person" (email + times + timeline)
  getAssignment: (id, aid) => api.get(`/plans/${id}/assignments/${aid}`),
  updateAssignment: (id, aid, payload) => api.patch(`/plans/${id}/assignments/${aid}`, payload),
  unassign: (id, aid) => api.del(`/plans/${id}/assignments/${aid}`),
  // replică o echipă pe alta (SIM1→SIM2), după nume poziție
  copyTeam: (id, fromTeamId, toTeamId) => api.post(`/plans/${id}/assignments/copy`, { fromTeamId, toTeamId }),
  // setează câte persoane sunt necesare pe (echipă, poziție) — celula Needed
  setNeeded: (id, teamId, positionId, count, timeId) => api.put(`/plans/${id}/needed`, { teamId, positionId, count, timeId: timeId || undefined }),
  // reguli de recomandare per poziție (gen/program/target/instrucțiuni)
  setPositionRules: (positionId, payload) => api.patch(`/plans/positions/${positionId}/rules`, payload),
  // „manual"/fișiere per poziție
  positionRoster: (positionId) => api.get(`/plans/positions/${positionId}/roster`),
  // face persoana parte din rosterul poziției? (check înainte de asignare → decizie guest/permanent)
  isRoster: (positionId, personId) => api.get(`/plans/positions/${positionId}/is-roster?personId=${encodeURIComponent(personId)}`),
  // detaliul conflictelor unei persoane pe ziua planului (slujiri + blockouts) — pt. modalul „Verifică"
  personConflicts: (planId, { personId, positionId }) => api.get(`/plans/${planId}/person-conflicts?personId=${encodeURIComponent(personId)}${positionId ? `&positionId=${encodeURIComponent(positionId)}` : ""}`),
  positionFiles: (positionId) => api.get(`/plans/positions/${positionId}/files`),
  addPositionFile: (positionId, payload) => api.post(`/plans/positions/${positionId}/files`, payload),
  deletePositionFile: (positionId, fileId) => api.del(`/plans/positions/${positionId}/files/${fileId}`),
  uploadFile: (file) => { const fd = new FormData(); fd.append("file", file); fd.append("name", file.name); return api.post("/uploads", fd); },
};

/* ─── Service Types (settings) — server/planning-center/routes/services.js ─── */
export const servicesApi = {
  get: (id) => api.get(`/service-types/${id}`),
  patch: (id, payload) => api.patch(`/service-types/${id}`, payload),
  addNoteCategory: (id, payload) => api.post(`/service-types/${id}/note-categories`, payload),
  deleteNoteCategory: (id, catId) => api.del(`/service-types/${id}/note-categories/${catId}`),
};

/* ─── Teams + grupuri de slujire — server/planning-center/routes/teams.js ─── */
export const teamsApi = {
  list: () => api.get("/teams"),
  ministryGroups: () => api.get("/teams/ministry-groups"),
  setGroup: (teamId, ministryGroup) => api.patch(`/teams/${teamId}`, { ministryGroup }),
  // ── Teams management (#9) — echipe + poziții la nivel de service type ──
  manage: (serviceTypeId) => api.get(`/teams/manage?serviceTypeId=${encodeURIComponent(serviceTypeId)}`),
  create: (payload) => api.post("/teams", payload), // { name, serviceTypeId, ministryGroup? }
  update: (teamId, payload) => api.patch(`/teams/${teamId}`, payload), // { name?, ministryGroup?, flags?, onDecline?, ... }
  remove: (teamId) => api.del(`/teams/${teamId}`),
  reorder: (orderedIds) => api.post("/teams/reorder", { orderedIds }),
  addPosition: (teamId, name) => api.post(`/teams/${teamId}/positions`, { name }),
  renamePosition: (teamId, positionId, name) => api.patch(`/teams/${teamId}/positions/${positionId}`, { name }),
  removePosition: (teamId, positionId) => api.del(`/teams/${teamId}/positions/${positionId}`),
  reorderPositions: (teamId, orderedIds) => api.post(`/teams/${teamId}/positions/reorder`, { orderedIds }),
};

/* ─── People (tab People) — server/planning-center/routes/people.js ─── */
export const peopleApi = {
  // { person, permission, capabilities, myTeamIds } — eu + ce pot face
  me: () => api.get("/people/me"),
  // { results:[{id,firstName,lastName,email,phone,permission,createdAt,...}], total, page, limit, hasMore }
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== "")).toString();
    return api.get(`/people${qs ? `?${qs}` : ""}`);
  },
  get: (id) => api.get(`/people/${id}`),
  // oamenii blocați ACUM (status onBreak/suspended + church-block activ) — real-time, gated scheduler
  blocked: () => api.get("/people/blocked"),
  // Add Person (ca în PCO) — gen OBLIGATORIU; dacă emailul există deja ca user mobil, se leagă. Fără email.
  create: (payload) => api.post("/people", payload),
  update: (id, payload) => api.patch(`/people/${id}`, payload), // ex. { gender: "M"|"F"|"" }
  teams: (id) => api.get(`/people/${id}/teams`),
  schedule: (id) => api.get(`/people/${id}/schedule`),
  // de câte ori a fost persoana guest pe fiecare poziție (pt. Profile)
  guestLogs: (id) => api.get(`/people/${id}/guest-logs`),
  blockouts: (id) => api.get(`/people/${id}/blockouts`),
  messages: (id) => api.get(`/people/${id}/messages`),
  // blocaj de biserică (on-break) pus de planificator — ascunde persoana din liste. Fără email.
  setChurchBlock: (id, payload = {}) => api.post(`/people/${id}/church-block`, payload),
  clearChurchBlock: (id) => api.del(`/people/${id}/church-block`),
  // Lucrări (ministere) → poziții → roster + asignare rapidă (uniformizare People)
  ministries: () => api.get("/people/ministries"),
  roster: (id) => api.get(`/people/${id}/roster`),
  rosterAdd: (personId, positionIds) => api.post("/people/roster/add", { personId, positionIds }),
  rosterRemove: (personId, positionIds) => api.post("/people/roster/remove", { personId, positionIds }),
};

/* ─── Reports — server/planning-center/routes/reports.js (editor+, reports.view) ─── */
export const reportsApi = {
  overview: (opts = {}) => {
    const qs = new URLSearchParams(Object.entries(opts).filter(([, v]) => v != null && v !== "")).toString();
    return api.get(`/reports/overview${qs ? `?${qs}` : ""}`);
  },
  person: (personId, opts = {}) => {
    const qs = new URLSearchParams(Object.entries(opts).filter(([, v]) => v != null && v !== "")).toString();
    return api.get(`/reports/person/${personId}${qs ? `?${qs}` : ""}`);
  },
  songs: (opts = {}) => {
    const qs = new URLSearchParams(Object.entries(opts).filter(([, v]) => v != null && v !== "")).toString();
    return api.get(`/reports/songs${qs ? `?${qs}` : ""}`);
  },
  blockouts: (opts = {}) => {
    const qs = new URLSearchParams(Object.entries(opts).filter(([, v]) => v != null && v !== "")).toString();
    return api.get(`/reports/blockouts${qs ? `?${qs}` : ""}`);
  },
  futureSchedule: () => api.get("/reports/future-schedule"),
};

/* ─── My Schedule / calendar — server/planning-center/routes/schedule.js ─── */
export const scheduleApi = {
  my: () => api.get("/schedule/my"),
  calendar: (year, month) => api.get(`/schedule/calendar?year=${year}&month=${month}`),
  blockouts: () => api.get("/schedule/blockouts"),
  // adaugă blockout personal (interval, all-day/ore, repeat, motiv). Conflict → 409 (blochează; vezi reguli).
  addBlockout: (payload) => api.post("/schedule/blockouts", payload),
  removeBlockout: (id) => api.del(`/schedule/blockouts/${id}`),
  // programări în interval (pt. panoul view-only de conflicte în modal) — READ
  conflicts: (start, end) => api.get(`/schedule/blockouts/conflicts?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end || start)}`),
  // accept/decline (pending). Decline pe o programare CONFIRMATĂ e respins de server (409).
  respond: (assignmentId, action, reason) => api.post(`/schedule/assignments/${assignmentId}/respond`, { action, reason }),
  planRespond: (planId, action, reason) => api.post(`/schedule/plans/${planId}/respond`, { action, reason }),
  acceptAll: () => api.post("/schedule/accept-all", {}),
};

/* ─── Integrări calendar (OAuth Google) — server/planning-center/routes/integrations.js ─── */
export const integrationsApi = {
  googleStatus: () => api.get("/integrations/google/status"),
  googleConnect: () => api.get("/integrations/google/connect"),  // → { url, configured }
  googleDisconnect: () => api.post("/integrations/google/disconnect", {}),
  createEvents: (events) => api.post("/integrations/google/events", { events }),
};

/* ─── Planning Center Alerts (viewer) — server/planning-center/routes/alerts.js ─── */
export const alertsApi = {
  pending: () => api.get("/alerts/pending"),      // alertele mele neconfirmate (pop-up obligatoriu)
  ack: (alertId) => api.post(`/alerts/${alertId}/ack`, {}),
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
  // opts: { count, offset, prev, next, from, to, sts } — Custom Matrix (Smart Load + multi service type)
  grid: (serviceTypeId, opts = {}) => {
    const qs = new URLSearchParams(Object.entries(opts).filter(([, v]) => v != null && v !== "")).toString();
    return api.get(`/matrix/${serviceTypeId}${qs ? `?${qs}` : ""}`);
  },
  // raport „persoane neplanificate" (interval + slujire) — doar READ. opts: { planIds, teamId, count }
  coverage: (serviceTypeId, opts = {}) => {
    const qs = new URLSearchParams(Object.entries(opts).filter(([, v]) => v != null && v !== "")).toString();
    return api.get(`/matrix/${serviceTypeId}/coverage${qs ? `?${qs}` : ""}`);
  },
  // disponibilitatea unei persoane pe planurile vizibile (target-mode #11): per plan blockout/here/busy. READ.
  personAvailability: (serviceTypeId, { personId, planIds }) =>
    api.get(`/matrix/${serviceTypeId}/person-availability?personId=${encodeURIComponent(personId)}&planIds=${encodeURIComponent(planIds)}`),
  // ANOMALII (import PCO): oameni cu blockout + slujire în aceeași zi, pe toată fereastra vizibilă. READ.
  anomalies: (serviceTypeId, { planIds, refPlanId } = {}) => {
    const qs = new URLSearchParams(Object.entries({ planIds, refPlanId }).filter(([, v]) => v != null && v !== "")).toString();
    return api.get(`/matrix/${serviceTypeId}/anomalies${qs ? `?${qs}` : ""}`);
  },
  // target-mode: carduri pe SĂPTĂMÂNĂ (fereastra Matrix + alte service types selectate) pt. persoana targetată. READ.
  personWeeks: (serviceTypeId, { personId, planIds, serviceTypeIds }) => {
    const qs = new URLSearchParams(Object.entries({ personId, planIds, serviceTypeIds }).filter(([, v]) => v != null && v !== "")).toString();
    return api.get(`/matrix/${serviceTypeId}/person-weeks?${qs}`);
  },
  // ATENȚIE: trimite emailuri reale. Se apelează DOAR la acțiune explicită a utilizatorului.
  sendEmails: (serviceTypeId, planIds, teamId) => api.post(`/matrix/${serviceTypeId}/emails`, { planIds, teamId }),
};

/* ─── WhatsApp (sync grupuri) — server/planning-center/routes/whatsapp.js ─── */
export const whatsappApi = {
  status: () => api.get(`/whatsapp/status`),                 // { accounts: [...], bridgeEnabled }
  connect: () => api.post(`/whatsapp/connect`, {}),          // pairing NUMĂR NOU (QR)
  reconnect: (number) => api.post(`/whatsapp/connect/${number}`, {}),
  logout: (number) => api.post(`/whatsapp/logout/${number}`, {}),
  groups: (number) => api.get(`/whatsapp/groups?number=${number || ""}`),
  teams: () => api.get(`/whatsapp/teams`),
  teamWeeks: (teamId) => api.get(`/whatsapp/team/${teamId}/weeks`),
  teamPositions: (teamId) => api.get(`/whatsapp/team/${teamId}/positions`),
  targetPreview: (teamId, weekOfMonth, leaderPositionId, cadence) => api.get(`/whatsapp/target-preview?teamId=${teamId}&weekOfMonth=${weekOfMonth || 1}&leaderPositionId=${leaderPositionId || ""}&cadence=${cadence || "monthly"}`),
  mappings: () => api.get(`/whatsapp/mappings`),
  removeAccount: (sessionId) => api.post(`/whatsapp/account/remove`, { sessionId }),
  lucrari: () => api.get(`/whatsapp/lucrari`),
  createLucrare: (p) => api.post(`/whatsapp/lucrare`, p),
  updateLucrare: (id, p) => api.put(`/whatsapp/lucrare/${id}`, p),
  checkLucrareNumber: (id, number) => api.get(`/whatsapp/lucrare/${id}/check?number=${number}`),
  deleteLucrare: (id) => api.del(`/whatsapp/lucrare/${id}`),
  map: (payload) => api.post(`/whatsapp/map`, payload),
  mapBulk: (items) => api.post(`/whatsapp/map/bulk`, { items }),
  unmap: (id) => api.del(`/whatsapp/map/${id}`),
  setMode: (id, mode) => api.put(`/whatsapp/map/${id}/mode`, { mode }),
  preview: (id) => api.get(`/whatsapp/preview/${id}`),
  // ATENȚIE: adaugă/scoate oameni REALI din grup. DOAR pe acțiune explicită a utilizatorului.
  sync: (id) => api.post(`/whatsapp/sync/${id}`, {}),
  seedAll: (ids) => api.post(`/whatsapp/seed/all`, ids?.length ? { ids } : {}),
  seedWeek: (weekOfMonth, ids) => api.post(`/whatsapp/seed/week`, ids?.length ? { weekOfMonth, ids } : { weekOfMonth }),
};
