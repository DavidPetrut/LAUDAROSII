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

  // Dedublare People: pt. fiecare persoană SEED (non-PCO) găsește perechea PCO după email,
  // mută login-ul (userId + accessIntent + avatar + taguri) pe cea reală și șterge duplicatul.
  // Conturile reale care NU au pereche în PCO se PĂSTREAZĂ (au userId). Dry by default; --apply scrie.
  if (has("--dedupe-people")) {
    const apply = has("--apply");
    const norm = (s) => String(s || "").trim().toLowerCase();
    const emailsOf = (p) => (p.emails || []).map((e) => norm(e.address)).filter(Boolean);
    const seed = await M.PcPerson.find({ orgId, remoteSource: { $ne: "pco" } }).lean();
    const pco = await M.PcPerson.find({ orgId, remoteSource: "pco" }).lean();
    // index pco după fiecare email
    const pcoByEmail = new Map();
    for (const p of pco) for (const e of emailsOf(p)) if (!pcoByEmail.has(e)) pcoByEmail.set(e, p);

    const buckets = { moved: [], keptNoMatchAccount: [], deleteJunk: [] };
    for (const s of seed) {
      const match = emailsOf(s).map((e) => pcoByEmail.get(e)).find(Boolean);
      if (match) buckets.moved.push({ s, match });
      else if (s.userId) buckets.keptNoMatchAccount.push(s);
      else buckets.deleteJunk.push(s);
    }
    console.log(`[dedupe] seed=${seed.length} pco=${pco.length}`);
    console.log(`[dedupe] cu pereche PCO (mut login + șterg seed): ${buckets.moved.length}`);
    console.log(`[dedupe]   din care cu userId (login mutat): ${buckets.moved.filter((x) => x.s.userId).length}`);
    console.log(`[dedupe] fără pereche DAR cont real (PĂSTRAT): ${buckets.keptNoMatchAccount.length}`);
    if (buckets.keptNoMatchAccount.length) console.log(`[dedupe]   păstrați:`, buckets.keptNoMatchAccount.map((p) => `${p.firstName} ${p.lastName}`.trim() || emailsOf(p)[0]).join(", "));
    console.log(`[dedupe] fără pereche și fără login (șterg ca junk): ${buckets.deleteJunk.length}`);
    if (buckets.deleteJunk.length) console.log(`[dedupe]   junk:`, buckets.deleteJunk.map((p) => `${p.firstName || ""} ${p.lastName || ""}`.trim() || emailsOf(p)[0] || "(gol)").slice(0, 60).join(" | "));

    if (!apply) { console.log("[dedupe] DRY — rulează cu --apply pt. a executa."); await mongoose.disconnect(); return; }

    let moved = 0, deleted = 0;
    for (const { s, match } of buckets.moved) {
      const upd = {};
      if (s.userId && !match.userId) upd.userId = s.userId;
      if (!match.avatar && s.avatar) upd.avatar = s.avatar;
      const hasIntent = s.accessIntent && Object.values(s.accessIntent).some((v) => v && (typeof v !== "object" ? true : Object.values(v).some(Boolean)));
      if (hasIntent) upd.accessIntent = s.accessIntent;
      if ((s.tagIds || []).length) upd.tagIds = Array.from(new Set([...(match.tagIds || []).map(String), ...s.tagIds.map(String)]));
      if (Object.keys(upd).length) await M.PcPerson.updateOne({ _id: match._id }, { $set: upd });
      await M.PcPerson.deleteOne({ _id: s._id });
      moved++;
    }
    for (const s of buckets.deleteJunk) { await M.PcPerson.deleteOne({ _id: s._id }); deleted++; }
    console.log(`[dedupe] APLICAT: ${moved} mutate+șterse, ${deleted} junk șterse, ${buckets.keptNoMatchAccount.length} conturi păstrate.`);
    console.log(`[dedupe] People acum:`, await M.PcPerson.countDocuments({ orgId }), "| cu login:", await M.PcPerson.countDocuments({ orgId, userId: { $ne: null } }));
    await mongoose.disconnect();
    return;
  }

  // ───────── Manifest-backup Songs (plasă de siguranță, read-only) ─────────
  //   --manifest   → scrie <server>/planning-center/backups/songs-manifest-<ts>.{json,csv}
  if (has("--manifest")) {
    const path = require("path");
    const { buildManifest } = require("./manifest");
    const outDir = path.join(__dirname, "..", "..", "backups");
    await buildManifest({ orgId, outDir });
    await mongoose.disconnect();
    return;
  }

  // ───────── Import SONGS (felia muzicală): structură + ChordPro + Words + fișiere (rehost Cloudinary) ─────────
  //   --songs            → DRY (numără, nu scrie; estimează volumul de fișiere)
  //   --songs --run      → SCRIE structura + descarcă fișierele reale (dacă NU dai --no-files)
  //   --songs --run --no-files → doar structura + linkuri (fără descărcarea celor ~GB)
  //   --limit N          → doar primele N melodii (validare)
  if (has("--songs")) {
    const dryRun = !has("--run");
    const withFiles = !has("--no-files");
    const limit = Number(arg("--limit")) || 0;
    if (!process.env.PCO_APP_ID || !process.env.PCO_SECRET) { console.error("Lipsesc PCO_APP_ID/PCO_SECRET în env."); await mongoose.disconnect(); process.exit(1); }
    const { PcoClient } = require("./client");
    const { SongsImporter } = require("./songs");
    const client = new PcoClient({ appId: process.env.PCO_APP_ID, secret: process.env.PCO_SECRET });
    const songsBefore = await M.PcSong.countDocuments({ orgId });
    const pcoBefore = await M.PcSong.countDocuments({ orgId, remoteSource: "pco" });
    console.log(`[cli] songs ÎNAINTE: ${songsBefore} (pco: ${pcoBefore}) | dryRun=${dryRun} withFiles=${withFiles} limit=${limit || "all"}`);
    const t0 = Date.now();
    const rep = await new SongsImporter({ client, orgId, dryRun, withFiles, limit }).run();
    console.log(`[cli] songs gata în ${Math.round((Date.now() - t0) / 1000)}s. raport:`, JSON.stringify(rep, null, 2));
    const after = {
      songs: await M.PcSong.countDocuments({ orgId }), pco: await M.PcSong.countDocuments({ orgId, remoteSource: "pco" }),
      arrangements: await M.PcArrangement.countDocuments({ orgId }), keys: await M.PcKey.countDocuments({ orgId }),
      files: await M.PcSongFile.countDocuments({ orgId }),
    };
    console.log(`[cli] songs DUPĂ:`, JSON.stringify(after));
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
