#!/usr/bin/env node
/**
 * CLI migrare PCO → pc_ (one-time, reutilizabil pt. ORICE biserică cu PCO).
 * Rulează DIN directorul `server/`:
 *   node planning-center/services/pcoImport/cli.js --resolve   # citește: org + counts (rapid, fără PCO)
 *   node planning-center/services/pcoImport/cli.js --dry       # trage din PCO și numără (fără scriere)
 *   node planning-center/services/pcoImport/cli.js --run       # SCRIE în DB (import real, idempotent)
 *   ... --org <orgId>                                          # țintește un org anume (altfel primul PcOrg)
 * Credențiale PCO din env: PCO_APP_ID + PCO_SECRET. DB din env: MONGODB_URI.
 */
require("dotenv").config();
const mongoose = require("mongoose");

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }
const has = (f) => process.argv.includes(f);

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("Lipsește MONGODB_URI în env."); process.exit(1); }
  const dbName = (uri.split("/").pop() || "").split("?")[0];
  console.log(`[cli] conectare DB „${dbName}"…`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  console.log("[cli] conectat.");

  const M = require("../../models");
  let orgId = arg("--org");
  if (!orgId) {
    const org = await M.PcOrg.findOne({}).select("_id name").lean();
    if (!org) { console.error("Niciun PcOrg în DB. Creează organizația întâi."); await mongoose.disconnect(); process.exit(1); }
    orgId = String(org._id);
    console.log(`[cli] org: „${org.name}" (${orgId})`);
  }

  const counts = async () => {
    const pairs = { People: M.PcPerson, ServiceTypes: M.PcServiceType, Teams: M.PcTeam, Positions: M.PcPosition, Plans: M.PcPlan, Assignments: M.PcAssignment, Needed: M.PcNeededPosition, Blockouts: M.PcBlockout };
    const out = {};
    for (const [k, Model] of Object.entries(pairs)) {
      const total = await Model.countDocuments({ orgId });
      const pco = await Model.countDocuments({ orgId, remoteSource: "pco" });
      out[k] = `${total} (pco: ${pco})`;
    }
    return out;
  };

  if (has("--resolve")) {
    console.log("[cli] counts:", JSON.stringify(await counts(), null, 2));
    await mongoose.disconnect();
    return;
  }

  // Șterge datele SEED (non-PCO) de Services pt. acest org, ca să rămână doar importul real.
  // NU atinge oamenii (PcPerson) — au legătura de autentificare (userId).
  if (has("--clean-seed")) {
    const filter = { orgId, remoteSource: { $ne: "pco" } };
    const targets = { ServiceTypes: M.PcServiceType, Teams: M.PcTeam, Positions: M.PcPosition, Plans: M.PcPlan, PlanTimes: M.PcPlanTime, Assignments: M.PcAssignment, Needed: M.PcNeededPosition, PlanNotes: M.PcPlanNote };
    const out = {};
    for (const [k, Model] of Object.entries(targets)) {
      const r = await Model.deleteMany(filter);
      out[k] = r.deletedCount || 0;
    }
    console.log("[cli] seed Services șters (non-PCO):", JSON.stringify(out));
    console.log("[cli] counts după:", JSON.stringify(await counts(), null, 2));
    await mongoose.disconnect();
    return;
  }

  const dryRun = !has("--run");
  console.log(`[cli] ÎNAINTE:`, JSON.stringify(await counts()));
  const { runImport } = require("./index");
  const t0 = Date.now();
  const report = await runImport({ orgId, dryRun });
  console.log(`[cli] gata în ${Math.round((Date.now() - t0) / 1000)}s. raport:`, JSON.stringify(report, null, 2));
  console.log(`[cli] DUPĂ:`, JSON.stringify(await counts()));
  await mongoose.disconnect();
})().catch((e) => { console.error("[cli] EROARE:", e.message); process.exit(2); });
