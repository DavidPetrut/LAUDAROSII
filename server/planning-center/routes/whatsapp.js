/**
 * /api/pc/v1/whatsapp — sincronizarea grupurilor WhatsApp cu Matrix-ul.
 * 1 grup permanent per lucrare; rotim membrii ca să reflecte oamenii săptămânii curente.
 * Puntea (Baileys) rulează LOCAL (flag WHATSAPP_BRIDGE=1); pe Render rutele care au nevoie de ea
 * întorc „bridge offline". Acțiunile pe oameni reali se fac DOAR pe trigger uman (sync/confirm). ZERO email.
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcServiceType, PcTeam, PcPlan, PcPosition, PcAssignment, PcPerson, PcWhatsappGroup,
} = require("../models");
const { scoped } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");
const bridge = require("../whatsapp/bridge");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);
const CAN = requireCan("whatsapp.manage");
const bridgeEnabled = () => process.env.WHATSAPP_BRIDGE === "1";
const fmtDay = (d) => (d ? new Intl.DateTimeFormat("ro-RO", { weekday: "short", day: "numeric", month: "short" }).format(new Date(d)) : "");
const RO_MON = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "noi", "dec"];
const roShort = (d) => { const x = new Date(d); return `${x.getDate()} ${RO_MON[x.getMonth()]}`; }; // „1 noi"
// nume grup = {prefix existent} - {dată} - {lider}; prefixul = ce e înainte de primul „ - " (re-sync nu acumulează)
const buildGroupName = (currentName, dateShort, leaderName) => {
  const prefix = String(currentName || "").split(" - ")[0].trim() || String(currentName || "").trim();
  return [prefix, dateShort, leaderName].filter(Boolean).join(" - ").slice(0, 100);
};
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

/** Cine trebuie în grup = oamenii ECHIPEI pe a `weekOffset`-a săptămână viitoare când echipa slujește. */
async function weekTarget(req, mapping) {
  const empty = { weekLabel: "", weekShort: "", leaderName: "", teamName: "", planIds: [], people: [], numbers: [], missingPhone: [] };
  if (!mapping.teamId) return empty;
  const team = await PcTeam.findOne(scoped(req, { _id: mapping.teamId })).select("name serviceTypeId serviceTypeIds ministryGroup").lean();
  if (!team) return empty;
  const slots = await teamServingSlots(req, team);
  if (!slots.length) return { ...empty, teamName: team.name };
  const target = slots[Math.min(Math.max(0, mapping.weekOffset || 0), slots.length - 1)];
  const ds = new Date(target.sortDate); ds.setHours(0, 0, 0, 0);
  const assigns = await PcAssignment.find(scoped(req, { planId: target._id, teamId: team._id, status: { $ne: "declined" } })).select("personId positionId").lean();
  const personIds = [...new Set(assigns.map((a) => String(a.personId)))];
  const positions = await PcPosition.find(scoped(req, { _id: { $in: [...new Set(assigns.map((a) => a.positionId).filter(Boolean))] } })).select("name").lean();
  const posName = Object.fromEntries(positions.map((p) => [String(p._id), p.name || ""]));
  const people = await PcPerson.find(scoped(req, { _id: { $in: personIds.map(OID).filter(Boolean) } })).select("firstName lastName phones").lean();
  const nameById = Object.fromEntries(people.map((p) => [String(p._id), [p.firstName, p.lastName].filter(Boolean).join(" ")]));

  // LIDER = persoana de pe poziția „Lider ..." (nu asistent), pt. numele grupului. Dacă nu există → gol.
  const isLeaderPos = (n = "") => /lider|lead/i.test(n) && !/asist/i.test(n);
  const leaderA = assigns.find((a) => a.positionId && isLeaderPos(posName[String(a.positionId)]));
  const leaderName = leaderA ? (nameById[String(leaderA.personId)] || "") : "";

  const out = [], numbers = [], missingPhone = [];
  people.forEach((p) => {
    const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
    const number = primaryPhone(p);
    const normalized = number ? bridge.normalizeNumber(number) : null;
    if (normalized) { numbers.push(normalized); out.push({ id: p._id, name, number, normalized }); }
    else missingPhone.push(name);
  });
  return { weekLabel: fmtDay(ds), weekShort: roShort(ds), leaderName, teamName: team.name, planIds: [target._id], people: out, numbers: [...new Set(numbers)], missingPhone };
}

/* ───────── STATUS / PAIRING ───────── */
router.get("/status", CAN, async (req, res) => {
  res.json({ ...bridge.status(), bridgeEnabled: bridgeEnabled() });
});
router.post("/connect", CAN, async (req, res) => {
  if (!bridgeEnabled()) return res.status(409).json({ error: "Puntea rulează doar local (WHATSAPP_BRIDGE=1)." });
  try { await bridge.start(); res.json({ ...bridge.status(), bridgeEnabled: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post("/logout", CAN, async (req, res) => {
  try { await bridge.logoutAndReset(); res.json({ ...bridge.status(), bridgeEnabled: bridgeEnabled() }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* ───────── GRUPURI REALE (de pe numărul-robot) ───────── */
router.get("/groups", CAN, async (req, res) => {
  try { res.json({ groups: await bridge.listGroups() }); }
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
  const slots = await teamServingSlots(req, team);
  res.json({ weeks: slots.slice(0, 8).map((p, i) => ({ offset: i, planId: p._id, label: `${i + 1}. ${fmtDay(p.sortDate)}` })) });
});

/* ───────── MAPĂRI grup↔lucrare ───────── */
router.get("/mappings", CAN, async (req, res) => {
  const maps = await PcWhatsappGroup.find(scoped(req, {})).sort({ ministryGroup: 1 }).lean();
  res.json({ mappings: maps });
});
router.post("/map", CAN, async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.jid || !b.teamId) return res.status(400).json({ error: "jid și teamId sunt necesare." });
    const team = await PcTeam.findOne(scoped(req, { _id: OID(b.teamId) })).select("ministryGroup").lean();
    const set = {
      jid: String(b.jid), nameCached: b.nameCached || "",
      teamId: OID(b.teamId), weekOffset: Math.max(0, parseInt(b.weekOffset, 10) || 0),
      ministryGroup: team?.ministryGroup || "", botNumber: b.botNumber ? bridge.normalizeNumber(b.botNumber) : "",
      mode: b.mode === "manual" ? "manual" : "semi", enabled: b.enabled !== false,
    };
    const doc = await PcWhatsappGroup.findOneAndUpdate(scoped(req, { jid: set.jid }),
      { $set: set, $setOnInsert: { orgId: req.pcOrgId } }, { new: true, upsert: true });
    res.json({ mapping: doc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete("/map/:id", CAN, async (req, res) => {
  await PcWhatsappGroup.updateOne(scoped(req, { _id: OID(req.params.id) }), { $set: { deletedAt: new Date() } });
  res.json({ ok: true });
});
router.put("/map/:id/mode", CAN, async (req, res) => {
  const mode = req.body?.mode === "manual" ? "manual" : "semi";
  await PcWhatsappGroup.updateOne(scoped(req, { _id: OID(req.params.id) }), { $set: { mode } });
  res.json({ ok: true, mode });
});

/* ───────── PREVIEW (diff fără a aplica) ───────── */
router.get("/preview/:id", CAN, async (req, res) => {
  try {
    const m = await PcWhatsappGroup.findOne(scoped(req, { _id: OID(req.params.id) })).lean();
    if (!m) return res.status(404).json({ error: "Mapare inexistentă." });
    const t = await weekTarget(req, m);
    let currentNumbers = [], toAdd = t.numbers, toRemove = [], liveError = "", currentName = m.nameCached;
    if (bridge.status().connected) {
      try {
        currentName = (await bridge.groupName(m.jid)) || m.nameCached;
        currentNumbers = await bridge.groupMembers(m.jid);
        const cur = new Set(currentNumbers), tgt = new Set(t.numbers);
        toAdd = t.numbers.filter((n) => !cur.has(n));
        toRemove = currentNumbers.filter((n) => !tgt.has(n));
      } catch (e) { liveError = e.message; }
    } else liveError = "Puntea nu e conectată.";
    const plannedName = buildGroupName(currentName, t.weekShort, t.leaderName);
    res.json({ weekLabel: t.weekLabel, leaderName: t.leaderName, plannedName, people: t.people, missingPhone: t.missingPhone, currentCount: currentNumbers.length, toAdd, toRemove, liveError });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ───────── SYNC (aplică — trigger uman) ───────── */
router.post("/sync/:id", CAN, async (req, res) => {
  try {
    if (!bridge.status().connected) return res.status(409).json({ error: "Puntea nu e conectată. Pornește-o local și scanează QR." });
    const m = await PcWhatsappGroup.findOne(scoped(req, { _id: OID(req.params.id) })).lean();
    if (!m) return res.status(404).json({ error: "Mapare inexistentă." });
    const t = await weekTarget(req, m);
    const result = await bridge.syncGroup(m.jid, t.numbers);
    // redenumește grupul: {prefix} - {dată} - {lider}
    let renamed = "";
    try { const cur = (await bridge.groupName(m.jid)) || m.nameCached; renamed = await bridge.renameGroup(m.jid, buildGroupName(cur, t.weekShort, t.leaderName)); } catch {}
    await PcWhatsappGroup.updateOne(scoped(req, { _id: m._id }), { $set: { lastSyncAt: new Date(), nameCached: renamed || m.nameCached } });
    res.json({ ok: true, weekLabel: t.weekLabel, leaderName: t.leaderName, renamed, missingPhone: t.missingPhone, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
