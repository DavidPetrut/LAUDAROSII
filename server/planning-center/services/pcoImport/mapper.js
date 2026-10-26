/**
 * Mapperi PCO → modelele noastre pc_. Fiecare primește resursa PCO (JSON:API) + `ctx`:
 *   ctx.local(type, remoteId) → _id-ul local (rezolvare FK prin remoteId→localId)
 *   ctx.orgId, ctx.inc(type,id) → resursă din `included`
 * Întorc fieldurile pt. upsert (remoteId/remoteSource se adaugă de runner).
 * Numele atributelor = exact din PCO Services v2 (research_notes §12).
 */
const { relId, relIds } = require("./client");

const A = (r) => r.attributes || {};
const STATUS = { C: "confirmed", U: "unconfirmed", D: "declined" };
const POS = { pre: "before", post: "after", during: "during" };

const map = {
  folder: (r, ctx) => ({
    name: A(r).name || "Folder",
    parentId: ctx.local("Folder", relId(r, "parent")),
    campusId: ctx.local("Campus", relId(r, "campus")),
    sortOrder: A(r).sequence || 0,
  }),

  service_type: (r, ctx) => ({
    name: A(r).name || "Service Type",
    folderId: ctx.local("Folder", relId(r, "parent")),
    frequency: A(r).frequency || "weekly",
    permissions: A(r).permissions || "",
    scheduledPublish: !!A(r).scheduled_publish,
    limitedFileVisibility: !!A(r).attachment_types_enabled,
    lastPlanFrom: A(r).last_plan_from || "",
    sortOrder: A(r).sequence || 0,
  }),

  team: (r, ctx) => ({
    name: A(r).name || "Team",
    serviceTypeId: ctx.local("ServiceType", relId(r, "service_type")),
    serviceTypeIds: relIds(r, "service_types").map((id) => ctx.local("ServiceType", id)).filter(Boolean),
    flags: {
      rehearsal: !!A(r).rehearsal, secure: !!A(r).secure,
      split: !!A(r).split_team, tag: !!A(r).tag_team,
    },
    sortOrder: A(r).sequence || 0,
  }),

  team_position: (r, ctx) => ({
    teamId: ctx.local("Team", relId(r, "team")),
    name: A(r).name || "Position",
    sortOrder: A(r).sequence || 0,
    fileTags: A(r).tags || [],
  }),

  person: (r, ctx) => {
    const emails = (ctx.children(r, "emails") || []).map((e) => ({ address: A(e).address, location: A(e).location || "Home", primary: !!A(e).primary }));
    const phones = (ctx.children(r, "phone_numbers") || []).map((p) => ({ number: A(p).number, location: A(p).location || "Mobile", primary: !!A(p).primary }));
    return {
      firstName: A(r).first_name || "—",
      lastName: A(r).last_name || "",
      nickname: A(r).nickname || "",
      gender: A(r).gender === "Male" ? "M" : A(r).gender === "Female" ? "F" : "",
      birthdate: A(r).birthdate || null,
      emails, phones,
      status: A(r).status === "inactive" ? "inactive" : "active",
      child: !!A(r).child,
      avatar: A(r).photo_url || "",
    };
  },

  series: (r) => ({ title: A(r).title || "Series", artworkUrl: A(r).artwork_for_plan || "", hasArtwork: !!A(r).has_artwork }),

  plan: (r, ctx) => ({
    serviceTypeId: ctx.local("ServiceType", relId(r, "service_type")),
    title: A(r).title || "",
    seriesId: ctx.local("Series", relId(r, "series")),
    seriesTitle: A(r).series_title || "",
    sortDate: A(r).sort_date || A(r).dates || new Date(),
    publicView: !!A(r).public,
    remindersDisabled: !!A(r).reminders_disabled,
    createdByPersonId: ctx.local("Person", relId(r, "created_by")),
  }),

  plan_time: (r, ctx) => {
    // team_reminders din PCO poate avea chei/valori nevalide → curăț la {string:number} (Map sigur).
    const reminders = {};
    const tr = A(r).team_reminders;
    if (tr && typeof tr === "object" && !Array.isArray(tr)) {
      for (const [k, v] of Object.entries(tr)) {
        if (k != null && k !== "undefined" && v != null && !isNaN(Number(v))) reminders[String(k)] = Number(v);
      }
    }
    return {
      planId: ctx.local("Plan", relId(r, "plan")),
      type: A(r).time_type || "service",
      name: A(r).name || "",
      startsAt: A(r).starts_at,
      endsAt: A(r).ends_at || null,
      assignedTeamIds: (A(r).scheduled_team_ids || []).map((id) => ctx.local("Team", String(id))).filter(Boolean),
      teamReminders: reminders,
      recorded: !!A(r).recorded,
    };
  },

  item: (r, ctx) => ({
    planId: ctx.local("Plan", relId(r, "plan")),
    type: A(r).item_type || "item",
    title: A(r).title || "",
    description: A(r).description || "",
    htmlDetails: A(r).html_details || "",
    lengthSec: A(r).length || 0,
    keyName: A(r).key_name || "",
    placement: POS[A(r).service_position] || "during",
    sequence: A(r).custom_arrangement_sequence || [],
    songId: ctx.local("Song", relId(r, "song")),
    arrangementId: ctx.local("Arrangement", relId(r, "arrangement")),
    keyId: ctx.local("Key", relId(r, "key")),
    sortOrder: A(r).sequence || 0,
  }),

  plan_person: (r, ctx) => { // → Assignment
    const teamId = ctx.local("Team", relId(r, "team"));
    const posName = A(r).team_position_name || "";
    return {
      planId: ctx.local("Plan", relId(r, "plan")),
      teamId,
      positionId: ctx.posId(teamId, posName), // leagă poziția reală importată (după nume), dacă există
      personId: ctx.local("Person", relId(r, "person")),
      status: STATUS[A(r).status] || "unconfirmed",
      notes: A(r).notes || "",
      declineReason: A(r).decline_reason || "",
      prepared: !!A(r).prepare_notification,
      tempPositionName: posName, // numele poziției din PCO — păstrat mereu (Matrix)
      scheduledByPersonId: ctx.local("Person", relId(r, "scheduled_by")),
      preparedAt: A(r).notification_prepared_at || null,
      notificationSentAt: A(r).notification_sent_at || null,
      readAt: A(r).notification_read_at || null,
    };
  },

  needed_position: (r, ctx) => {
    const teamId = ctx.local("Team", relId(r, "team"));
    const posName = A(r).team_position_name || "";
    return {
      planId: ctx.local("Plan", relId(r, "plan")),
      teamId,
      positionId: ctx.posId(teamId, posName),
      positionName: posName, // păstrat mereu, chiar dacă FK nu se rezolvă
      count: A(r).quantity || 1,
      timeId: ctx.local("PlanTime", relId(r, "time")),
    };
  },

  plan_note: (r, ctx) => ({
    planId: ctx.local("Plan", relId(r, "plan")),
    categoryName: A(r).category_name || "",
    content: A(r).content || "",
    teamIds: relIds(r, "teams").map((id) => ctx.local("Team", id)).filter(Boolean),
  }),

  blockout: (r, ctx) => ({
    personId: ctx.local("Person", relId(r, "person")),
    startDate: (A(r).starts_at || "").slice(0, 10),
    endDate: (A(r).ends_at || "").slice(0, 10),
    reason: A(r).reason || "",
    repeat: A(r).repeat_frequency && A(r).repeat_frequency !== "no_repeat" ? "weekly" : "none",
    type: "personal",
  }),
};

module.exports = { map };
