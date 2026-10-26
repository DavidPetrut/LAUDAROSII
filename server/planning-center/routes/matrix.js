/**
 * Matrix — planificare multi-plan (adaptat MOBIL). /api/pc/v1/matrix.
 * Grilă: poziții (pe echipe) × planuri viitoare. Valoarea-cheie: EMAIL ÎN MASĂ pe mai multe planuri
 * (1 email/persoană pt. toate planurile) — exact ce recomandă PCO. Target-mode/auto-schedule/drag = seam.
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcServiceType, PcPlan, PcPlanTime, PcAssignment, PcNeededPosition,
  PcTeam, PcPosition, PcPerson, PcOrg, PcCampus,
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
    const tz = await campusTz(req);
    const stDoc = await PcServiceType.findOne(scoped(req, { _id: stId })).select("name").lean();

    // planuri: viitoare (azi înainte) ascending, apoi completăm cu recente dacă-s puține
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    let plans = await PcPlan.find(scoped(req, { serviceTypeId: stId, sortDate: { $gte: todayStart } })).sort({ sortDate: 1 }).limit(count).lean();
    if (plans.length < count) {
      const extra = await PcPlan.find(scoped(req, { serviceTypeId: stId, sortDate: { $lt: todayStart } })).sort({ sortDate: -1 }).limit(count - plans.length).lean();
      plans = [...extra.reverse(), ...plans];
    }
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
          assigns.filter((a) => String(a.positionId) === String(pos._id) && a.status !== "declined").forEach((a) => {
            const idx = planIndex[String(a.planId)];
            if (idx != null) cells[idx].people.push({ ...mini(personById[String(a.personId)]), status: a.status, assignmentId: a._id, personId: a.personId });
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

module.exports = router;
