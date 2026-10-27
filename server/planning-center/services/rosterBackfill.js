/**
 * rosterBackfill — construiește rosterul (pc_teamMembers) din asignările REALE existente.
 * „Cine slujește pe poziția X" = oricine a fost asignat acolo. Îl punem ca apartenență persistentă
 * (PcTeamMember.positionIds), editabilă apoi din People. One-time, idempotent.
 *
 *   node server/planning-center/services/rosterBackfill.js --dry
 *   node server/planning-center/services/rosterBackfill.js --run
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const has = (f) => process.argv.includes(f);

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("Lipsește MONGODB_URI."); process.exit(1); }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const { PcAssignment, PcTeamMember } = require("../models");

  // distinct (person, team, position) din asignări ne-șterse, ne-guest
  const assigns = await PcAssignment.find({ deletedAt: null, isGuest: { $ne: true }, positionId: { $ne: null } })
    .select("orgId personId teamId positionId").lean();

  // grupăm pe (org|team|person) → set de poziții
  const byKey = {};
  for (const a of assigns) {
    if (!a.orgId || !a.teamId || !a.personId) continue;
    const k = `${a.orgId}|${a.teamId}|${a.personId}`;
    (byKey[k] = byKey[k] || { orgId: a.orgId, teamId: a.teamId, personId: a.personId, pos: new Set() }).pos.add(String(a.positionId));
  }
  const groups = Object.values(byKey);
  console.log(`Asignări: ${assigns.length} | perechi (team,person): ${groups.length}`);

  if (has("--run")) {
    let created = 0, updated = 0;
    for (const g of groups) {
      const posIds = [...g.pos].map((id) => new mongoose.Types.ObjectId(id));
      const existing = await PcTeamMember.findOne({ orgId: g.orgId, teamId: g.teamId, personId: g.personId });
      if (existing) {
        const have = new Set((existing.positionIds || []).map(String));
        const merged = [...have, ...posIds.map(String)];
        const uniq = [...new Set(merged)].map((id) => new mongoose.Types.ObjectId(id));
        if (uniq.length !== have.size) { existing.positionIds = uniq; await existing.save(); updated++; }
      } else {
        await PcTeamMember.create({ orgId: g.orgId, teamId: g.teamId, personId: g.personId, positionIds: posIds });
        created++;
      }
    }
    console.log(`Roster scris: ${created} create, ${updated} actualizate.`);
  } else {
    console.log("DRY-RUN — nimic scris. Rulează cu --run.");
  }
  await mongoose.disconnect(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
