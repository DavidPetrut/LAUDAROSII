/**
 * Bootstrap + seed Planning Center (§14.4 replicabilitate, §14.5 seed).
 * TOTUL idempotent: rulezi de câte ori vrei, nu dublează nimic.
 * „Biserică nouă" = rulezi ensureBootstrap() → org + campus RO + defaults + tag-uri; apoi migratePeople().
 */
const mongoose = require("mongoose");
const {
  PcOrg,
  PcCampus,
  PcServicesDefaults,
  PcTagGroup,
  PcTag,
} = require("../models");

/** Creează/întoarce org-ul unic + campus RO default + servicesDefaults + tag-uri People. */
async function ensureBootstrap() {
  let org = await PcOrg.findOne({ deletedAt: null }).sort({ createdAt: 1 });
  if (!org) {
    org = await PcOrg.create({
      name: "Vertical București",
      brandLabel: "Planificare",
    });
    console.log("[pc] seed: pc_org creat");
  }

  // Campus principal România (invariant §1.9).
  let campus = await PcCampus.findOne({ orgId: org._id, isMain: true, deletedAt: null });
  if (!campus) {
    campus = await PcCampus.create({
      orgId: org._id,
      name: "București",
      country: "Romania",
      timezone: "Europe/Bucharest",
      timeFormat: "24",
      dateFormat: "DMY",
      isMain: true,
    });
    console.log("[pc] seed: campus RO creat");
  }
  if (String(org.defaultCampusId || "") !== String(campus._id)) {
    org.defaultCampusId = campus._id;
    await org.save();
  }

  // Defaults de permisiuni (toggle-urile §5.7).
  const defaults = await PcServicesDefaults.findOne({ orgId: org._id, deletedAt: null });
  if (!defaults) {
    await PcServicesDefaults.create({ orgId: org._id });
    console.log("[pc] seed: servicesDefaults creat");
  }

  await seedPeopleTags(org._id);
  await ensureDefaultServiceTypes(org._id);
  return org;
}

/** Tipurile de serviciu standard (cerință user). Idempotent — creează doar ce lipsește (după nume). */
const DEFAULT_SERVICE_TYPES = [
  "1. Serviciu Cu Impact Maxim", "2. Tineret", "3. Seara De Partasie", "4. Inchinare Copii Mici",
  "5. Evenimente Speciale", "6. Media", "7. Curatenie Biserica", "8. Rugaciune", "9. Media Tineret",
];
async function ensureDefaultServiceTypes(orgId) {
  const { PcServiceType } = require("../models");
  const { DEFAULT_ITEM_ROW_COLORS } = require("../lib/orderColors");
  let created = 0;
  for (let i = 0; i < DEFAULT_SERVICE_TYPES.length; i++) {
    const name = DEFAULT_SERVICE_TYPES[i];
    const existing = await PcServiceType.findOne({ orgId, name, deletedAt: null }).select("_id").lean();
    if (!existing) {
      await PcServiceType.create({ orgId, name, frequency: "weekly", itemRowColors: DEFAULT_ITEM_ROW_COLORS, sortOrder: i });
      created++;
    }
  }
  if (created) console.log(`[pc] seed: ${created} service types standard create`);
  return created;
}

/** Tag-uri People pt. filtrul din screenshot (Instruments Played / Vocal Part). Idempotent. */
async function seedPeopleTags(orgId) {
  const groups = [
    {
      name: "Instruments Played",
      category: "Audio/Visual",
      tags: ["Acoustic Guitar", "Bass Guitar", "Drums", "Electric Guitar", "Keys", "Organ", "Percussion", "Piano"],
    },
    {
      name: "Vocal Part",
      category: "Audio/Visual",
      tags: ["Alto", "Bass", "Soprano", "Tenor"],
    },
  ];
  for (let g = 0; g < groups.length; g++) {
    const spec = groups[g];
    let group = await PcTagGroup.findOne({ orgId, domain: "people", name: spec.name, deletedAt: null });
    if (!group) {
      group = await PcTagGroup.create({
        orgId,
        name: spec.name,
        domain: "people",
        category: spec.category,
        sortOrder: g,
      });
    }
    for (let t = 0; t < spec.tags.length; t++) {
      const name = spec.tags[t];
      const exists = await PcTag.findOne({ orgId, domain: "people", tagGroupId: group._id, name, deletedAt: null });
      if (!exists) {
        await PcTag.create({ orgId, domain: "people", tagGroupId: group._id, name, sortOrder: t });
      }
    }
  }
}

/** Împarte un nume complet în first/last (ca în Edit Contact: „David-Cristian" / „Petrut (2)"). */
function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "—", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * Migrează userii existenți din `users` în `pc_people` (1:1, idempotent).
 * Nu modifică `users`. Leagă prin pc_people.userId. Rulează după ensureBootstrap.
 */
async function migratePeople() {
  const org = await ensureBootstrap();
  const PcPerson = require("../models/PcPerson");
  // Modelul User existent al app-ului (înregistrat global de mongoose).
  const User = mongoose.models.User || require("../../models/User");

  const users = await User.find({ deletedAt: { $in: [null, undefined] } })
    .select("email personalData role status")
    .lean();

  let created = 0;
  for (const u of users) {
    const existing = await PcPerson.findOne({ orgId: org._id, userId: u._id, deletedAt: null }).select("_id");
    if (existing) continue;
    const { firstName, lastName } = splitName(u.personalData?.fullName || u.email);
    const emails = u.email ? [{ address: u.email, location: "Home", primary: true }] : [];
    const phones = u.personalData?.phone
      ? [{ number: u.personalData.phone, location: "Mobile", primary: true }]
      : [];
    await PcPerson.create({
      orgId: org._id,
      firstName,
      lastName,
      emails,
      phones,
      avatar: u.personalData?.profilePicture || "",
      campusId: org.defaultCampusId,
      status: u.status?.isActive === false ? "inactive" : "active",
      userId: u._id,
    });
    created++;
  }
  console.log(`[pc] migratePeople: ${created} pc_people create (din ${users.length} useri)`);
  return { total: users.length, created };
}

/**
 * Seed demo pt. PREVIEW Plan page (opt-in, idempotent). Creează 1 service type + 1 plan
 * cu order/times/notes/echipă, ca să vezi Plan page populat înainte de „Create a service".
 * `viewerUserId` = userul curent → îl asignăm pe plan ca să apară chip-urile verzi de sus.
 */
async function seedDemoPlan(orgId, viewerUserId) {
  const {
    PcServiceType, PcPlan, PcPlanTime, PcPlanItem, PcPlanNote,
    PcTeam, PcPosition, PcTeamMember, PcAssignment, PcNeededPosition, PcPerson,
  } = require("../models");

  // service type
  let st = await PcServiceType.findOne({ orgId, name: "1. Serviciu Cu Impact Maxim", deletedAt: null });
  if (!st) st = await PcServiceType.create({ orgId, name: "1. Serviciu Cu Impact Maxim", sortOrder: 0 });

  // idempotent: dacă există deja un plan în acest service type, nu dubla
  const existing = await PcPlan.findOne({ orgId, serviceTypeId: st._id, deletedAt: null }).select("_id");
  if (existing) return { planId: existing._id, created: false };

  const base = new Date(); base.setHours(9, 0, 0, 0);
  const plan = await PcPlan.create({ orgId, serviceTypeId: st._id, title: "", sortDate: base });

  // times
  const svc = await PcPlanTime.create({ orgId, planId: plan._id, type: "service", name: "", startsAt: new Date(base), endsAt: new Date(base.getTime() + 60 * 60 * 1000) });
  await PcPlanTime.create({ orgId, planId: plan._id, type: "rehearsal", name: "Band Practice", startsAt: new Date(base.getTime() - 2 * 24 * 3600 * 1000) });
  await PcPlanTime.create({ orgId, planId: plan._id, type: "other", name: "Pre-Service Prayer", startsAt: new Date(base.getTime() - 30 * 60 * 1000), endsAt: new Date(base) });

  // order (secțiuni + itemi)
  const items = [
    { type: "header", title: "ÎNAINTE DE ÎNCEPEREA SERVICIULUI" },
    { type: "item", title: "Verificări", description: "Versuri - afișaj în față și în spate\nSunet filmuleț prezentare serie\nMicrofon vorbitor, microfon host\nStativ potrivit pentru predică" },
    { type: "item", title: "Muzică de fundal - 20 min înainte", description: "Playlist pe Spotify: Înainte și după SIM" },
    { type: "item", title: "Countdown - 5 minute (VERSURI)", description: "La 2 minute maxim, echipa în față, acorduri/pad la pian" },
    { type: "header", title: "ÎNCHINARE PRIN CÂNTARE" },
    { type: "item", title: "Welcome & Chemare la închinare", description: "text biblie pentru motivare la închinare" },
    { type: "song", title: "Cântare #1", keyName: "C" },
  ];
  for (let i = 0; i < items.length; i++) {
    await PcPlanItem.create({ orgId, planId: plan._id, sortOrder: i, duringAll: true, ...items[i] });
  }

  // notes
  await PcPlanNote.create({ orgId, planId: plan._id, categoryName: "MUSIC", content: "Welcome & intro la pian. Trecere lină în prima cântare.", sortOrder: 0 });
  await PcPlanNote.create({ orgId, planId: plan._id, categoryName: "PASSAGES TO USE", content: "Psalm 100\nIoan 4:23-24", sortOrder: 1 });

  // echipă + poziții + asignarea viewerului (chip-urile verzi)
  let team = await PcTeam.findOne({ orgId, name: "Lauda si Inchinare", deletedAt: null });
  if (!team) team = await PcTeam.create({ orgId, name: "Lauda si Inchinare", serviceTypeId: st._id, flags: { rehearsal: true } });
  const mkPos = async (name, order) => {
    let p = await PcPosition.findOne({ orgId, teamId: team._id, name, deletedAt: null });
    if (!p) p = await PcPosition.create({ orgId, teamId: team._id, name, sortOrder: order });
    return p;
  };
  const posGuitar = await mkPos("Chitara acustica", 0);
  const posVocals = await mkPos("Vocalisti", 1);

  const viewer = viewerUserId ? await PcPerson.findOne({ orgId, userId: viewerUserId, deletedAt: null }).select("_id") : null;
  if (viewer) {
    await PcTeamMember.updateOne(
      { orgId, teamId: team._id, personId: viewer._id },
      { $setOnInsert: { orgId, teamId: team._id, personId: viewer._id, isLeader: true } },
      { upsert: true }
    );
    for (const pos of [posGuitar, posVocals]) {
      await PcAssignment.updateOne(
        { orgId, planId: plan._id, positionId: pos._id, personId: viewer._id },
        { $setOnInsert: { orgId, planId: plan._id, teamId: team._id, positionId: pos._id, personId: viewer._id, timeIds: [svc._id], status: "confirmed" } },
        { upsert: true }
      );
    }
  }
  // un gol „Needed"
  await PcNeededPosition.create({ orgId, planId: plan._id, teamId: team._id, positionId: posVocals._id, count: 1 });

  return { planId: plan._id, created: true };
}

module.exports = { ensureBootstrap, seedPeopleTags, migratePeople, splitName, seedDemoPlan, ensureDefaultServiceTypes };
