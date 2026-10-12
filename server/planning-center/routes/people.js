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
} = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { can, requireCan, resolveEffective } = require("../core/permissions");

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
  return {
    id: p._id,
    firstName: p.firstName,
    lastName: p.lastName,
    fullName: [p.firstName, p.lastName].filter(Boolean).join(" ").trim(),
    avatar: p.avatar || "",
    initials: initials(p.firstName, p.lastName),
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
        exportCsv: await can(req, "people.exportCsv"),
        import: await can(req, "people.import"),
        managePermissions: await can(req, "people.managePermissions"),
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
        .select("firstName lastName avatar")
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
      gender: p.gender,
      child: p.child,
      teamsCount,
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
router.get("/:id/schedule", requireCan("people.view"), async (req, res) => {
  // Alimentat la Services core (pc_assignments). Acum gol.
  res.json({ schedule: [] });
});
router.get("/:id/blockouts", requireCan("people.view"), async (req, res) => {
  // Alimentat la Scheduling (pc_blockouts). Acum gol.
  res.json({ blockouts: [] });
});
router.get("/:id/messages", requireCan("people.view"), async (req, res) => {
  // Alimentat la Comunicare (pc_commHistory). Acum gol.
  res.json({ unread: [], received: [], sent: [] });
});

/* ───────── POST / — creare persoană ───────── */
router.post("/", requireCan("people.create"), async (req, res) => {
  try {
    const { firstName, lastName = "", emails = [], phones = [] } = req.body || {};
    if (!firstName || !String(firstName).trim()) {
      return res.status(400).json({ error: "Prenumele este obligatoriu." });
    }
    const person = await PcPerson.create(
      stamp(req, {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        emails: Array.isArray(emails) ? emails : [],
        phones: Array.isArray(phones) ? phones : [],
        status: "active",
      })
    );
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
    const { firstName, lastName, emails, phones, addresses, avatar } = req.body || {};
    const update = {};
    if (firstName !== undefined) update.firstName = String(firstName).trim();
    if (lastName !== undefined) update.lastName = String(lastName).trim();
    if (Array.isArray(emails)) update.emails = emails;
    if (Array.isArray(phones)) update.phones = phones;
    if (Array.isArray(addresses)) update.addresses = addresses;
    if (avatar !== undefined) update.avatar = avatar;

    const p = await PcPerson.findOneAndUpdate(scoped(req, { _id: id }), { $set: update }, { new: true }).lean();
    if (!p) return res.status(404).json({ error: "Persoana nu există" });
    res.json(toRow(p));
  } catch (err) {
    console.error("[pc] PATCH /people/:id/contact:", err.message);
    res.status(500).json({ error: "Eroare la salvarea contactului." });
  }
});

module.exports = router;
