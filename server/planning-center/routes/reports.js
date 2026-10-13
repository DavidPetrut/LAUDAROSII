/**
 * Reporting (minimal, coerent). /api/pc/v1/reports. Editor+ (reports.view).
 * Date REALE agregate din assignments/blockouts/plans/songs. Focus pe analiza per-persoană
 * (slujiri, accept/decline, decline-după-accept, blockouts pe lună/an) + overview + song usage (CCLI copy).
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcPlan, PcAssignment, PcPerson, PcServiceType, PcPosition, PcTeam, PcPlanItem, PcSong, PcBlockout, PcOrg, PcCampus,
} = require("../models");
const { scoped } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");

const router = express.Router();
router.use(requireCan("reports.view"));

const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);

async function campusTz(req) {
  if (req._pcTz) return req._pcTz;
  const org = await PcOrg.findById(req.pcOrgId).select("defaultCampusId").lean();
  let tz = "Europe/Bucharest";
  if (org?.defaultCampusId) { const c = await PcCampus.findById(org.defaultCampusId).select("timezone").lean(); if (c?.timezone) tz = c.timezone; }
  req._pcTz = tz; return tz;
}
const fmtDate = (d, tz) => (d ? new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" }).format(new Date(d)) : "");
const monthKey = (d, tz) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit" }).format(new Date(d)) : "");
const yearKey = (d, tz) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric" }).format(new Date(d)) : "");
const fullName = (p) => (p ? [p.firstName, p.lastName].filter(Boolean).join(" ").trim() : "");

/** Interval din query: from/to „YYYY-MM-DD"; default = ultimele 12 luni. */
function range(req) {
  const to = req.query.to ? new Date(req.query.to + "T23:59:59.999Z") : new Date();
  let from;
  if (req.query.from) from = new Date(req.query.from + "T00:00:00.000Z");
  else { from = new Date(to); from.setFullYear(from.getFullYear() - 1); }
  return { from, to };
}
async function planIdsInRange(req, from, to, serviceTypeId) {
  const f = scoped(req, { sortDate: { $gte: from, $lte: to } });
  if (serviceTypeId) f.serviceTypeId = OID(serviceTypeId);
  const plans = await PcPlan.find(f).select("_id serviceTypeId sortDate").lean();
  return plans;
}

/* ───────── GET /person/:id — analiza unei persoane ───────── */
router.get("/person/:personId", async (req, res) => {
  try {
    const personId = OID(req.params.personId);
    if (!personId) return res.status(400).json({ error: "ID invalid." });
    const tz = await campusTz(req);
    const { from, to } = range(req);
    const [person, plans] = await Promise.all([
      PcPerson.findOne(scoped(req, { _id: personId })).select("firstName lastName emails").lean(),
      planIdsInRange(req, from, to),
    ]);
    if (!person) return res.status(404).json({ error: "Persoană inexistentă." });
    const planById = Object.fromEntries(plans.map((p) => [String(p._id), p]));
    const planIds = plans.map((p) => p._id);
    const stIds = [...new Set(plans.map((p) => String(p.serviceTypeId)))].map(OID);

    const [assigns, sts, blockouts] = await Promise.all([
      PcAssignment.find(scoped(req, { personId, planId: { $in: planIds } })).lean(),
      PcServiceType.find(scoped(req, { _id: { $in: stIds } })).select("name").lean(),
      PcBlockout.find(scoped(req, { personId })).lean(),
    ]);
    const stName = Object.fromEntries(sts.map((s) => [String(s._id), s.name]));
    const posIds = assigns.map((a) => a.positionId).filter(Boolean);
    const positions = await PcPosition.find(scoped(req, { _id: { $in: posIds } })).select("name").lean();
    const posName = Object.fromEntries(positions.map((p) => [String(p._id), p.name]));

    const served = assigns.filter((a) => a.status === "confirmed").length;
    const declined = assigns.filter((a) => a.status === "declined").length;
    const declinedAfterConfirm = assigns.filter((a) => a.declinedAfterConfirm).length;
    const declinedPlain = declined - declinedAfterConfirm;
    const pending = assigns.filter((a) => a.status === "unconfirmed").length;
    const accepted = assigns.filter((a) => a.acceptedAt).length;

    // slujiri (confirmate) pe lună
    const servedByMonth = {};
    assigns.filter((a) => a.status === "confirmed").forEach((a) => {
      const mk = monthKey(planById[String(a.planId)]?.sortDate, tz);
      if (mk) servedByMonth[mk] = (servedByMonth[mk] || 0) + 1;
    });

    // blockouts în interval + pe lună/an
    const inRange = (b) => {
      const bs = new Date(b.startDate + "T00:00:00Z"), be = new Date(b.endDate + "T23:59:59Z");
      return be >= from && bs <= to;
    };
    const blockoutsInRange = blockouts.filter(inRange);
    const blockoutsByMonth = {}, blockoutsByYear = {};
    blockoutsInRange.forEach((b) => {
      const mk = b.startDate.slice(0, 7), yk = b.startDate.slice(0, 4);
      blockoutsByMonth[mk] = (blockoutsByMonth[mk] || 0) + 1;
      blockoutsByYear[yk] = (blockoutsByYear[yk] || 0) + 1;
    });

    const recent = assigns
      .map((a) => ({ sortDate: planById[String(a.planId)]?.sortDate, status: a.status, declinedAfterConfirm: !!a.declinedAfterConfirm,
        dateLabel: fmtDate(planById[String(a.planId)]?.sortDate, tz),
        serviceTypeName: stName[String(planById[String(a.planId)]?.serviceTypeId)] || "",
        positionName: a.isTemporaryPosition ? a.tempPositionName : (posName[String(a.positionId)] || "Poziție") }))
      .sort((x, y) => new Date(y.sortDate || 0) - new Date(x.sortDate || 0))
      .slice(0, 20);

    res.json({
      person: { id: person._id, name: fullName(person), email: (person.emails || []).find((e) => e.primary)?.address || (person.emails || [])[0]?.address || "" },
      range: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
      totals: { scheduled: assigns.length, served, accepted, pending, declined, declinedAfterConfirm, declinedPlain, blockouts: blockoutsInRange.length },
      servedByMonth,
      blockoutsByMonth, blockoutsByYear,
      blockouts: blockoutsInRange.sort((a, b) => (a.startDate < b.startDate ? 1 : -1)).map((b) => ({ id: b._id, startDate: b.startDate, endDate: b.endDate, repeat: b.repeat, reason: b.reason })),
      recent,
    });
  } catch (err) { console.error("[pc] GET /reports/person:", err.message); res.status(500).json({ error: "Eroare la raport." }); }
});

/* ───────── GET /overview — statistici org pe interval ───────── */
router.get("/overview", async (req, res) => {
  try {
    const { from, to } = range(req);
    const plans = await planIdsInRange(req, from, to, req.query.serviceTypeId);
    const planIds = plans.map((p) => p._id);
    const [assigns, items] = await Promise.all([
      PcAssignment.find(scoped(req, { planId: { $in: planIds } })).select("personId status").lean(),
      PcPlanItem.find(scoped(req, { planId: { $in: planIds }, type: "song", songId: { $ne: null } })).select("songId").lean(),
    ]);
    const statusBreakdown = {
      confirmed: assigns.filter((a) => a.status === "confirmed").length,
      unconfirmed: assigns.filter((a) => a.status === "unconfirmed").length,
      declined: assigns.filter((a) => a.status === "declined").length,
    };
    // top-served (confirmate) pe persoană
    const byPerson = {};
    assigns.filter((a) => a.status === "confirmed").forEach((a) => (byPerson[String(a.personId)] = (byPerson[String(a.personId)] || 0) + 1));
    const topIds = Object.entries(byPerson).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const people = await PcPerson.find(scoped(req, { _id: { $in: topIds.map((t) => OID(t[0])) } })).select("firstName lastName").lean();
    const nameById = Object.fromEntries(people.map((p) => [String(p._id), fullName(p)]));
    const topServed = topIds.map(([id, count]) => ({ id, name: nameById[id] || "—", count }));

    const songsUsed = new Set(items.map((i) => String(i.songId))).size;
    const now = new Date();
    const blockoutsActive = await PcBlockout.countDocuments(scoped(req, { endDate: { $gte: from.toISOString().slice(0, 10) }, startDate: { $lte: to.toISOString().slice(0, 10) } }));

    res.json({
      range: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
      plansCount: plans.length,
      assignmentsCount: assigns.length,
      statusBreakdown,
      topServed,
      songsUsed,
      blockoutsCount: blockoutsActive,
    });
  } catch (err) { console.error("[pc] GET /reports/overview:", err.message); res.status(500).json({ error: "Eroare la overview." }); }
});

/* ───────── GET /songs — song usage (CCLI copy minimal): câte planuri/cântec ───────── */
router.get("/songs", async (req, res) => {
  try {
    const { from, to } = range(req);
    const plans = await planIdsInRange(req, from, to, req.query.serviceTypeId);
    const planIds = plans.map((p) => p._id);
    const items = await PcPlanItem.find(scoped(req, { planId: { $in: planIds }, type: "song", songId: { $ne: null } })).select("songId planId").lean();
    const bySong = {};
    items.forEach((i) => { const k = String(i.songId); (bySong[k] = bySong[k] || new Set()).add(String(i.planId)); });
    const songIds = Object.keys(bySong).map(OID);
    const songs = await PcSong.find(scoped(req, { _id: { $in: songIds } })).select("title author ccli").lean();
    const rows = songs.map((s) => ({ id: s._id, title: s.title, author: s.author, ccli: s.ccli, plans: bySong[String(s._id)].size }))
      .sort((a, b) => b.plans - a.plans);
    res.json({ range: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }, songs: rows, total: rows.length });
  } catch (err) { console.error("[pc] GET /reports/songs:", err.message); res.status(500).json({ error: "Eroare la song usage." }); }
});

/* ───────── GET /blockouts — toate blockout-urile din interval, pe persoană ───────── */
router.get("/blockouts", async (req, res) => {
  try {
    const { from, to } = range(req);
    const fs = from.toISOString().slice(0, 10), ts = to.toISOString().slice(0, 10);
    const blockouts = await PcBlockout.find(scoped(req, { endDate: { $gte: fs }, startDate: { $lte: ts } })).sort({ startDate: -1 }).lean();
    const pids = [...new Set(blockouts.map((b) => String(b.personId)))].map(OID);
    const people = await PcPerson.find(scoped(req, { _id: { $in: pids } })).select("firstName lastName").lean();
    const nameById = Object.fromEntries(people.map((p) => [String(p._id), fullName(p)]));
    const byPerson = {};
    blockouts.forEach((b) => {
      const k = String(b.personId);
      (byPerson[k] = byPerson[k] || { personId: k, name: nameById[k] || "—", items: [] }).items.push({ startDate: b.startDate, endDate: b.endDate, repeat: b.repeat, reason: b.reason });
    });
    res.json({ range: { from: fs, to: ts }, people: Object.values(byPerson).sort((a, b) => b.items.length - a.items.length) });
  } catch (err) { console.error("[pc] GET /reports/blockouts:", err.message); res.status(500).json({ error: "Eroare la blockouts." }); }
});

/* ───────── GET /future-schedule — programări viitoare, pe persoană ───────── */
router.get("/future-schedule", async (req, res) => {
  try {
    const tz = await campusTz(req);
    const now = new Date();
    const to = new Date(now); to.setMonth(to.getMonth() + 6);
    const plans = await PcPlan.find(scoped(req, { sortDate: { $gte: now, $lte: to } })).select("_id serviceTypeId sortDate").lean();
    const planById = Object.fromEntries(plans.map((p) => [String(p._id), p]));
    const sts = await PcServiceType.find(scoped(req, { _id: { $in: [...new Set(plans.map((p) => String(p.serviceTypeId)))].map(OID) } })).select("name").lean();
    const stName = Object.fromEntries(sts.map((s) => [String(s._id), s.name]));
    const assigns = await PcAssignment.find(scoped(req, { planId: { $in: plans.map((p) => p._id) }, status: { $ne: "declined" } })).select("personId planId status").lean();
    const pids = [...new Set(assigns.map((a) => String(a.personId)))].map(OID);
    const people = await PcPerson.find(scoped(req, { _id: { $in: pids } })).select("firstName lastName").lean();
    const nameById = Object.fromEntries(people.map((p) => [String(p._id), fullName(p)]));
    const byPerson = {};
    assigns.forEach((a) => {
      const k = String(a.personId); const plan = planById[String(a.planId)];
      (byPerson[k] = byPerson[k] || { personId: k, name: nameById[k] || "—", items: [] }).items.push({
        dateLabel: fmtDate(plan?.sortDate, tz), sortDate: plan?.sortDate, serviceTypeName: stName[String(plan?.serviceTypeId)] || "", status: a.status,
      });
    });
    const out = Object.values(byPerson).map((p) => ({ ...p, items: p.items.sort((x, y) => new Date(x.sortDate) - new Date(y.sortDate)) })).sort((a, b) => a.name.localeCompare(b.name));
    res.json({ people: out });
  } catch (err) { console.error("[pc] GET /reports/future-schedule:", err.message); res.status(500).json({ error: "Eroare la future schedule." }); }
});

module.exports = router;
