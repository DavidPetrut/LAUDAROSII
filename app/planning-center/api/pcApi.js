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
    markMessagesRead: (id) => api.post(`${B}/people/${id}/messages/mark-read`, {}),
    create: (data) => api.post(`${B}/people`, data),
    updateContact: (id, data) => api.patch(`${B}/people/${id}/contact`, data),
    tags: (id) => api.get(`${B}/people/${id}/tags`),
    setTags: (id, tagIds) => api.patch(`${B}/people/${id}/tags`, { tagIds }),
    import: {
      preview: (csv, mapping) => api.post(`${B}/people/import/preview`, { csv, mapping }),
      commit: (importId, ignoreRows = []) => api.post(`${B}/people/import/${importId}/commit`, { ignoreRows }),
      undo: (importId) => api.post(`${B}/people/import/${importId}/undo`, { confirm: "Undo import" }),
      get: (importId) => api.get(`${B}/people/import/${importId}`),
    },
  },

  serviceTypes: {
    create: (data) => api.post(`${B}/service-types`, data),
    get: (id) => api.get(`${B}/service-types/${id}`),
    update: (id, data) => api.patch(`${B}/service-types/${id}`, data),
    remove: (id) => api.delete(`${B}/service-types/${id}`),
  },

  plans: {
    list: () => api.get(`${B}/plans`),
    create: (data) => api.post(`${B}/plans`, data),
    get: (id) => api.get(`${B}/plans/${id}`),
    order: (id) => api.get(`${B}/plans/${id}/order`),
    item: (id, itemId) => api.get(`${B}/plans/${id}/items/${itemId}`),
    teams: (id) => api.get(`${B}/plans/${id}/teams`),
    times: (id) => api.get(`${B}/plans/${id}/times`),
    notes: (id) => api.get(`${B}/plans/${id}/notes`),
    files: (id) => api.get(`${B}/plans/${id}/files`),
    duplicate: (id, body) => api.post(`${B}/plans/${id}/duplicate`, body),
    // Order editing
    addItem: (planId, data) => api.post(`${B}/plans/${planId}/items`, data),
    updateItem: (planId, itemId, data) => api.patch(`${B}/plans/${planId}/items/${itemId}`, data),
    deleteItem: (planId, itemId) => api.delete(`${B}/plans/${planId}/items/${itemId}`),
    reorderItems: (planId, itemIds) => api.post(`${B}/plans/${planId}/items/reorder`, { itemIds }),
    addLeader: (planId, itemId, payload) => api.post(`${B}/plans/${planId}/items/${itemId}/leaders`, payload),
    removeLeader: (planId, itemId, { personId, positionId }) =>
      api.delete(`${B}/plans/${planId}/items/${itemId}/leaders${personId ? `?personId=${personId}` : positionId ? `?positionId=${positionId}` : ""}`),
    leaderSearch: (planId, q) => api.get(`${B}/plans/${planId}/leader-search${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    // Scheduling
    schedulable: (planId, q) => api.get(`${B}/plans/${planId}/schedulable${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    assign: (planId, data) => api.post(`${B}/plans/${planId}/assignments`, data),
    unassign: (planId, aid) => api.delete(`${B}/plans/${planId}/assignments/${aid}`),
    sendScheduleEmails: (planId, teamId) => api.post(`${B}/plans/${planId}/send-schedule-emails`, teamId ? { teamId } : {}),
    rehearse: (planId) => api.get(`${B}/plans/${planId}/rehearse`),
  },

  media: {
    list: (params = {}) => api.get(`${B}/media${qs(typeof params === "string" ? { q: params } : params)}`),
    get: (id) => api.get(`${B}/media/${id}`),
    create: (data) => api.post(`${B}/media`, data),
    update: (id, data) => api.patch(`${B}/media/${id}`, data),
    remove: (id) => api.delete(`${B}/media/${id}`),
  },

  schedule: {
    my: () => api.get(`${B}/schedule/my`),
    respond: (assignmentId, action, reason) => api.post(`${B}/schedule/assignments/${assignmentId}/respond`, { action, reason }),
    planRespond: (planId, action, reason) => api.post(`${B}/schedule/plans/${planId}/respond`, { action, reason }),
    acceptAll: () => api.post(`${B}/schedule/accept-all`, {}),
    calendar: (year, month) => api.get(`${B}/schedule/calendar?year=${year}&month=${month}`),
    blockouts: () => api.get(`${B}/schedule/blockouts`),
    conflicts: (start, end) => api.get(`${B}/schedule/blockouts/conflicts?start=${start}&end=${end || start}`),
    createBlockouts: (blockouts) => api.post(`${B}/schedule/blockouts`, { blockouts }),
    deleteBlockout: (id) => api.delete(`${B}/schedule/blockouts/${id}`),
  },

  matrix: {
    get: (serviceTypeId, count) => api.get(`${B}/matrix/${serviceTypeId}${count ? `?count=${count}` : ""}`),
    sendEmails: (serviceTypeId, planIds, teamId) => api.post(`${B}/matrix/${serviceTypeId}/emails`, { planIds, teamId }),
  },

  songs: {
    list: (params = {}) => api.get(`${B}/songs${qs(typeof params === "string" ? { q: params } : params)}`),
    create: (data) => api.post(`${B}/songs`, data),
    get: (id) => api.get(`${B}/songs/${id}`),
    arrangement: (id, aid) => api.get(`${B}/songs/${id}/arrangements/${aid}`),
    addArrangement: (id, data) => api.post(`${B}/songs/${id}/arrangements`, data),
    updateArrangement: (id, aid, data) => api.patch(`${B}/songs/${id}/arrangements/${aid}`, data),
    deleteArrangement: (id, aid) => api.delete(`${B}/songs/${id}/arrangements/${aid}`),
    addKey: (id, aid, data) => api.post(`${B}/songs/${id}/arrangements/${aid}/keys`, data),
    updateKey: (id, aid, kid, data) => api.patch(`${B}/songs/${id}/arrangements/${aid}/keys/${kid}`, data),
    deleteKey: (id, aid, kid) => api.delete(`${B}/songs/${id}/arrangements/${aid}/keys/${kid}`),
    addFile: (id, aid, data) => api.post(`${B}/songs/${id}/arrangements/${aid}/files`, data),
    integrations: () => api.get(`${B}/songs/meta/integrations`),
    linkIntegration: (provider) => api.post(`${B}/songs/meta/integrations/${provider}/link`, {}),
    // Tags (Song & Arrangement)
    tags: (domain = "song") => api.get(`${B}/songs/meta/tags?domain=${domain}`),
    createTagGroup: (data) => api.post(`${B}/songs/meta/tag-groups`, data),
    updateTagGroup: (id, data) => api.patch(`${B}/songs/meta/tag-groups/${id}`, data),
    deleteTagGroup: (id) => api.delete(`${B}/songs/meta/tag-groups/${id}`),
    createTag: (data) => api.post(`${B}/songs/meta/tags`, data),
    updateTag: (id, data) => api.patch(`${B}/songs/meta/tags/${id}`, data),
    deleteTag: (id) => api.delete(`${B}/songs/meta/tags/${id}`),
    setSongTags: (id, tagIds) => api.patch(`${B}/songs/${id}/tags`, { tagIds }),
    setArrangementTags: (id, aid, tagIds) => api.patch(`${B}/songs/${id}/arrangements/${aid}/tags`, { tagIds }),
    // Lyrics & Chords (ChordPro) + transpunere audio
    getChordChart: (id, aid) => api.get(`${B}/songs/${id}/arrangements/${aid}/chordchart`),
    saveChordChart: (id, aid, data) => api.put(`${B}/songs/${id}/arrangements/${aid}/chordchart`, data),
    transposeAudio: (id, aid, data) => api.post(`${B}/songs/${id}/arrangements/${aid}/transpose-audio`, data),
  },

  reports: {
    person: (personId, params = {}) => api.get(`${B}/reports/person/${personId}${qs(params)}`),
    overview: (params = {}) => api.get(`${B}/reports/overview${qs(params)}`),
    songs: (params = {}) => api.get(`${B}/reports/songs${qs(params)}`),
    blockouts: (params = {}) => api.get(`${B}/reports/blockouts${qs(params)}`),
    futureSchedule: () => api.get(`${B}/reports/future-schedule`),
  },

  admin: {
    status: () => api.get(`${B}/admin/status`),
    seed: () => api.post(`${B}/admin/seed`, {}),
    seedDemoPlan: () => api.post(`${B}/admin/seed-demo-plan`, {}),
    seedServiceTypes: () => api.post(`${B}/admin/seed-service-types`, {}),
  },
};

export default pcApi;
