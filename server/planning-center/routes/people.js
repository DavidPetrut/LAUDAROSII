/**
 * Rute People (felia 1). Namespace montat la /api/pc/v1/people (vezi routes/index.js).
 * Tot org-scoped (req.pcOrgId) + authz server-side (invariant §1.4).
 * UI consumator = app/planning-center/screens/people/* (ecrane identice cu PCO).
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcPerson,
  PcTeam,
  PcTeamMember,
  PcPosition,
  PcServiceType,
  PcTagGroup,
  PcTag,
  PcAssignment,
  PcPlan,
  PcBlockout,
  PcMessage,
  PcOrg,
  PcCampus,
} = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { can, canAny, requireCan, requireAny, resolveEffective, pcTitles,
  CAN_ROSTER, CAN_VIEW_MATRIX, CAN_ASSIGN, CAN_MOVE, CAN_NEEDED, CAN_MANAGE_TEAMS, CAN_POSITION_RULES, CAN_BLOCKOUTS } = require("../core/permissions");
const { syncPeopleIfStale } = require("../services/seed");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);

/** pc_person-ul viewerului curent (linkat prin userId). Null dacă n-are. */
async function viewerPerson(req) {
  if (req._pcViewer !== undefined) return req._pcViewer;
  const p = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
  req._pcViewer = p || null;
  return req._pcViewer;
}

/** teamIds-urile viewerului (My Teams). */
async function viewerTeamIds(req) {
  const me = await viewerPerson(req);
  if (!me) return [];
  const mems = await PcTeamMember.find(scoped(req, { personId: me._id })).select("teamId").lean();
  return mems.map((m) => m.teamId);
}

/** personIds vizibili pt. un viewer care NU are viewAll (oameni din echipele lui). */
async function visiblePersonIds(req) {
  const teamIds = await viewerTeamIds(req);
  const me = await viewerPerson(req);
  const mems = await PcTeamMember.find(scoped(req, { teamId: { $in: teamIds } }))
    .select("personId")
    .lean();
  const ids = mems.map((m) => m.personId);
  if (me) ids.push(me._id);
  return ids;
}

function initials(first, last) {
  return `${(first || "").charAt(0)}${(last || "").charAt(0)}`.toUpperCase() || "—";
}
function toRow(p) {
  const email = (p.emails || []).find((e) => e.primary)?.address || (p.emails || [])[0]?.address || "";
  const phone = (p.phones || []).find((e) => e.primary)?.number || (p.phones || [])[0]?.number || "";
  return {
    id: p._id,
    firstName: p.firstName,
    lastName: p.lastName,
    fullName: [p.firstName, p.lastName].filter(Boolean).join(" ").trim(),
    avatar: p.avatar || "",
    initials: initials(p.firstName, p.lastName),
    email,
    phone,
    permission: p.role || p.permission || "Viewer",
    createdAt: p.createdAt || null,
    sim: ["1", "2"].includes(String(p.programIntent)) ? String(p.programIntent) : "", // SIM 1/2 (coloană opțională)
    gender: ["M", "F"].includes(p.gender) ? p.gender : "",                            // sex (coloană opțională)
    schedulingStatus: p.schedulingStatus || "available", // available | onBreak | suspended
  };
}

/* ───────── GET /me — viewerul curent + permisiunea efectivă + echipele lui ───────── */
router.get("/me", async (req, res) => {
  try {
    const eff = await resolveEffective(req);
    const me = await PcPerson.findOne(scoped(req, { userId: req.user.id })).lean();
    const teamIds = await viewerTeamIds(req);
    res.json({
      person: me ? toRow(me) : null,
      permission: {
        pcAccess: eff.pcAccess, // "total" | "partial" | "basic"
        titles: pcTitles(req), // ex. ["Admin", "Planning Admin"] — afișate în profil
        peoplePlansLevel: eff.peoplePlansLevel,
        songLevel: eff.songLevel,
        mediaLevel: eff.mediaLevel,
        isOrgAdmin: eff.isOrgAdmin,
      },
      capabilities: {
        viewPeople: await can(req, "people.view"),
        viewAllPeople: await can(req, "people.viewAll"),
        createPeople: await can(req, "people.create"),
        editContact: await can(req, "people.editContact"),
        manageBlocks: await can(req, "people.manageBlocks"),
        exportCsv: await can(req, "people.exportCsv"),
        import: await can(req, "people.import"),
        managePermissions: await can(req, "people.managePermissions"),
        roster: await canAny(req, CAN_ROSTER),
        addPlan: await can(req, "services.addPlan"),
        manageServiceTypes: await can(req, "services.manageServiceTypes"),
        editOrder: await can(req, "services.editOrder"),
        schedule: await can(req, "services.schedule"),
        // granular Matrix/Teams (umbrella services.schedule le dă pe toate)
        viewMatrix: await canAny(req, CAN_VIEW_MATRIX),
        assign: await canAny(req, CAN_ASSIGN),
        move: await canAny(req, CAN_MOVE),
        editNeeded: await canAny(req, CAN_NEEDED),
        blockouts: await canAny(req, CAN_BLOCKOUTS),
        manageTeams: await canAny(req, CAN_MANAGE_TEAMS),
        positionRules: await canAny(req, CAN_POSITION_RULES),
        songsEdit: await can(req, "songs.edit"),
        mediaEdit: await can(req, "media.edit"),
        reportsView: await can(req, "reports.view"),
      },
      myTeamIds: teamIds,
    });
  } catch (err) {
    console.error("[pc] GET /me:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea profilului curent." });
  }
});

/* ───────── GET /meta/filters — date pt. bottom-sheet-ul Filter (Teams/Tags/Permissions) ───────── */
router.get("/meta/filters", requireCan("people.view"), async (req, res) => {
  try {
    const [teams, serviceTypes, positions, tagGroups, tags] = await Promise.all([
      PcTeam.find(scoped(req, { archived: false })).select("name serviceTypeId sortOrder").sort({ sortOrder: 1, name: 1 }).lean(),
      PcServiceType.find(scoped(req)).select("name").lean(),
      PcPosition.find(scoped(req)).select("name teamId").lean(),
      PcTagGroup.find(scoped(req, { domain: "people" })).select("name category sortOrder").sort({ sortOrder: 1 }).lean(),
      PcTag.find(scoped(req, { domain: "people" })).select("name tagGroupId sortOrder").sort({ sortOrder: 1 }).lean(),
    ]);
    const stName = {};
    serviceTypes.forEach((s) => (stName[String(s._id)] = s.name));
    const myTeamIds = (await viewerTeamIds(req)).map(String);

    res.json({
      teams: teams.map((t) => ({
        id: t._id,
        name: t.name,
        serviceTypeName: t.serviceTypeId ? stName[String(t.serviceTypeId)] || "" : "",
        isMine: myTeamIds.includes(String(t._id)),
      })),
      positions: positions.map((p) => ({ id: p._id, name: p.name, teamId: p.teamId })),
      tagGroups: tagGroups.map((g) => ({
        id: g._id,
        name: g.name,
        category: g.category,
        tags: tags.filter((t) => String(t.tagGroupId) === String(g._id)).map((t) => ({ id: t._id, name: t.name })),
      })),
      permissionLevels: ["any", "scheduledViewer", "viewer", "scheduler", "editor", "administrator"],
    });
  } catch (err) {
    console.error("[pc] GET /meta/filters:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea filtrelor." });
  }
});

/* ───────── GET / — listă People (search + sort + paginare + filtre) ───────── */
router.get("/", requireCan("people.view"), async (req, res) => {
  try {
    // Sincronizare dinamică: userii creați în admin (ex. bulk CSV) apar automat în Planificare.
    await syncPeopleIfStale();
    const {
      q = "",
      sortBy = "firstName",
      dir = "asc",
      page = "1",
      limit = "40",
      teamIds = "",
      tagIds = "",
      minPermission = "",
      scope = "", // "myTeams" | "" (toți)
    } = req.query;

    const filter = scoped(req, { status: "active" });

    // Vizibilitate: viewer fără viewAll vede doar oamenii din echipele lui.
    if (!(await can(req, "people.viewAll"))) {
      filter._id = { $in: await visiblePersonIds(req) };
    }

    // Căutare (regex, case-insensitive, pe mai multe câmpuri).
    const term = String(q).trim();
    if (term) {
      const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ firstName: rx }, { lastName: rx }, { nickname: rx }, { "emails.address": rx }];
    }

    // Filtru Teams/Positions (via pc_teamMembers).
    const teamIdList = String(teamIds).split(",").map((s) => s.trim()).filter(Boolean).map(OID).filter(Boolean);
    if (scope === "myTeams" && teamIdList.length === 0) {
      teamIdList.push(...(await viewerTeamIds(req)));
    }
    if (teamIdList.length) {
      const mems = await PcTeamMember.find(scoped(req, { teamId: { $in: teamIdList } })).select("personId").lean();
      const ids = mems.map((m) => m.personId);
      filter._id = filter._id ? { $in: ids.filter((id) => (filter._id.$in || []).some((x) => String(x) === String(id))) } : { $in: ids };
    }

    // Filtru „grup de slujire" (cele 5 mari): oameni din echipele care au acel ministryGroup.
    const mg = String(req.query.ministryGroup || "").trim();
    if (mg) {
      const grpTeams = await PcTeam.find(scoped(req, { ministryGroup: mg, archived: false })).select("_id").lean();
      const mems = await PcTeamMember.find(scoped(req, { teamId: { $in: grpTeams.map((t) => t._id) } })).select("personId").lean();
      const ids = mems.map((m) => m.personId);
      filter._id = filter._id
        ? { $in: (filter._id.$in || []).filter((x) => ids.some((id) => String(id) === String(x))) }
        : { $in: ids };
    }

    // Filtru Tags.
    const tagIdList = String(tagIds).split(",").map((s) => s.trim()).filter(Boolean).map(OID).filter(Boolean);
    if (tagIdList.length) filter.tagIds = { $all: tagIdList };

    const sortField = sortBy === "lastName" ? "lastName" : "firstName";
    const sortDir = dir === "desc" ? -1 : 1;
    const pageN = Math.max(1, parseInt(page, 10) || 1);
    const limitN = Math.min(100, Math.max(1, parseInt(limit, 10) || 40));

    const [total, docs] = await Promise.all([
      PcPerson.countDocuments(filter),
      PcPerson.find(filter)
        .collation({ locale: "ro", strength: 1 })
        .sort({ [sortField]: sortDir, _id: 1 })
        .skip((pageN - 1) * limitN)
        .limit(limitN)
        .select("firstName lastName avatar emails phones role permission createdAt schedulingStatus programIntent gender")
        .lean(),
    ]);

    res.json({
      results: docs.map(toRow),
      total,
      page: pageN,
      limit: limitN,
      hasMore: pageN * limitN < total,
    });
  } catch (err) {
    console.error("[pc] GET /people:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea listei de oameni." });
  }
});

/* ───────── GET /blocked — oamenii blocați ACUM (real-time), pt. panoul de administrare ─────────
   Gated: doar cine poate planifica vede/administrează blocajele. Două surse:
   status persistent (onBreak/suspended) + church-block activ (type churchBlock, endDate ≥ azi). */
router.get("/blocked", requireCan("people.manageBlocks"), async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [cbs, statusPeople] = await Promise.all([
      PcBlockout.find(scoped(req, { type: "churchBlock", endDate: { $gte: today } })).sort({ startDate: 1 }).select("personId startDate endDate reason").lean(),
      PcPerson.find(scoped(req, { schedulingStatus: { $in: ["onBreak", "suspended"] } })).select("firstName lastName avatar schedulingStatus").lean(),
    ]);
    const pids = [...new Set([...cbs.map((b) => String(b.personId)), ...statusPeople.map((p) => String(p._id))])].map(OID);
    const people = await PcPerson.find(scoped(req, { _id: { $in: pids } })).select("firstName lastName avatar schedulingStatus").lean();
    const pById = Object.fromEntries(people.map((p) => [String(p._id), p]));
    const cbByPerson = {};
    cbs.forEach((b) => { const k = String(b.personId); if (!cbByPerson[k]) cbByPerson[k] = b; });

    const rows = pids.map((pid) => {
      const k = String(pid);
      const p = pById[k]; if (!p) return null;
      const cb = cbByPerson[k];
      const base = { id: p._id, name: [p.firstName, p.lastName].filter(Boolean).join(" ").trim(), avatar: p.avatar || "", initials: initials(p.firstName, p.lastName) };
      if (cb) {
        const until = cb.endDate && cb.endDate < "2099-01-01" ? cb.endDate : null; // null = nelimitat
        return { ...base, kind: "churchBlock", since: cb.startDate, until, reason: cb.reason || "" };
      }
      return { ...base, kind: p.schedulingStatus, until: null, reason: "" };
    }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));

    res.json({ blocked: rows, total: rows.length });
  } catch (err) { console.error("[pc] GET /people/blocked:", err.message); res.status(500).json({ error: "Eroare la lista de blocați." }); }
});

/* ═══════════ LUCRĂRI (ministere) → poziții → roster — uniformizare People ═══════════
   Ministerul = numele echipei fără „(SIM n)" (SIM-urile se contopesc). Pozițiile se merge-uiesc
   după nume peste echipele ministerului. Rosterul = pc_teamMembers (cine slujește pe poziție). */
const cleanMinistry = (name = "") => String(name).replace(/\s*\(\s*(?:sim\s*)?[12]\s*\)\s*$/i, "").trim() || String(name).trim();

/* ── Grupaj „părinte" al lucrărilor (taburi de nivel 1 în People). Manual, cerut de lideri.
   Lucrarea reală (minister) devine nivelul 2 înăuntru. Ordinea = prioritatea taburilor. ── */
const PARENT_ORDER = ["Asimilare", "Vertical Kids", "Lauda si Inchinare", "Media", "Grupuri mici", "Altele"];
const stripDia = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const PARENT_MAP = {
  "asimilare": "Asimilare", "asimilare tineret": "Asimilare", "voluntari": "Asimilare",
  "mancare": "Asimilare", "shop": "Asimilare", "cafenea": "Asimilare", "curatenie si ordine sala": "Asimilare",
  "vertical kids": "Vertical Kids",
  "lauda si inchinare": "Lauda si Inchinare", "lauda si inchinare copii": "Lauda si Inchinare",
  "vorbitori": "Lauda si Inchinare", "instrumentisti": "Lauda si Inchinare",
  "vocalisti": "Lauda si Inchinare", "rugaciune": "Lauda si Inchinare",
  "media": "Media",
};
const parentOf = (name) => {
  const k = stripDia(name);
  if (PARENT_MAP[k]) return PARENT_MAP[k];
  if (/^grup(\s|$)/.test(k)) return "Grupuri mici";
  return "Altele";
};

router.get("/ministries", requireCan("people.view"), async (req, res) => {
  try {
    const teams = await PcTeam.find(scoped(req, { archived: false })).select("name sortOrder").sort({ sortOrder: 1, name: 1 }).lean();
    const teamIds = teams.map((t) => t._id);
    const [positions, members] = await Promise.all([
      PcPosition.find(scoped(req, { teamId: { $in: teamIds } })).select("name teamId sortOrder").sort({ sortOrder: 1 }).lean(),
      PcTeamMember.find(scoped(req, { teamId: { $in: teamIds } })).select("personId teamId positionIds").lean(),
    ]);
    const minOfTeam = Object.fromEntries(teams.map((t) => [String(t._id), cleanMinistry(t.name)]));
    // persoană → set de positionId-uri (din roster)
    const posByPerson = {};
    members.forEach((m) => { const s = posByPerson[String(m.personId)] = posByPerson[String(m.personId)] || new Set(); (m.positionIds || []).forEach((pid) => s.add(String(pid))); });
    // minister → poziții (după nume) → { positionIds }. Grupăm case-insensitive (numele echipelor sunt inconsistente),
    // poziția la fel (după nume normalizat), ca să nu avem lucrări/poziții duplicate.
    const mins = {}; // keyLower → { name (display), order, positions: { posKeyLower → { name, ids:Set, order } } }
    let ord = 0;
    positions.forEach((p) => {
      const minRaw = minOfTeam[String(p.teamId)]; if (!minRaw) return;
      const mk = minRaw.toLowerCase();
      const M = mins[mk] = mins[mk] || { name: minRaw, order: ord++, positions: {} };
      const posName = (p.name || "—").trim();
      const pk = posName.toLowerCase();
      const P = M.positions[pk] = M.positions[pk] || { name: posName, ids: new Set(), order: p.sortOrder || 0 };
      P.ids.add(String(p._id));
    });
    // membrii per poziție (persoane al căror roster conține vreun positionId al pozíției merge-uite)
    const allPersonIds = [...new Set(members.map((m) => String(m.personId)))];
    const people = await PcPerson.find(scoped(req, { _id: { $in: allPersonIds }, status: "active" })).select("firstName lastName avatar programIntent").lean();
    const pById = Object.fromEntries(people.map((p) => [String(p._id), p]));
    const mini = (id) => { const p = pById[id]; return p ? { id: p._id, name: [p.firstName, p.lastName].filter(Boolean).join(" "), avatar: p.avatar || "", initials: `${(p.firstName || "").charAt(0)}${(p.lastName || "").charAt(0)}`.toUpperCase(), sim: p.programIntent || "" } : null; };

    const out = Object.values(mins).map((M) => {
      const positionsArr = Object.values(M.positions).map((P) => {
        const ids = [...P.ids];
        const mem = allPersonIds.filter((pid) => { const s = posByPerson[pid]; return s && ids.some((x) => s.has(x)); }).map(mini).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
        return { name: P.name, positionIds: ids, order: P.order, members: mem };
      }).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
      const memberCount = new Set(positionsArr.flatMap((p) => p.members.map((m) => String(m.id)))).size;
      return { name: M.name, group: parentOf(M.name), order: M.order, memberCount, positions: positionsArr };
    }).sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name));

    // taburile de nivel 1 (doar cele care au lucrări), în ordinea cerută; membri unici per grup
    const groups = PARENT_ORDER
      .map((g) => {
        const mins2 = out.filter((m) => m.group === g);
        if (!mins2.length) return null;
        const memberCount = new Set(mins2.flatMap((m) => m.positions.flatMap((p) => p.members.map((x) => String(x.id))))).size;
        return { name: g, memberCount, ministryCount: mins2.length };
      })
      .filter(Boolean);

    res.json({ ministries: out, groups });
  } catch (err) { console.error("[pc] GET /people/ministries:", err.message); res.status(500).json({ error: "Eroare la lucrări." }); }
});

/* roster-ul unei persoane: ce positionId-uri are (pt. panoul de asignare rapidă) */
router.get("/:id/roster", requireCan("people.view"), async (req, res) => {
  try {
    const mems = await PcTeamMember.find(scoped(req, { personId: OID(req.params.id) })).select("positionIds").lean();
    const positionIds = [...new Set(mems.flatMap((m) => (m.positionIds || []).map(String)))];
    res.json({ positionIds });
  } catch (err) { console.error("[pc] GET roster:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* adaugă/scoate o persoană din rosterul unor poziții (pc_teamMembers). ZERO email — doar roster. */
async function rosterMutate(req, res, add) {
  const personId = OID(req.body?.personId);
  const positionIds = (Array.isArray(req.body?.positionIds) ? req.body.positionIds : []).map(OID).filter(Boolean);
  if (!personId || !positionIds.length) return res.status(400).json({ error: "personId/positionIds lipsesc." });
  const posDocs = await PcPosition.find(scoped(req, { _id: { $in: positionIds } })).select("teamId").lean();
  const byTeam = {}; posDocs.forEach((p) => (byTeam[String(p.teamId)] = byTeam[String(p.teamId)] || []).push(p._id));
  for (const [teamId, posIds] of Object.entries(byTeam)) {
    if (add) {
      await PcTeamMember.updateOne(
        { orgId: req.pcOrgId, teamId: OID(teamId), personId },
        { $setOnInsert: { orgId: req.pcOrgId, teamId: OID(teamId), personId }, $addToSet: { positionIds: { $each: posIds } } },
        { upsert: true }
      );
    } else {
      await PcTeamMember.updateOne({ orgId: req.pcOrgId, teamId: OID(teamId), personId }, { $pull: { positionIds: { $in: posIds } } });
    }
  }
  res.json({ ok: true });
}
router.post("/roster/add", requireAny(CAN_ROSTER), (req, res) => rosterMutate(req, res, true).catch((e) => { console.error("[pc] roster add:", e.message); res.status(500).json({ error: "Eroare." }); }));
router.post("/roster/remove", requireAny(CAN_ROSTER), (req, res) => rosterMutate(req, res, false).catch((e) => { console.error("[pc] roster remove:", e.message); res.status(500).json({ error: "Eroare." }); }));

/* ───────── GET /:id — profil persoană ───────── */
router.get("/:id", requireCan("people.view"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid" });
    const p = await PcPerson.findOne(scoped(req, { _id: id })).lean();
    if (!p) return res.status(404).json({ error: "Persoana nu există" });
    const teamsCount = await PcTeamMember.countDocuments(scoped(req, { personId: id }));
    res.json({
      ...toRow(p),
      emails: p.emails || [],
      phones: p.phones || [],
      addresses: p.addresses || [],
      status: p.status,
      birthdate: p.birthdate,
      anniversary: p.anniversary,
      gender: p.gender,
      maritalStatus: p.maritalStatus,
      notes: p.notes,
      child: p.child,
      teamsCount,
      tagsCount: (p.tagIds || []).length,
    });
  } catch (err) {
    console.error("[pc] GET /people/:id:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea profilului." });
  }
});

/* ───────── GET /:id/teams — My Teams (echipe + service type + poziții) ───────── */
router.get("/:id/teams", requireCan("people.view"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid" });
    const mems = await PcTeamMember.find(scoped(req, { personId: id })).lean();
    const teamIds = mems.map((m) => m.teamId);
    const [teams, positions] = await Promise.all([
      PcTeam.find(scoped(req, { _id: { $in: teamIds } })).lean(),
      PcPosition.find(scoped(req, { teamId: { $in: teamIds } })).lean(),
    ]);
    const stIds = teams.map((t) => t.serviceTypeId).filter(Boolean);
    const serviceTypes = await PcServiceType.find(scoped(req, { _id: { $in: stIds } })).select("name").lean();
    const stName = {};
    serviceTypes.forEach((s) => (stName[String(s._id)] = s.name));
    const teamById = {};
    teams.forEach((t) => (teamById[String(t._id)] = t));
    const posById = {};
    positions.forEach((p) => (posById[String(p._id)] = p));

    const result = mems.map((m) => {
      const t = teamById[String(m.teamId)] || {};
      return {
        teamId: m.teamId,
        teamName: t.name || "",
        serviceTypeName: t.serviceTypeId ? stName[String(t.serviceTypeId)] || "" : "",
        flags: t.flags || {},
        positions: (m.positionIds || []).map((pid) => posById[String(pid)]?.name).filter(Boolean),
        frequencyLabel: m.frequencyLabel || "",
        timesLabel: m.timesLabel || "",
        isLeader: m.isLeader,
      };
    });
    res.json({ teams: result });
  } catch (err) {
    console.error("[pc] GET /people/:id/teams:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea echipelor." });
  }
});

/* ───────── Stub-uri (vor fi alimentate la feliile următoare — aditiv) ───────── */
async function profileTz(req) {
  if (req._pcTz) return req._pcTz;
  const org = await PcOrg.findById(req.pcOrgId).select("defaultCampusId").lean();
  let tz = "Europe/Bucharest";
  if (org?.defaultCampusId) { const c = await PcCampus.findById(org.defaultCampusId).select("timezone").lean(); if (c?.timezone) tz = c.timezone; }
  req._pcTz = tz; return tz;
}
const fmtDay = (d, tz) => (d ? new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(new Date(d)) : "");

/* GET /:id/schedule — programările viitoare ale persoanei (pt. Profile). */
router.get("/:id/schedule", requireCan("people.view"), async (req, res) => {
  try {
    const personId = OID(req.params.id);
    const tz = await profileTz(req);
    const assigns = await PcAssignment.find(scoped(req, { personId, status: { $ne: "declined" } })).lean();
    const planIds = [...new Set(assigns.map((a) => String(a.planId)))].map(OID);
    const plans = await PcPlan.find(scoped(req, { _id: { $in: planIds } })).select("serviceTypeId sortDate").lean();
    const now = new Date(Date.now() - 12 * 3600 * 1000); // include ziua curentă
    const planById = Object.fromEntries(plans.map((p) => [String(p._id), p]));
    const sts = await PcServiceType.find(scoped(req, { _id: { $in: plans.map((p) => p.serviceTypeId) } })).select("name").lean();
    const stName = Object.fromEntries(sts.map((s) => [String(s._id), s.name]));
    // grupare pe plan + doar viitoare
    const seen = new Set(); const out = [];
    assigns.forEach((a) => {
      const plan = planById[String(a.planId)]; if (!plan || new Date(plan.sortDate) < now) return;
      const key = String(a.planId); if (seen.has(key)) return; seen.add(key);
      out.push({ planId: a.planId, dateLabel: fmtDay(plan.sortDate, tz), sortDate: plan.sortDate, serviceTypeName: stName[String(plan.serviceTypeId)] || "", status: assigns.some((x) => String(x.planId) === key && x.status === "unconfirmed") ? "unconfirmed" : "confirmed" });
    });
    out.sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate));
    res.json({ schedule: out });
  } catch (err) { console.error("[pc] GET /people/:id/schedule:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* GET /:id/blockouts — blockout-urile (viitoare) ale persoanei. */
router.get("/:id/blockouts", requireCan("people.view"), async (req, res) => {
  try {
    const personId = OID(req.params.id);
    const today = new Date().toISOString().slice(0, 10);
    const blockouts = await PcBlockout.find(scoped(req, { personId, endDate: { $gte: today } })).sort({ startDate: 1 }).lean();
    const onBreak = blockouts.some((b) => b.type === "churchBlock" && (!b.startDate || b.startDate <= today));
    res.json({
      onBreak,
      blockouts: blockouts.map((b) => ({ id: b._id, startDate: b.startDate, endDate: b.endDate, repeat: b.repeat, reason: b.reason, type: b.type || "personal", label: b.startDate === b.endDate ? b.startDate : `${b.startDate} → ${b.endDate}` })),
    });
  } catch (err) { console.error("[pc] GET /people/:id/blockouts:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* PATCH /:id — editează câmpuri de bază ale persoanei (acum: gen). Pt. filtrarea fată/băiat. */
router.patch("/:id", requireCan("services.schedule"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid." });
    const set = {};
    if (["M", "F", ""].includes(req.body?.gender)) set.gender = req.body.gender;
    if (["available", "onBreak", "suspended"].includes(req.body?.schedulingStatus)) {
      if (!(await can(req, "people.manageBlocks"))) return res.status(403).json({ error: "Nu ai dreptul să modifici blocajele." });
      set.schedulingStatus = req.body.schedulingStatus;
    }
    if (!Object.keys(set).length) return res.status(400).json({ error: "Nimic de salvat." });
    const p = await PcPerson.findOneAndUpdate(scoped(req, { _id: id }), { $set: set }, { new: true }).select("gender schedulingStatus").lean();
    if (!p) return res.status(404).json({ error: "Persoană inexistentă." });
    res.json({ ok: true, gender: p.gender, schedulingStatus: p.schedulingStatus });
  } catch (err) { console.error("[pc] PATCH /people/:id:", err.message); res.status(500).json({ error: "Eroare la salvare." }); }
});

/* POST /:id/church-block — planificatorul marchează persoana „blocată de biserică" (on-break):
   nu mai apare în liste. Default: de azi, pe termen nelimitat. DOAR DB, fără email. */
router.post("/:id/church-block", requireCan("people.manageBlocks"), async (req, res) => {
  try {
    const personId = OID(req.params.id);
    if (!personId) return res.status(400).json({ error: "ID invalid." });
    const today = new Date().toISOString().slice(0, 10);
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    const startDate = DATE_RE.test(req.body?.startDate) ? req.body.startDate : today;
    const endDate = DATE_RE.test(req.body?.endDate) ? req.body.endDate : "2099-12-31";
    if (endDate < startDate) return res.status(400).json({ error: "Data de final e înaintea celei de început." });
    const setBy = (await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean())?._id || null;
    const doc = await PcBlockout.create(stamp(req, { personId, startDate, endDate, allDay: true, repeat: "none", reason: String(req.body?.reason || "").trim(), type: "churchBlock", setByPersonId: setBy }));
    res.status(201).json({ ok: true, id: doc._id });
  } catch (err) { console.error("[pc] POST /people/:id/church-block:", err.message); res.status(500).json({ error: "Eroare la blocaj." }); }
});

/* DELETE /:id/church-block — ridică blocajul de biserică (toate churchBlock active). DOAR DB. */
router.delete("/:id/church-block", requireCan("people.manageBlocks"), async (req, res) => {
  try {
    const personId = OID(req.params.id);
    const today = new Date().toISOString().slice(0, 10);
    const r = await PcBlockout.updateMany(scoped(req, { personId, type: "churchBlock", endDate: { $gte: today } }), { $set: { deletedAt: new Date() } });
    res.json({ ok: true, cleared: r.modifiedCount || 0 });
  } catch (err) { console.error("[pc] DELETE /people/:id/church-block:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* GET /:id/messages — istoric comunicare (unread/received/sent). */
router.get("/:id/messages", requireCan("people.view"), async (req, res) => {
  try {
    const personId = OID(req.params.id);
    const msgs = await PcMessage.find(scoped(req, { personId })).sort({ createdAt: -1 }).limit(200).lean();
    const dto = (m) => ({ id: m._id, subject: m.subject, body: m.body, read: m.read, direction: m.direction, dateLabel: new Date(m.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) });
    res.json({
      unread: msgs.filter((m) => m.direction === "received" && !m.read).map(dto),
      received: msgs.filter((m) => m.direction === "received").map(dto),
      sent: msgs.filter((m) => m.direction === "sent").map(dto),
    });
  } catch (err) { console.error("[pc] GET /people/:id/messages:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* POST /:id/messages/mark-read — marchează toate mesajele primite ca citite. */
router.post("/:id/messages/mark-read", requireCan("people.view"), async (req, res) => {
  try {
    await PcMessage.updateMany(scoped(req, { personId: OID(req.params.id), direction: "received", read: false }), { $set: { read: true } });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] mark-read:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── GET /:id/tags — tag-urile persoanei grupate (My Tags / Edit Tags) ───────── */
router.get("/:id/tags", requireCan("people.view"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid" });
    const person = await PcPerson.findOne(scoped(req, { _id: id })).select("tagIds").lean();
    if (!person) return res.status(404).json({ error: "Persoana nu există" });
    const assigned = (person.tagIds || []).map(String);

    const [groups, tags] = await Promise.all([
      PcTagGroup.find(scoped(req, { domain: "people" })).select("name sortOrder").sort({ sortOrder: 1, name: 1 }).lean(),
      PcTag.find(scoped(req, { domain: "people" })).select("name tagGroupId sortOrder").sort({ sortOrder: 1 }).lean(),
    ]);
    res.json({
      assigned,
      groups: groups.map((g) => ({
        id: g._id,
        name: g.name,
        tags: tags
          .filter((t) => String(t.tagGroupId) === String(g._id))
          .map((t) => ({ id: t._id, name: t.name, assigned: assigned.includes(String(t._id)) })),
      })),
    });
  } catch (err) {
    console.error("[pc] GET /people/:id/tags:", err.message);
    res.status(500).json({ error: "Eroare la încărcarea tag-urilor." });
  }
});

/* ───────── PATCH /:id/tags — setează tag-urile persoanei (asignare/scoatere) ───────── */
router.patch("/:id/tags", requireCan("people.assignTags"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid" });
    const incoming = Array.isArray(req.body?.tagIds) ? req.body.tagIds : [];
    // Validează că tag-urile există în org (domain people).
    const valid = await PcTag.find(scoped(req, { domain: "people", _id: { $in: incoming.map(OID).filter(Boolean) } })).select("_id").lean();
    const tagIds = valid.map((t) => t._id);
    const p = await PcPerson.findOneAndUpdate(scoped(req, { _id: id }), { $set: { tagIds } }, { new: true }).select("tagIds").lean();
    if (!p) return res.status(404).json({ error: "Persoana nu există" });
    res.json({ ok: true, tagIds: (p.tagIds || []).map(String) });
  } catch (err) {
    console.error("[pc] PATCH /people/:id/tags:", err.message);
    res.status(500).json({ error: "Eroare la salvarea tag-urilor." });
  }
});

/* ───────── POST / — creare persoană (wizard Add Person, §9 [ADD-PERSON]) ───────── */
router.post("/", requireCan("people.create"), async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.firstName || !String(b.firstName).trim()) {
      return res.status(400).json({ error: "Prenumele este obligatoriu." });
    }
    // Genul e OBLIGATORIU (ca în PCO la Add Person) — e folosit de regulile de recomandare.
    if (!["M", "F"].includes(b.gender)) {
      return res.status(400).json({ error: "Genul (M/F) este obligatoriu." });
    }
    // Validare email simplă (ca PCO: „invalid formatting").
    const emails = (Array.isArray(b.emails) ? b.emails : []).filter((e) => e && e.address);
    for (const e of emails) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e.address).trim())) {
        return res.status(400).json({ error: `Email invalid: ${e.address}` });
      }
    }
    // 1 biserică → asignăm campusul default dacă nu vine altul.
    const { PcOrg } = require("../models");
    const org = await PcOrg.findById(req.pcOrgId).select("defaultCampusId").lean();
    const doc = {
      firstName: String(b.firstName).trim(),
      lastName: String(b.lastName || "").trim(),
      emails,
      phones: (Array.isArray(b.phones) ? b.phones : []).filter((p) => p && p.number),
      addresses: Array.isArray(b.addresses) ? b.addresses : [],
      gender: ["M", "F"].includes(b.gender) ? b.gender : "",
      programIntent: ["1", "2"].includes(String(b.programIntent)) ? String(b.programIntent) : "",
      birthdate: b.birthdate ? new Date(b.birthdate) : null,
      anniversary: b.anniversary ? new Date(b.anniversary) : null,
      maritalStatus: b.maritalStatus || "",
      child: !!b.child, // Adult/Child din dropdown
      campusId: b.campusId || org?.defaultCampusId || null,
      status: "active",
    };
    // Permisiunea aleasă (Add Person step 2) → accessIntent (persoana n-are login încă).
    if (b.accessIntent && typeof b.accessIntent === "object") {
      doc.accessIntent = {
        peoplePlansLevel: b.accessIntent.peoplePlansLevel || "",
        songLevel: b.accessIntent.songLevel || "",
        mediaLevel: b.accessIntent.mediaLevel || "",
        fileAccess: {
          plan: !!b.accessIntent.fileAccess?.plan,
          song: !!b.accessIntent.fileAccess?.song,
          media: !!b.accessIntent.fileAccess?.media,
        },
      };
    }
    // Unificare cu contul MOBILE (sursa de adevăr): dacă există deja un user în aplicație cu
    // același email, legăm profilul la el (userId) — nu creăm un cont separat. Fără email.
    const primaryEmail = (emails.find((e) => e.primary) || emails[0])?.address;
    if (primaryEmail) {
      try {
        const User = require("../../models/User");
        const u = await User.findOne({ email: String(primaryEmail).toLowerCase(), deletedAt: null }).select("_id").lean();
        if (u) doc.userId = u._id;
      } catch { /* legarea e best-effort */ }
    }
    const person = await PcPerson.create(stamp(req, doc));
    res.status(201).json(toRow(person.toObject()));
  } catch (err) {
    console.error("[pc] POST /people:", err.message);
    res.status(500).json({ error: "Eroare la crearea persoanei." });
  }
});

/* ───────── PATCH /:id/contact — editare contact ───────── */
router.patch("/:id/contact", requireCan("people.editContact"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalid" });
    const { firstName, lastName, emails, phones, addresses, avatar, birthdate, anniversary, gender, maritalStatus, notes } = req.body || {};
    const update = {};
    if (firstName !== undefined) update.firstName = String(firstName).trim();
    if (lastName !== undefined) update.lastName = String(lastName).trim();
    if (Array.isArray(emails)) update.emails = emails;
    if (Array.isArray(phones)) update.phones = phones;
    if (Array.isArray(addresses)) update.addresses = addresses;
    if (avatar !== undefined) update.avatar = avatar;
    if (birthdate !== undefined) update.birthdate = birthdate ? new Date(birthdate) : null;
    if (anniversary !== undefined) update.anniversary = anniversary ? new Date(anniversary) : null;
    if (gender !== undefined) update.gender = String(gender || "");
    if (maritalStatus !== undefined) update.maritalStatus = String(maritalStatus || "");
    if (notes !== undefined) update.notes = String(notes || "");

    const p = await PcPerson.findOneAndUpdate(scoped(req, { _id: id }), { $set: update }, { new: true }).lean();
    if (!p) return res.status(404).json({ error: "Persoana nu există" });
    res.json(toRow(p));
  } catch (err) {
    console.error("[pc] PATCH /people/:id/contact:", err.message);
    res.status(500).json({ error: "Eroare la salvarea contactului." });
  }
});

module.exports = router;
