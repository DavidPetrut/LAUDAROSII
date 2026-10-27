#!/usr/bin/env node
/**
 * CLI backfill — leagă conturile MOBILE existente (`users`) de PC People (`pc_people`), ONE-TIME.
 * Idempotent: potrivește pe userId → email → nume; NU creează dubluri (overwrite la cei existenți).
 * Userii soft-deletați → pc_person soft-deletat. Fără PCO online, fără emailuri.
 *
 * Rulează DIN directorul `server/`:
 *   node planning-center/services/peopleSyncCli.js --dry    # doar numără ce AR face (fără scriere)
 *   node planning-center/services/peopleSyncCli.js --run    # SCRIE (leagă/overwrite/soft-delete)
 *   ... --org <orgId>                                       # țintește un org anume (altfel primul PcOrg)
 */
require("dotenv").config();
const mongoose = require("mongoose");

const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const has = (f) => process.argv.includes(f);

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("Lipsește MONGODB_URI în env."); process.exit(1); }
  const dbName = (uri.split("/").pop() || "").split("?")[0];
  console.log(`[sync] conectare DB „${dbName}"…`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  console.log("[sync] conectat.");

  const { PcPerson } = require("../models");
  const User = require("../../models/User");
  const { resolveOrgId, clearOrgCache } = require("../core/orgScope");
  const { syncPersonFromUser, removePersonForUser, splitName, norm } = require("./peopleSync");

  let orgId = arg("--org");
  if (!orgId) { clearOrgCache(); orgId = String(await resolveOrgId()); }
  console.log(`[sync] org: ${orgId}`);

  const users = await User.find({}).select("email personalData deletedAt").lean();
  const active = users.filter((u) => !u.deletedAt);
  const deleted = users.filter((u) => u.deletedAt);
  console.log(`[sync] useri: ${users.length} (activi ${active.length}, șterși ${deleted.length})`);

  if (has("--dry")) {
    let wouldLink = 0, wouldCreate = 0;
    for (const u of active) {
      const email = String(u.email || "").trim().toLowerCase();
      const byId = await PcPerson.findOne({ orgId, userId: u._id }).select("_id").lean();
      const byEmail = !byId && email ? await PcPerson.findOne({ orgId, deletedAt: null, "emails.address": email }).select("_id").lean() : null;
      let byName = null;
      if (!byId && !byEmail) {
        const { firstName, lastName } = splitName(u.personalData?.fullName);
        if (firstName) {
          const cands = await PcPerson.find({ orgId, deletedAt: null, userId: null }).select("firstName lastName").lean();
          const t = norm(`${firstName} ${lastName}`);
          byName = cands.find((c) => norm(`${c.firstName || ""} ${c.lastName || ""}`) === t) || null;
        }
      }
      if (byId || byEmail || byName) wouldLink++; else wouldCreate++;
    }
    console.log(`[sync][DRY] ar lega/overwrite: ${wouldLink} · ar crea noi: ${wouldCreate} · ar soft-delete: ${deleted.length}`);
    console.log("[sync][DRY] nimic scris. Rulează cu --run ca să aplici.");
    await mongoose.disconnect(); process.exit(0);
  }

  if (!has("--run")) { console.error("Folosește --dry (preview) sau --run (scrie)."); await mongoose.disconnect(); process.exit(1); }

  let created = 0, linked = 0, removed = 0;
  for (const u of active) {
    const before = await PcPerson.findOne({ orgId, userId: u._id }).select("_id").lean();
    const p = await syncPersonFromUser(u, { orgId });
    if (p) { before ? linked++ : created++; }
  }
  for (const u of deleted) { const r = await removePersonForUser(u._id, { orgId }); if (r) removed++; }

  console.log(`[sync][RUN] creați: ${created} · legați/overwrite: ${linked} · soft-deletați: ${removed}`);
  console.log("[sync] gata.");
  await mongoose.disconnect(); process.exit(0);
})().catch((e) => { console.error("[sync] eroare:", e.message); process.exit(1); });
