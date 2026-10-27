/**
 * Matrix — planificare multi-plan (adaptat MOBIL). /api/pc/v1/matrix.
 * Grilă: poziții (pe echipe) × planuri viitoare. Valoarea-cheie: EMAIL ÎN MASĂ pe mai multe planuri
 * (1 email/persoană pt. toate planurile) — exact ce recomandă PCO. Target-mode/auto-schedule/drag = seam.
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcServiceType, PcPlan, PcPlanTime, PcAssignment, PcNeededPosition,
  PcTeam, PcPosition, PcPerson, PcOrg, PcCampus, PcBlockout,
} = require("../models");
const { scoped } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);

async function campusTz(req) {
  if (req._pcTz) return req._pcTz;
  const org = await PcOrg.findById(req.pcOrgId).select("defaultCampusId name").lean();
  req._pcOrg = org;
  let tz = "Europe/Bucharest";
  if (org?.defaultCampusId) {
    const c = await PcCampus.findById(org.defaultCampusId).select("timezone").lean();
    if (c?.timezone) tz = c.timezone;
  }
  req._pcTz = tz;
  return tz;
}
const fmtDate = (d, tz) => (d ? new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(new Date(d)) : "");
const fmtWeekday = (d, tz) => (d ? new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date(d)) : "");
const fmtTime = (d, tz) => (d ? new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d)) : "");
const mini = (p) => (p ? { id: p._id, name: [p.firstName, p.lastName].filter(Boolean).join(" "), avatar: p.avatar || "", initials: `${(p.firstName || "").charAt(0)}${(p.lastName || "").charAt(0)}`.toUpperCase() } : null);

/* ───────── GET /:serviceTypeId — grila matrix ───────── */
router.get("/:serviceTypeId", requireCan("services.schedule"), async (req, res) => {
  try {
    const stId = OID(req.params.serviceTypeId);
    const count = Math.min(12, Math.max(1, parseInt(req.query.count, 10) || 4));
    const offset = parseInt(req.query.offset, 10) || 0; // #7: săgeți ‹/› — decalează fereastra cu N planuri
    const tz = await campusTz(req);
    const stDoc = await PcServiceType.findOne(scoped(req, { _id: stId })).select("name").lean();

    // toate planurile sortate; fereastra default începe la primul plan ≥ azi, apoi se decalează cu `offset`
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const allPlans = await PcPlan.find(scoped(req, { serviceTypeId: stId })).sort({ sortDate: 1 }).select("_id sortDate").lean();
    const maxStart = Math.max(0, allPlans.length - count);
    let todayIdx = allPlans.findIndex((p) => new Date(p.sortDate) >= todayStart);
    if (todayIdx < 0) todayIdx = maxStart;
    let startIdx = Math.max(0, Math.min(todayIdx + offset, maxStart));
    const plans = allPlans.slice(startIdx, startIdx + count);
    const hasPrev = startIdx > 0;
    const hasNext = startIdx + count < allPlans.length;
    const planIds = plans.map((p) => p._id);
    const planIndex = Object.fromEntries(plans.map((p, i) => [String(p._id), i]));

    const [teams, assigns, needed] = await Promise.all([
      PcTeam.find(scoped(req, { serviceTypeId: stId, archived: false })).sort({ sortOrder: 1 }).lean(),
      PcAssignment.find(scoped(req, { planId: { $in: planIds } })).lean(),
      PcNeededPosition.find(scoped(req, { planId: { $in: planIds } })).lean(),
    ]);
    const positions = await PcPosition.find(scoped(req, { teamId: { $in: teams.map((t) => t._id) } })).sort({ sortOrder: 1 }).lean();
    const people = await PcPerson.find(scoped(req, { _id: { $in: assigns.map((a) => a.personId) } })).select("firstName lastName avatar").lean();
    const personById = Object.fromEntries(people.map((p) => [String(p._id), p]));

    const teamRows = teams.map((t) => {
      const tPos = positions.filter((p) => String(p.teamId) === String(t._id));
      return {
        teamId: t._id,
        name: t.name,
        positions: tPos.map((pos) => {
          const cells = plans.map(() => ({ people: [], needed: 0 }));
          // #1: declined RĂMÂNE vizibil (pt. admin/planificator — evidență). La user (mobil) se va ascunde.
          assigns.filter((a) => String(a.positionId) === String(pos._id)).forEach((a) => {
            const idx = planIndex[String(a.planId)];
            if (idx == null) return;
            const base = a.isGuest
              ? { name: a.guestName || "Invitat", initials: (a.guestName || "?").slice(0, 2).toUpperCase(), avatar: "" }
              : mini(personById[String(a.personId)]);
            cells[idx].people.push({ ...base, status: a.status, assignmentId: a._id, personId: a.personId, isGuest: !!a.isGuest });
          });
          needed.filter((n) => String(n.positionId) === String(pos._id)).forEach((n) => {
            const idx = planIndex[String(n.planId)];
            if (idx != null) cells[idx].needed += n.count || 0;
          });
          return { positionId: pos._id, name: pos.name, cells };
        }),
      };
    });

    res.json({
      serviceTypeId: stId,
      serviceTypeName: stDoc?.name || "",
      hasPrev, hasNext,
      plans: plans.map((p) => ({ id: p._id, dateLabel: fmtDate(p.sortDate, tz), weekday: fmtWeekday(p.sortDate, tz) })),
      teams: teamRows,
    });
  } catch (err) {
    console.error("[pc] GET /matrix/:serviceTypeId:", err.message);
    res.status(500).json({ error: "Eroare la matrix." });
  }
});

/* ───────── POST /:serviceTypeId/emails — email în masă pe mai multe planuri ───────── */
router.post("/:serviceTypeId/emails", requireCan("services.schedule"), async (req, res) => {
  try {
    const { sendScheduleEmail } = require("../services/scheduleEmail");
    const tz = await campusTz(req);
    const stId = OID(req.params.serviceTypeId);
    const st = await PcServiceType.findOne(scoped(req, { _id: stId })).select("name").lean();
    const planIds = (Array.isArray(req.body?.planIds) ? req.body.planIds : []).map(OID).filter(Boolean);
    const teamId = OID(req.body?.teamId);
    if (planIds.length === 0) return res.status(400).json({ error: "Niciun plan selectat." });

    const filter = scoped(req, { planId: { $in: planIds }, notificationSentAt: null, status: { $ne: "declined" } });
    if (teamId) filter.teamId = teamId;
    const assigns = await PcAssignment.find(filter).lean();
    if (assigns.length === 0) return res.json({ ok: true, sent: 0 });

    const [plans, positions, people, times] = await Promise.all([
      PcPlan.find(scoped(req, { _id: { $in: planIds } })).select("sortDate").lean(),
      PcPosition.find(scoped(req, { _id: { $in: assigns.map((a) => a.positionId).filter(Boolean) } })).select("name").lean(),
      PcPerson.find(scoped(req, { _id: { $in: assigns.map((a) => a.personId) } })).select("firstName lastName emails").lean(),
      PcPlanTime.find(scoped(req, { planId: { $in: planIds }, type: "service" })).lean(),
    ]);
    const planDate = Object.fromEntries(plans.map((p) => [String(p._id), fmtDate(p.sortDate, tz)]));
    const posName = Object.fromEntries(positions.map((p) => [String(p._id), p.name]));
    const personById = Object.fromEntries(people.map((p) => [String(p._id), p]));
    const planTimes = {};
    times.forEach((t) => (planTimes[String(t.planId)] = planTimes[String(t.planId)] || []).push(t));

    const byPerson = {};
    assigns.forEach((a) => (byPerson[String(a.personId)] = byPerson[String(a.personId)] || []).push(a));

    let sent = 0;
    for (const [pid, list] of Object.entries(byPerson)) {
      const person = personById[pid];
      const email = person?.emails?.find((e) => e.primary)?.address || person?.emails?.[0]?.address;
      if (!email) continue;
      const assignments = list.map((a) => {
        const tms = (planTimes[String(a.planId)] || []).map((t) => ({ label: `Service: ${fmtDate(t.startsAt, tz)} ${fmtTime(t.startsAt, tz)}` }));
        return {
          positionName: a.isTemporaryPosition ? a.tempPositionName : (posName[String(a.positionId)] || "Poziție"),
          teamName: "",
          dateLabel: planDate[String(a.planId)] || "",
          serviceTypeName: st?.name || "",
          timeLabels: tms,
          responseToken: a.responseToken,
        };
      });
      const r = await sendScheduleEmail({
        to: email,
        personName: [person.firstName, person.lastName].filter(Boolean).join(" "),
        assignments,
        repliesToName: req._pcOrg?.name,
        churchName: req._pcOrg?.name,
      });
      if (r && r.sent) {
        sent++;
        await PcAssignment.updateMany(scoped(req, { _id: { $in: list.map((a) => a._id) } }), { $set: { notificationSentAt: new Date(), prepared: false } });
      }
    }
    res.json({ ok: true, sent });
  } catch (err) {
    console.error("[pc] POST /matrix/:serviceTypeId/emails:", err.message);
    res.status(500).json({ error: "Eroare la emailuri: " + err.message });
  }
});

/* ───────── GET /:serviceTypeId/coverage — raport „persoane neplanificate" (live) ─────────
   Pe un interval de N planuri + (opțional) o echipă: fiecare persoană care slujește în acest
   service type, câte planuri are în interval (0×/1×/2×/3×/4×+), câte îi sunt blocate (blockout)
   și de câte ori mai POATE fi planificată (free = N − planificat − blocat). Pool = cine a fost
   vreodată asignat în acest ST (pc_team_members e gol la import). Doar READ. ZERO scrieri. */
router.get("/:serviceTypeId/coverage", requireCan("services.schedule"), async (req, res) => {
  try {
    const stId = OID(req.params.serviceTypeId);
    const count = Math.min(26, Math.max(1, parseInt(req.query.count, 10) || 4));
    const teamId = OID(req.query.teamId);
    const tz = await campusTz(req);
    const st = await PcServiceType.findOne(scoped(req, { _id: stId })).select("name").lean();

    // interval = aceleași planuri ca grila (viitoare întâi, completate cu recente)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    let plans = await PcPlan.find(scoped(req, { serviceTypeId: stId, sortDate: { $gte: todayStart } })).sort({ sortDate: 1 }).limit(count).lean();
    if (plans.length < count) {
      const extra = await PcPlan.find(scoped(req, { serviceTypeId: stId, sortDate: { $lt: todayStart } })).sort({ sortDate: -1 }).limit(count - plans.length).lean();
      plans = [...extra.reverse(), ...plans];
    }
    const planIds = plans.map((p) => p._id);
    const planKeys = plans.map((p) => new Date(p.sortDate).toISOString().slice(0, 10));

    // echipele (pentru filtrul din pagină)
    const teams = await PcTeam.find(scoped(req, { serviceTypeId: stId, archived: false })).sort({ sortOrder: 1 }).select("name").lean();

    // pool: cine a slujit vreodată în acest ST (sau pe echipa selectată)
    const allPlanIds = (await PcPlan.find(scoped(req, { serviceTypeId: stId })).select("_id").lean()).map((p) => p._id);
    const poolMatch = scoped(req, { planId: { $in: allPlanIds }, status: { $ne: "declined" } });
    if (teamId) poolMatch.teamId = teamId;
    const poolIds = await PcAssignment.distinct("personId", poolMatch);

    const people = await PcPerson.find(scoped(req, { _id: { $in: poolIds }, status: "active", schedulingStatus: { $in: ["available", null] } }))
      .collation({ locale: "ro", strength: 1 }).select("firstName lastName avatar").lean();
    const pid = people.map((p) => p._id);

    // asignări în INTERVAL (distinct pe plan)
    const winMatch = scoped(req, { personId: { $in: pid }, planId: { $in: planIds }, status: { $ne: "declined" } });
    if (teamId) winMatch.teamId = teamId;
    const winAssigns = await PcAssignment.find(winMatch).select("personId planId").lean();
    const schedBy = {};
    winAssigns.forEach((a) => (schedBy[String(a.personId)] = schedBy[String(a.personId)] || new Set()).add(String(a.planId)));

    // blockouts (cu type: churchBlock = exclus din raport)
    const blk = await PcBlockout.find(scoped(req, { personId: { $in: pid } })).select("personId startDate endDate type").lean();
    const blkBy = {}; blk.forEach((b) => (blkBy[String(b.personId)] = blkBy[String(b.personId)] || []).push(b));
    const covers = (b, dk) => (!b.startDate || b.startDate <= dk) && (!b.endDate || b.endDate >= dk);

    const rows = people.map((p) => {
      const myBlk = blkBy[String(p._id)] || [];
      // blocaj de biserică (on-break) care acoperă vreo zi din interval → exclus din raport
      if (myBlk.some((b) => b.type === "churchBlock" && planKeys.some((dk) => covers(b, dk)))) return null;
      const sched = schedBy[String(p._id)] ? schedBy[String(p._id)].size : 0;
      const blocked = planKeys.filter((dk) => myBlk.some((b) => b.type !== "churchBlock" && covers(b, dk))).length;
      const free = Math.max(0, count - sched - blocked);
      return {
        id: p._id, name: [p.firstName, p.lastName].filter(Boolean).join(" "),
        initials: `${(p.firstName || "").charAt(0)}${(p.lastName || "").charAt(0)}`.toUpperCase(), avatar: p.avatar || "",
        scheduled: sched, blocked, free,
      };
    }).filter(Boolean);

    // buckets: 0× (neplanificați) … 4×+; în fiecare, cei mai „liberi" întâi
    const bucket = (n, last) => ({
      times: n, label: n === 0 ? "Neplanificați" : (last ? `${n}×+` : `${n}×`),
      people: rows.filter((r) => last ? r.scheduled >= n : r.scheduled === n).sort((a, b) => b.free - a.free || a.name.localeCompare(b.name)),
    });
    const buckets = [bucket(0), bucket(1), bucket(2), bucket(3), bucket(4, true)];

    res.json({
      serviceTypeName: st?.name || "", serviceTypeId: stId, teamId: teamId || null, count,
      interval: plans.length ? `${fmtDate(plans[0].sortDate, tz)} – ${fmtDate(plans[plans.length - 1].sortDate, tz)}` : "",
      teams: teams.map((t) => ({ teamId: t._id, name: t.name })),
      total: rows.length,
      buckets,
    });
  } catch (err) {
    console.error("[pc] GET /matrix/:serviceTypeId/coverage:", err.message);
    res.status(500).json({ error: "Eroare la raportul de acoperire: " + err.message });
  }
});

module.exports = router;
