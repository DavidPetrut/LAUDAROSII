/**
 * /api/pc/v1/whatsapp — sincronizarea grupurilor WhatsApp cu Matrix-ul.
 * 1 grup permanent per lucrare; rotim membrii ca să reflecte oamenii săptămânii curente.
 * Puntea (Baileys) rulează LOCAL (flag WHATSAPP_BRIDGE=1); pe Render rutele care au nevoie de ea
 * întorc „bridge offline". Acțiunile pe oameni reali se fac DOAR pe trigger uman (sync/confirm). ZERO email.
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcServiceType, PcTeam, PcPlan, PcPosition, PcAssignment, PcPerson, PcWhatsappGroup, PcWhatsappLucrare,
} = require("../models");
const { scoped, resolveOrgId } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");
const bridge = require("../whatsapp/bridge");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);
const CAN = requireCan("whatsapp.manage");
const bridgeEnabled = () => process.env.WHATSAPP_BRIDGE === "1";
const fmtDay = (d) => (d ? new Intl.DateTimeFormat("ro-RO", { weekday: "short", day: "numeric", month: "short" }).format(new Date(d)) : "");
const RO_MON = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "noi", "dec"];
const roShort = (d) => { const x = new Date(d); return `${x.getDate()} ${RO_MON[x.getMonth()]}`; }; // „1 noi"
// nume grup = {prefix ales de user} - {dată} - {lider}. NU ne bazăm pe numele curent de WhatsApp (variază/e confuz).
const buildGroupName = (prefix, dateShort, leaderName, teamName) =>
  [String(prefix || "").trim() || String(teamName || "").trim(), dateShort, leaderName].filter(Boolean).join(" - ").slice(0, 100);
const primaryPhone = (p) => {
  const list = p?.phones || [];
  const pick = list.find((x) => x.primary && x.number) || list.find((x) => x.location === "Mobile" && x.number) || list.find((x) => x.number);
  return pick?.number || "";
};

/** Săptămânile (planuri viitoare) în care ECHIPA chiar slujește (are asignări), ordonate. Offset-ul indexează asta. */
async function teamServingSlots(req, team) {
  const stOids = [...new Set([team.serviceTypeId, ...(team.serviceTypeIds || [])].filter(Boolean).map(String))].map(OID).filter(Boolean);
  if (!stOids.length) return [];
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const upPlans = await PcPlan.find(scoped(req, { serviceTypeId: { $in: stOids }, sortDate: { $gte: todayStart } })).sort({ sortDate: 1 }).limit(60).select("sortDate").lean();
  if (!upPlans.length) return [];
  const upIds = upPlans.map((p) => p._id);
  const servingIds = new Set((await PcAssignment.distinct("planId", scoped(req, { teamId: team._id, planId: { $in: upIds }, status: { $ne: "declined" } }))).map(String));
  const serving = upPlans.filter((p) => servingIds.has(String(p._id)));
  return serving.length ? serving : upPlans; // fallback dacă planificarea nu e făcută încă
}

/** Planurile (datele) tipului de serviciu, fiecare cu ordinalul în LUNA lui (p.ord: 1 = prima slujire a lunii). */
async function monthlyPlans(req, team) {
  const stOids = [...new Set([team.serviceTypeId, ...(team.serviceTypeIds || [])].filter(Boolean).map(String))].map(OID).filter(Boolean);
  if (!stOids.length) return [];
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);   // începutul lunii curente
  const end = new Date(start); end.setMonth(end.getMonth() + 5);            // ~5 luni înainte
  const plans = await PcPlan.find(scoped(req, { serviceTypeId: { $in: stOids }, sortDate: { $gte: start, $lt: end } })).sort({ sortDate: 1 }).select("sortDate").lean();
  const perMonth = {};
  plans.forEach((p) => { const d = new Date(p.sortDate); const k = `${d.getFullYear()}-${d.getMonth()}`; perMonth[k] = (perMonth[k] || 0) + 1; p.ord = perMonth[k]; });
  return plans;
}

/** Cine trebuie în grup = oamenii ECHIPEI pe a `weekOfMonth`-a slujire din lună (ancoră STABILĂ prin rotație). */
async function weekTarget(req, mapping) {
  const empty = { weekLabel: "", weekShort: "", leaderName: "", teamName: "", planIds: [], people: [], numbers: [], missingPhone: [], emptyMatrix: true };
  if (!mapping.teamId) return empty;
  const team = await PcTeam.findOne(scoped(req, { _id: mapping.teamId })).select("name serviceTypeId serviceTypeIds ministryGroup").lean();
  if (!team) return empty;
  const N = Math.min(5, Math.max(1, mapping.weekOfMonth || 1));
  const plans = await monthlyPlans(req, team);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const target = plans.find((p) => p.ord === N && new Date(p.sortDate) >= todayStart); // prima a N-a slujire din lună, de azi înainte
  if (!target) return { ...empty, teamName: team.name };
  const ds = new Date(target.sortDate); ds.setHours(0, 0, 0, 0);
  const assigns = await PcAssignment.find(scoped(req, { planId: target._id, teamId: team._id, status: { $ne: "declined" } })).select("personId positionId").lean();
  const personIds = [...new Set(assigns.map((a) => String(a.personId)))];
  const positions = await PcPosition.find(scoped(req, { _id: { $in: [...new Set(assigns.map((a) => a.positionId).filter(Boolean))] } })).select("name").lean();
  const posName = Object.fromEntries(positions.map((p) => [String(p._id), p.name || ""]));
  const people = await PcPerson.find(scoped(req, { _id: { $in: personIds.map(OID).filter(Boolean) } })).select("firstName lastName phones").lean();
  const nameById = Object.fromEntries(people.map((p) => [String(p._id), [p.firstName, p.lastName].filter(Boolean).join(" ")]));

  // LIDER pt. nume: dacă maparea are o poziție-lider setată → cine e pe EA; altfel fallback pe regex „Lider...".
  let leaderA = null;
  if (mapping.leaderPositionId) leaderA = assigns.find((a) => String(a.positionId) === String(mapping.leaderPositionId));
  if (!leaderA) {
    const isLeaderPos = (n = "") => /lider|lead/i.test(n) && !/asist/i.test(n);
    leaderA = assigns.find((a) => a.positionId && isLeaderPos(posName[String(a.positionId)]));
  }
  const leaderName = leaderA ? (nameById[String(leaderA.personId)] || "") : "";

  const out = [], numbers = [], missingPhone = [];
  people.forEach((p) => {
    const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
    const number = primaryPhone(p);
    const normalized = number ? bridge.normalizeNumber(number) : null;
    if (normalized) { numbers.push(normalized); out.push({ id: p._id, name, number, normalized }); }
    else missingPhone.push(name);
  });
  return { weekLabel: fmtDay(ds), weekShort: roShort(ds), leaderName, teamName: team.name, planIds: [target._id], people: out, numbers: [...new Set(numbers)], missingPhone, emptyMatrix: personIds.length === 0 };
}

/** Construiește obiectul de salvare al unei mapări (reutilizat de /map și /map/bulk). */
async function buildMapSet(req, b) {
  const team = await PcTeam.findOne(scoped(req, { _id: OID(b.teamId) })).select("ministryGroup").lean();
  return {
    jid: String(b.jid), nameCached: b.nameCached || "",
    teamId: OID(b.teamId), weekOfMonth: Math.min(5, Math.max(1, parseInt(b.weekOfMonth, 10) || 1)),
    lucrareId: b.lucrareId ? OID(b.lucrareId) : null,
    ministryGroup: team?.ministryGroup || "",
    namePrefix: String(b.namePrefix || "").slice(0, 60),
    leaderPositionId: b.leaderPositionId ? OID(b.leaderPositionId) : null,
    communityJid: String(b.communityJid || ""),
    botNumber: b.botNumber ? bridge.normalizeNumber(b.botNumber) : "",
    mode: ["auto", "manual", "semi"].includes(b.mode) ? b.mode : "semi", enabled: b.enabled !== false,
    deletedAt: null, // revive o mapare ștearsă anterior cu același jid (indexul unic e pe {orgId, jid})
  };
}

/** Migrare lazy: mapările fără lucrareId → creează câte o lucrare (pe ministryGroup) și le leagă. Idempotent. */
async function ensureLucrari(req) {
  const orphans = await PcWhatsappGroup.find(scoped(req, { lucrareId: null })).lean();
  if (!orphans.length) return;
  const byKey = {};
  orphans.forEach((m) => { const k = m.ministryGroup || "__none__"; (byKey[k] = byKey[k] || []).push(m); });
  for (const k of Object.keys(byKey)) {
    const grp = byKey[k];
    const lucrare = await PcWhatsappLucrare.create({ orgId: req.pcOrgId, name: k === "__none__" ? "Fără nume" : k, botNumber: grp.find((m) => m.botNumber)?.botNumber || "" });
    await PcWhatsappGroup.updateMany(scoped(req, { _id: { $in: grp.map((m) => m._id) } }), { $set: { lucrareId: lucrare._id } });
  }
}

/** Sincronizează O mapare: aplică Matrix→grup + redenumește. `forceWeekOfMonth` suprascrie săptămâna (pt. „seed pe săptămână"). */
async function syncOne(req, m, forceWeekOfMonth) {
  if (!bridge.status(m.botNumber).connected) return { jid: m.jid, name: m.nameCached, skipped: "not-connected" };
  const mm = (forceWeekOfMonth != null) ? { ...m, weekOfMonth: forceWeekOfMonth } : m;
  const t = await weekTarget(req, mm);
  const result = await bridge.syncGroup(m.botNumber, m.jid, t.numbers);
  let renamed = "";
  if (t.people.length) { // nu rebotezăm pe Matrix gol (am pierde liderul/data din nume)
    try { renamed = await bridge.renameGroup(m.botNumber, m.jid, buildGroupName(m.namePrefix, t.weekShort, t.leaderName, t.teamName)); } catch {}
  }
  await PcWhatsappGroup.updateOne(scoped(req, { _id: m._id }), { $set: { lastSyncAt: new Date(), nameCached: renamed || m.nameCached } });
  return { jid: m.jid, name: renamed || m.nameCached, weekLabel: t.weekLabel, leaderName: t.leaderName, renamed, emptyMatrix: t.emptyMatrix, missingPhone: t.missingPhone, ...result };
}

/* ───────── STATUS / PAIRING (multi-număr) ───────── */
router.get("/status", CAN, async (req, res) => {
  res.json({ accounts: bridge.statuses(), bridgeEnabled: bridgeEnabled() });
});
router.post("/connect", CAN, async (req, res) => {
  if (!bridgeEnabled()) return res.status(409).json({ error: "Puntea rulează doar local (WHATSAPP_BRIDGE=1)." });
  try { const r = await bridge.connectNew(); res.json({ ...r, accounts: bridge.statuses(), bridgeEnabled: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post("/connect/:number", CAN, async (req, res) => {
  if (!bridgeEnabled()) return res.status(409).json({ error: "Puntea rulează doar local (WHATSAPP_BRIDGE=1)." });
  try { await bridge.reconnect(req.params.number); res.json({ accounts: bridge.statuses(), bridgeEnabled: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post("/logout/:number", CAN, async (req, res) => {
  try { await bridge.logout(req.params.number); res.json({ accounts: bridge.statuses(), bridgeEnabled: bridgeEnabled() }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// scoate un cont neconectat (pairing pornit din greșeală) după sessionId
router.post("/account/remove", CAN, async (req, res) => {
  try { await bridge.removeAccount(String(req.body?.sessionId || "")); res.json({ accounts: bridge.statuses(), bridgeEnabled: bridgeEnabled() }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* ───────── GRUPURI REALE (de pe un număr-robot) ───────── */
router.get("/groups", CAN, async (req, res) => {
  try { res.json({ groups: await bridge.listGroups(req.query.number) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* ───────── ECHIPE + săptămânile lor (pt. picker: echipă + a câta săptămână) ───────── */
router.get("/teams", CAN, async (req, res) => {
  const teams = await PcTeam.find(scoped(req, { archived: { $ne: true } })).select("name ministryGroup sortOrder").sort({ ministryGroup: 1, sortOrder: 1 }).lean();
  res.json({ teams: teams.map((t) => ({ id: t._id, name: t.name, ministryGroup: t.ministryGroup || "" })) });
});
router.get("/team/:id/weeks", CAN, async (req, res) => {
  const team = await PcTeam.findOne(scoped(req, { _id: OID(req.params.id) })).select("name serviceTypeId serviceTypeIds").lean();
  if (!team) return res.json({ weeks: [] });
  const plans = await monthlyPlans(req, team);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const nextByOrd = {}; // a câta slujire din lună → următoarea dată (exemplu), de azi înainte
  plans.forEach((p) => { if (new Date(p.sortDate) >= todayStart && !nextByOrd[p.ord]) nextByOrd[p.ord] = p.sortDate; });
  const weeks = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: nextByOrd[n] ? `Săptămâna ${n} (ex. ${roShort(nextByOrd[n])})` : `Săptămâna ${n}` }));
  res.json({ weeks });
});
// pozițiile echipei — pt. picker-ul de lider („#" → cine e pe poziția asta devine liderul din nume)
router.get("/team/:id/positions", CAN, async (req, res) => {
  const positions = await PcPosition.find(scoped(req, { teamId: OID(req.params.id) })).sort({ sortOrder: 1 }).select("name").lean();
  res.json({ positions: positions.map((p) => ({ id: p._id, name: p.name })) });
});
// preview-țintă FĂRĂ mapare (la configurare): câți oameni din Matrix + liderul real pe (echipă + săptămână).
router.get("/target-preview", CAN, async (req, res) => {
  try {
    const { teamId, weekOfMonth, leaderPositionId } = req.query;
    if (!teamId) return res.json({ people: 0, emptyMatrix: true });
    const t = await weekTarget(req, { teamId: OID(teamId), weekOfMonth: parseInt(weekOfMonth, 10) || 1, leaderPositionId: leaderPositionId ? OID(leaderPositionId) : null });
    res.json({ people: t.people.length, withPhone: t.numbers.length, weekShort: t.weekShort, weekLabel: t.weekLabel, leaderName: t.leaderName, emptyMatrix: t.emptyMatrix, missingPhone: t.missingPhone });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ───────── LUCRĂRI (CRUD container) ───────── */
router.get("/lucrari", CAN, async (req, res) => {
  try {
    await ensureLucrari(req);
    const lucrari = await PcWhatsappLucrare.find(scoped(req, {})).sort({ sortOrder: 1, name: 1 }).lean();
    const maps = await PcWhatsappGroup.find(scoped(req, {})).select("lucrareId jid").lean();
    const byLuc = {};
    maps.forEach((m) => { const k = String(m.lucrareId || ""); (byLuc[k] = byLuc[k] || []).push(m.jid); });
    res.json({ lucrari: lucrari.map((l) => ({ ...l, count: (byLuc[String(l._id)] || []).length })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post("/lucrare", CAN, async (req, res) => {
  try {
    const b = req.body || {};
    const doc = await PcWhatsappLucrare.create({ orgId: req.pcOrgId, name: String(b.name || "").slice(0, 80), image: String(b.image || "").slice(0, 2000000), botNumber: b.botNumber ? bridge.normalizeNumber(b.botNumber) : "" });
    res.json({ lucrare: doc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.put("/lucrare/:id", CAN, async (req, res) => {
  try {
    const b = req.body || {};
    const set = {};
    if (b.name != null) set.name = String(b.name).slice(0, 80);
    if (b.image != null) set.image = String(b.image).slice(0, 2000000);
    if (b.botNumber != null) set.botNumber = b.botNumber ? bridge.normalizeNumber(b.botNumber) : "";
    // VALIDARE la schimbarea numărului: noul număr trebuie să fie conectat ȘI admin în TOATE grupurile lucrării.
    const cur = await PcWhatsappLucrare.findOne(scoped(req, { _id: OID(req.params.id) })).select("botNumber").lean();
    if (set.botNumber !== undefined && set.botNumber && set.botNumber !== (cur?.botNumber || "")) {
      if (!bridge.status(set.botNumber).connected) return res.status(409).json({ error: "Numărul nou nu e conectat. Conectează-l întâi (scanează QR)." });
      const lmaps = await PcWhatsappGroup.find(scoped(req, { lucrareId: OID(req.params.id) })).select("jid nameCached").lean();
      if (lmaps.length) {
        const live = await bridge.listGroups(set.botNumber);
        const byJid = Object.fromEntries(live.map((g) => [g.jid, g]));
        const bad = lmaps.filter((m) => !byJid[m.jid] || !byJid[m.jid].isAdmin);
        if (bad.length) return res.status(409).json({ error: `Numărul nou nu e admin / nu e în ${bad.length} grup(uri): ${bad.map((m) => m.nameCached || m.jid).join(", ")}. Nu am mutat nimic — adaugă-l întâi ca admin în ele.`, issues: bad.map((m) => m.nameCached || m.jid) });
      }
    }
    await PcWhatsappLucrare.updateOne(scoped(req, { _id: OID(req.params.id) }), { $set: set });
    if (set.botNumber !== undefined) await PcWhatsappGroup.updateMany(scoped(req, { lucrareId: OID(req.params.id) }), { $set: { botNumber: set.botNumber } }); // cascadează pe grupuri (doar după validare)
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// verifică dacă un număr poate prelua lucrarea (e în grupurile ei + admin) — pt. UI, înainte de mutare
router.get("/lucrare/:id/check", CAN, async (req, res) => {
  try {
    const number = req.query.number;
    if (!number) return res.json({ ok: false, connected: false, groups: [] });
    if (!bridge.status(number).connected) return res.json({ ok: false, connected: false, groups: [] });
    const lmaps = await PcWhatsappGroup.find(scoped(req, { lucrareId: OID(req.params.id) })).select("jid nameCached").lean();
    const live = await bridge.listGroups(number);
    const byJid = Object.fromEntries(live.map((g) => [g.jid, g]));
    const groups = lmaps.map((m) => { const g = byJid[m.jid]; return { jid: m.jid, name: m.nameCached || m.jid, inGroup: !!g, isAdmin: !!g?.isAdmin, ok: !!g && !!g.isAdmin }; });
    res.json({ ok: groups.every((g) => g.ok), connected: true, groups });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete("/lucrare/:id", CAN, async (req, res) => {
  const id = OID(req.params.id);
  await PcWhatsappLucrare.updateOne(scoped(req, { _id: id }), { $set: { deletedAt: new Date() } });
  await PcWhatsappGroup.updateMany(scoped(req, { lucrareId: id }), { $set: { deletedAt: new Date() } }); // scoate grupurile din sync (rămân pe WhatsApp)
  res.json({ ok: true });
});

/* ───────── MAPĂRI grup↔lucrare ───────── */
router.get("/mappings", CAN, async (req, res) => {
  await ensureLucrari(req);
  const maps = await PcWhatsappGroup.find(scoped(req, {})).sort({ ministryGroup: 1 }).lean();
  res.json({ mappings: maps });
});
router.post("/map", CAN, async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.jid || !b.teamId) return res.status(400).json({ error: "jid și teamId sunt necesare." });
    const set = await buildMapSet(req, b);
    const doc = await PcWhatsappGroup.findOneAndUpdate({ orgId: req.pcOrgId, jid: set.jid },
      { $set: set, $setOnInsert: { orgId: req.pcOrgId } }, { new: true, upsert: true });
    res.json({ mapping: doc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// mapare în bloc (toate grupurile unei comunități odată)
router.post("/map/bulk", CAN, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const out = [];
    for (const b of items) {
      if (!b.jid || !b.teamId) continue;
      const set = await buildMapSet(req, b);
      const doc = await PcWhatsappGroup.findOneAndUpdate({ orgId: req.pcOrgId, jid: set.jid },
        { $set: set, $setOnInsert: { orgId: req.pcOrgId } }, { new: true, upsert: true });
      out.push(doc);
    }
    res.json({ mappings: out });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete("/map/:id", CAN, async (req, res) => {
  await PcWhatsappGroup.updateOne(scoped(req, { _id: OID(req.params.id) }), { $set: { deletedAt: new Date() } });
  res.json({ ok: true });
});
router.put("/map/:id/mode", CAN, async (req, res) => {
  const mode = ["auto", "manual", "semi"].includes(req.body?.mode) ? req.body.mode : "semi";
  await PcWhatsappGroup.updateOne(scoped(req, { _id: OID(req.params.id) }), { $set: { mode } });
  res.json({ ok: true, mode });
});

/* ───────── PREVIEW (diff fără a aplica) ───────── */
router.get("/preview/:id", CAN, async (req, res) => {
  try {
    const m = await PcWhatsappGroup.findOne(scoped(req, { _id: OID(req.params.id) })).lean();
    if (!m) return res.status(404).json({ error: "Mapare inexistentă." });
    const t = await weekTarget(req, m);
    let currentNumbers = [], toAdd = t.numbers, toRemove = [], liveError = "";
    if (bridge.status(m.botNumber).connected) {
      try {
        currentNumbers = await bridge.groupMembers(m.botNumber, m.jid);
        const cur = new Set(currentNumbers), tgt = new Set(t.numbers), self = new Set(bridge.selfIds(m.botNumber));
        toAdd = t.numbers.filter((n) => !cur.has(n) && !self.has(n));
        toRemove = currentNumbers.filter((n) => !tgt.has(n) && !self.has(n)); // nu număra robotul (num/LID) la scoși
      } catch (e) { liveError = e.message; }
    } else liveError = "Numărul-robot al acestei lucrări nu e conectat.";
    const plannedName = buildGroupName(m.namePrefix, t.weekShort, t.leaderName, t.teamName);
    res.json({ weekLabel: t.weekLabel, leaderName: t.leaderName, plannedName, people: t.people, missingPhone: t.missingPhone, currentCount: currentNumbers.length, toAdd, toRemove, emptyMatrix: t.emptyMatrix, liveError });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ───────── SYNC (aplică — trigger uman) ───────── */
router.post("/sync/:id", CAN, async (req, res) => {
  try {
    const m = await PcWhatsappGroup.findOne(scoped(req, { _id: OID(req.params.id) })).lean();
    if (!m) return res.status(404).json({ error: "Mapare inexistentă." });
    if (!bridge.status(m.botNumber).connected) return res.status(409).json({ error: "Numărul-robot al acestei lucrări nu e conectat. Conectează-l și reîncearcă." });
    res.json({ ok: true, ...(await syncOne(req, m)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ───────── SEED (populează din Matrix în bloc — trigger uman) ───────── */
// Seed toate: sincronizează fiecare mapare la weekOffset-ul ei. Matrix gol → scoate, nu adaugă, fără eroare.
router.post("/seed/all", CAN, async (req, res) => {
  try {
    if (!bridge.statuses().some((a) => a.connected)) return res.status(409).json({ error: "Niciun număr-robot conectat." });
    const filter = { enabled: true };
    if (Array.isArray(req.body?.ids) && req.body.ids.length) filter._id = { $in: req.body.ids.map(OID).filter(Boolean) }; // scoped precis (o lucrare)
    else if (req.body?.ministryGroup) filter.ministryGroup = String(req.body.ministryGroup);
    const maps = await PcWhatsappGroup.find(scoped(req, filter)).lean();
    const results = [];
    for (const m of maps) { try { results.push(await syncOne(req, m)); } catch (e) { results.push({ jid: m.jid, name: m.nameCached, error: e.message }); } }
    res.json({ ok: true, count: results.length, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Seed pe săptămână: forțează aceeași săptămână-din-lună pentru mapări (opțional doar o lucrare).
router.post("/seed/week", CAN, async (req, res) => {
  try {
    if (!bridge.statuses().some((a) => a.connected)) return res.status(409).json({ error: "Niciun număr-robot conectat." });
    const n = Math.min(5, Math.max(1, parseInt(req.body?.weekOfMonth, 10) || 1));
    const filter = { enabled: true };
    if (Array.isArray(req.body?.ids) && req.body.ids.length) filter._id = { $in: req.body.ids.map(OID).filter(Boolean) };
    else if (req.body?.ministryGroup) filter.ministryGroup = String(req.body.ministryGroup);
    const maps = await PcWhatsappGroup.find(scoped(req, filter)).lean();
    const results = [];
    for (const m of maps) { try { results.push(await syncOne(req, m, n)); } catch (e) { results.push({ jid: m.jid, name: m.nameCached, error: e.message }); } }
    res.json({ ok: true, weekOfMonth: n, count: results.length, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * Rulare AUTONOMĂ (scheduler, Faza 3) — DOAR grupurile pe modul „auto".
 * Aplică singur din Matrix când e nevoie. Matrix gol pe săptămâna-țintă → scoate-only, fără add (decizie David).
 */
async function runScheduledSync() {
  if (!bridge.statuses().some((a) => a.connected)) return { skipped: "not-connected" };
  const orgId = await resolveOrgId();
  if (!orgId) return { skipped: "no-org" };
  const req = { pcOrgId: orgId };
  const maps = await PcWhatsappGroup.find(scoped(req, { enabled: true, mode: "auto" })).lean();
  const results = [];
  for (const m of maps) {
    try {
      results.push(await syncOne(req, m)); // aplică din Matrix; Matrix gol → scoate-only (syncOne/syncGroup)
      await new Promise((r) => setTimeout(r, 3000)); // ritm blând între grupuri (anti-spam)
    } catch (e) { results.push({ jid: m.jid, name: m.nameCached, error: e.message }); }
  }
  return { count: results.length, applied: results.filter((r) => !r.error).length, results };
}

module.exports = router;
module.exports.runScheduledSync = runScheduledSync;
