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
  return org;
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

module.exports = { ensureBootstrap, seedPeopleTags, migratePeople, splitName };
