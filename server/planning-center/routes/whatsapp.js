/**
 * /api/pc/v1/whatsapp — sincronizarea grupurilor WhatsApp cu Matrix-ul.
 * 1 grup permanent per lucrare; rotim membrii ca să reflecte oamenii săptămânii curente.
 * Puntea (Baileys) rulează LOCAL (flag WHATSAPP_BRIDGE=1); pe Render rutele care au nevoie de ea
 * întorc „bridge offline". Acțiunile pe oameni reali se fac DOAR pe trigger uman (sync/confirm). ZERO email.
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcServiceType, PcTeam, PcPlan, PcAssignment, PcPerson, PcWhatsappGroup,
} = require("../models");
const { scoped } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");
const bridge = require("../whatsapp/bridge");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);
const CAN = requireCan("whatsapp.manage");
const bridgeEnabled = () => process.env.WHATSAPP_BRIDGE === "1";
const fmtDay = (d) => (d ? new Intl.DateTimeFormat("ro-RO", { weekday: "short", day: "numeric", month: "short" }).format(new Date(d)) : "");
const primaryPhone = (p) => {
  const list = p?.phones || [];
  const pick = list.find((x) => x.primary && x.number) || list.find((x) => x.location === "Mobile" && x.number) || list.find((x) => x.number);
  return pick?.number || "";
};

/** Cine trebuie să fie în grupul lucrării pe săptămâna CURENTĂ (următorul plan ≥ azi). */
async function weekTarget(req, mapping) {
  const teamFilter = scoped(req, { ministryGroup: mapping.ministryGroup });
  const teams = await PcTeam.find(teamFilter).select("_id serviceTypeId serviceTypeIds").lean();
  const teamIds = teams.map((t) => t._id);
  let stIds = [...new Set(teams.flatMap((t) => [t.serviceTypeId, ...(t.serviceTypeIds || [])]).filter(Boolean).map(String))];
  if (mapping.serviceTypeId) stIds = stIds.filter((s) => s === String(mapping.serviceTypeId));
  if (!teamIds.length || !stIds.length) return { weekLabel: "", planIds: [], people: [], numbers: [], missingPhone: [] };

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const stOids = stIds.map(OID).filter(Boolean);
  let refPlan = await PcPlan.findOne(scoped(req, { serviceTypeId: { $in: stOids }, sortDate: { $gte: todayStart } })).sort({ sortDate: 1 }).select("sortDate").lean();
  if (!refPlan) refPlan = await PcPlan.findOne(scoped(req, { serviceTypeId: { $in: stOids } })).sort({ sortDate: -1 }).select("sortDate").lean();
  if (!refPlan) return { weekLabel: "", planIds: [], people: [], numbers: [], missingPhone: [] };

  const ds = new Date(refPlan.sortDate); ds.setHours(0, 0, 0, 0);
  const de = new Date(ds); de.setDate(de.getDate() + 1);
  const dayPlans = await PcPlan.find(scoped(req, { serviceTypeId: { $in: stOids }, sortDate: { $gte: ds, $lt: de } })).select("_id").lean();
  const planIds = dayPlans.map((p) => p._id);
  const assigns = await PcAssignment.find(scoped(req, { planId: { $in: planIds }, teamId: { $in: teamIds }, status: { $ne: "declined" } })).select("personId").lean();
  const personIds = [...new Set(assigns.map((a) => String(a.personId)))];
  const people = await PcPerson.find(scoped(req, { _id: { $in: personIds.map(OID).filter(Boolean) } })).select("firstName lastName phones").lean();

  const out = [], numbers = [], missingPhone = [];
  people.forEach((p) => {
    const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
    const number = primaryPhone(p);
    const normalized = number ? bridge.normalizeNumber(number) : null;
    if (normalized) { numbers.push(normalized); out.push({ id: p._id, name, number, normalized }); }
    else missingPhone.push(name);
  });
  return { weekLabel: fmtDay(ds), planIds, people: out, numbers: [...new Set(numbers)], missingPhone };
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

/* ───────── LUCRĂRI (ministryGroup) pt. picker ───────── */
router.get("/ministries", CAN, async (req, res) => {
  const vals = await PcTeam.distinct("ministryGroup", scoped(req, { ministryGroup: { $nin: ["", null] } }));
  res.json({ ministries: vals.filter(Boolean).sort((a, b) => a.localeCompare(b, "ro")) });
});

/* ───────── MAPĂRI grup↔lucrare ───────── */
router.get("/mappings", CAN, async (req, res) => {
  const maps = await PcWhatsappGroup.find(scoped(req, {})).sort({ ministryGroup: 1 }).lean();
  res.json({ mappings: maps });
});
router.post("/map", CAN, async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.jid || !b.ministryGroup) return res.status(400).json({ error: "jid și ministryGroup sunt necesare." });
    const set = {
      jid: String(b.jid), nameCached: b.nameCached || "", ministryGroup: b.ministryGroup,
      serviceTypeId: OID(b.serviceTypeId) || null, botNumber: b.botNumber ? bridge.normalizeNumber(b.botNumber) : "",
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
    let currentNumbers = [], toAdd = t.numbers, toRemove = [], liveError = "";
    if (bridge.status().connected) {
      try {
        currentNumbers = await bridge.groupMembers(m.jid);
        const cur = new Set(currentNumbers), tgt = new Set(t.numbers);
        toAdd = t.numbers.filter((n) => !cur.has(n));
        toRemove = currentNumbers.filter((n) => !tgt.has(n));
      } catch (e) { liveError = e.message; }
    } else liveError = "Puntea nu e conectată.";
    res.json({ weekLabel: t.weekLabel, people: t.people, missingPhone: t.missingPhone, currentCount: currentNumbers.length, toAdd, toRemove, liveError });
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
    await PcWhatsappGroup.updateOne(scoped(req, { _id: m._id }), { $set: { lastSyncAt: new Date() } });
    res.json({ ok: true, weekLabel: t.weekLabel, missingPhone: t.missingPhone, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
