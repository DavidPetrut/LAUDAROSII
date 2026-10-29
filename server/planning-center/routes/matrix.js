/**
 * Matrix — planificare multi-plan (adaptat MOBIL). /api/pc/v1/matrix.
 * Grilă: poziții (pe echipe) × planuri viitoare. Valoarea-cheie: EMAIL ÎN MASĂ pe mai multe planuri
 * (1 email/persoană pt. toate planurile) — exact ce recomandă PCO. Target-mode/auto-schedule/drag = seam.
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcServiceType, PcPlan, PcPlanTime, PcAssignment, PcNeededPosition,
  PcTeam, PcPosition, PcPerson, PcOrg, PcCampus, PcBlockout, PcTeamMember,
} = require("../models");
const { scoped } = require("../core/orgScope");
const { requireCan, requireAny, CAN_VIEW_MATRIX } = require("../core/permissions");

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
router.get("/:serviceTypeId", requireAny(CAN_VIEW_MATRIX), async (req, res) => {
  try {
    const clamp = (v, lo, hi, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : Math.max(lo, Math.min(hi, n)); };
    const tz = await campusTz(req);

    // Custom Matrix: una sau mai multe service types (`?sts=id1,id2`); default = cel din URL.
    const stIds = [...new Set([String(req.params.serviceTypeId), ...String(req.query.sts || "").split(",")].map((s) => s.trim()).filter(Boolean))].map(OID).filter(Boolean);
    const multi = stIds.length > 1;
    const [selSts, allSts] = await Promise.all([
      PcServiceType.find(scoped(req, { _id: { $in: stIds } })).select("name sortOrder").sort({ sortOrder: 1 }).lean(),
      PcServiceType.find(scoped(req)).select("name sortOrder").sort({ sortOrder: 1 }).lean(),
    ]);
    const stName = Object.fromEntries(selSts.map((s) => [String(s._id), s.name]));

    // Smart Load: Date (from/to ISO) sau Quantity (prev/next + săgeți offset). count = compat vechi.
    const offset = parseInt(req.query.offset, 10) || 0;
    const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || "") ? req.query.from : null;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || "") ? req.query.to : null;
    const count = clamp(req.query.count, 1, 26, 8);
    const prev = clamp(req.query.prev, 0, 26, 0);
    const next = clamp(req.query.next, 0, 26, count);

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const allPlans = await PcPlan.find(scoped(req, { serviceTypeId: { $in: stIds } })).sort({ sortDate: 1 }).select("_id sortDate serviceTypeId").lean();

    // checklist (Quick load plans): set EXPLICIT de planuri bifate
    const explicitPlanIds = new Set(String(req.query.planIds || "").split(",").map((s) => s.trim()).filter(Boolean));

    let plans, hasPrev = false, hasNext = false;
    if (explicitPlanIds.size) {
      plans = allPlans.filter((p) => explicitPlanIds.has(String(p._id))); // păstrează ordinea cronologică
    } else if (from && to) {
      const lo = new Date(from + "T00:00:00"), hi = new Date(to + "T23:59:59");
      plans = allPlans.filter((p) => { const d = new Date(p.sortDate); return d >= lo && d <= hi; });
    } else {
      const total = Math.max(1, prev + next);
      let todayIdx = allPlans.findIndex((p) => new Date(p.sortDate) >= todayStart);
      if (todayIdx < 0) todayIdx = allPlans.length;
      const maxStart = Math.max(0, allPlans.length - total);
      const startIdx = Math.max(0, Math.min(Math.max(0, todayIdx - prev) + offset, maxStart));
      plans = allPlans.slice(startIdx, startIdx + total);
      hasPrev = startIdx > 0;
      hasNext = startIdx + total < allPlans.length;
    }
    const planIds = plans.map((p) => p._id);
    const planIndex = Object.fromEntries(plans.map((p, i) => [String(p._id), i]));

    const [teams, assigns, needed] = await Promise.all([
      PcTeam.find(scoped(req, { serviceTypeId: { $in: stIds }, archived: false })).sort({ sortOrder: 1 }).lean(),
      PcAssignment.find(scoped(req, { planId: { $in: planIds } })).lean(),
      PcNeededPosition.find(scoped(req, { planId: { $in: planIds } })).lean(),
    ]);
    const positions = await PcPosition.find(scoped(req, { teamId: { $in: teams.map((t) => t._id) } })).sort({ sortOrder: 1 }).lean();
    const people = await PcPerson.find(scoped(req, { _id: { $in: assigns.map((a) => a.personId) } })).select("firstName lastName avatar").lean();
    const personById = Object.fromEntries(people.map((p) => [String(p._id), p]));

    const teamRows = teams.map((t) => {
      const tPos = positions.filter((p) => String(p.teamId) === String(t._id));
      return {
        teamId: t._id, name: t.name,
        stId: t.serviceTypeId, stName: stName[String(t.serviceTypeId)] || "",
        positions: tPos.map((pos) => {
          const cells = plans.map(() => ({ people: [], needed: 0 }));
          // #1: declined RĂMÂNE vizibil (admin). Celulele se umplu doar pe coloanele ST-ului acestei echipe (automat prin planId).
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
      serviceTypeId: stIds[0],
      serviceTypeName: multi ? `${selSts.length} service types` : (stName[String(stIds[0])] || ""),
      multi, selectedStIds: stIds.map(String),
      serviceTypes: allSts.map((s) => ({ id: s._id, name: s.name })),
      hasPrev, hasNext,
      // pt. dropdown-ul „Quick load plans" (checklist): toate planurile + care sunt afișate acum
      planOptions: allPlans.map((p) => ({ id: p._id, stId: p.serviceTypeId, stName: stName[String(p.serviceTypeId)] || "", dateLabel: fmtDate(p.sortDate, tz), selected: planIds.some((id) => String(id) === String(p._id)) })),
      plans: plans.map((p) => ({ id: p._id, stId: p.serviceTypeId, stName: stName[String(p.serviceTypeId)] || "", dateLabel: fmtDate(p.sortDate, tz), weekday: fmtWeekday(p.sortDate, tz) })),
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
router.get("/:serviceTypeId/coverage", requireAny(CAN_VIEW_MATRIX), async (req, res) => {
  try {
    const stId = OID(req.params.serviceTypeId);
    const count = Math.min(26, Math.max(1, parseInt(req.query.count, 10) || 4));
    const teamId = OID(req.query.teamId);
    const positionId = OID(req.query.positionId); // poziția selectată → rosterul ei are prioritate maximă
    const tz = await campusTz(req);
    const st = await PcServiceType.findOne(scoped(req, { _id: stId })).select("name").lean();
    const posR = positionId ? await PcPosition.findOne(scoped(req, { _id: positionId })).select("name").lean() : null;

    // interval = EXACT fereastra din Matrix. Dacă vin `planIds`, le folosim (sincron cu grila);
    // altfel fallback: viitoare întâi, completate cu recente.
    const explicitIds = String(req.query.planIds || "").split(",").map((s) => s.trim()).filter(Boolean).map(OID).filter(Boolean);
    let plans;
    if (explicitIds.length) {
      const found = await PcPlan.find(scoped(req, { _id: { $in: explicitIds } })).select("sortDate").lean();
      const byId = Object.fromEntries(found.map((p) => [String(p._id), p]));
      plans = explicitIds.map((id) => byId[String(id)]).filter(Boolean);
    } else {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      plans = await PcPlan.find(scoped(req, { serviceTypeId: stId, sortDate: { $gte: todayStart } })).sort({ sortDate: 1 }).limit(count).lean();
      if (plans.length < count) {
        const extra = await PcPlan.find(scoped(req, { serviceTypeId: stId, sortDate: { $lt: todayStart } })).sort({ sortDate: -1 }).limit(count - plans.length).lean();
        plans = [...extra.reverse(), ...plans];
      }
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
      .collation({ locale: "ro", strength: 1 }).select("firstName lastName avatar programIntent gender").lean();
    const pid = people.map((p) => p._id);
    // SIM-ul echipei filtrate (din nume) → recomandăm întâi oamenii de pe acel SIM în Lista live
    const selTeam = teamId ? teams.find((t) => String(t._id) === String(teamId)) : null;
    const teamSim = (() => { const m = String(selTeam?.name || "").match(/\(\s*(?:sim\s*)?([12])\s*\)/i); return m ? m[1] : ""; })();
    // ROSTER echipei: cine slujește oficial pe echipa filtrată (pc_team_members) → apare primul în Lista live
    const rosterIds = teamId
      ? new Set((await PcTeamMember.find(scoped(req, { teamId })).select("personId").lean()).map((m) => String(m.personId)))
      : new Set();
    // ROSTERUL POZIȚIEI: cine slujește oficial pe EXACT poziția selectată (ex. „Lider asimilare") → prioritate maximă
    const posRosterIds = positionId
      ? new Set((await PcTeamMember.find(scoped(req, { positionIds: positionId })).select("personId").lean()).map((m) => String(m.personId)))
      : new Set();

    // REFERINȚĂ de ZI: dacă e selectată o poziție (refPlanId = planul selectat), Listă live se raportează DOAR
    // la acea săptămână/zi — nu la toată fereastra. „De câte ori e planificat" = în acea zi (toate echipele),
    // iar cine are blockout în acea zi NU apare deloc (logic: nu poate sluji atunci).
    const refPlanId = OID(req.query.refPlanId);
    const refPlan = refPlanId ? await PcPlan.findOne(scoped(req, { _id: refPlanId })).select("sortDate").lean() : null;
    let dayKey = null, dayPlanIds = null;
    if (refPlan) {
      const ds = new Date(refPlan.sortDate); ds.setHours(0, 0, 0, 0);
      const de = new Date(ds); de.setDate(de.getDate() + 1);
      dayKey = ds.toISOString().slice(0, 10);
      dayPlanIds = (await PcPlan.find(scoped(req, { sortDate: { $gte: ds, $lt: de } })).select("_id").lean()).map((p) => p._id);
    }

    // asignări: în mod ZI numărăm TOATE slujirile din acea zi (orice echipă); altfel, distinct pe plan în fereastră
    const schedMatch = scoped(req, { personId: { $in: pid }, planId: { $in: refPlan ? dayPlanIds : planIds }, status: { $ne: "declined" } });
    if (teamId && !refPlan) schedMatch.teamId = teamId;
    const winAssigns = await PcAssignment.find(schedMatch).select("personId planId").lean();
    const schedBy = {};
    if (refPlan) winAssigns.forEach((a) => (schedBy[String(a.personId)] = (schedBy[String(a.personId)] || 0) + 1)); // câte slujiri în acea zi
    else winAssigns.forEach((a) => (schedBy[String(a.personId)] = schedBy[String(a.personId)] || new Set()).add(String(a.planId)));

    const blk = await PcBlockout.find(scoped(req, { personId: { $in: pid } })).select("personId startDate endDate type reason").lean();
    const blkBy = {}; blk.forEach((b) => (blkBy[String(b.personId)] = blkBy[String(b.personId)] || []).push(b));
    const covers = (b, dk) => (!b.startDate || b.startDate <= dk) && (!b.endDate || b.endDate >= dk);
    const rowOf = (p, sched, blocked) => ({
      id: p._id, name: [p.firstName, p.lastName].filter(Boolean).join(" "),
      initials: `${(p.firstName || "").charAt(0)}${(p.lastName || "").charAt(0)}`.toUpperCase(), avatar: p.avatar || "",
      programIntent: p.programIntent || "", gender: p.gender || "", inRoster: rosterIds.has(String(p._id)),
      inPosRoster: posRosterIds.has(String(p._id)), scheduled: sched, blocked, free: refPlan ? 0 : Math.max(0, plans.length - sched - blocked),
    });

    // oamenii cu BLOCKOUT în acea zi → NU apar în Neplanificați/Planificați, ci într-o listă SEPARATĂ (container „Blockout").
    const blockoutRows = [];
    const rows = people.map((p) => {
      const myBlk = blkBy[String(p._id)] || [];
      if (refPlan) {
        const bk = myBlk.find((b) => covers(b, dayKey));
        if (bk) {
          const r = rowOf(p, 0, 1);
          r.blockout = { label: bk.startDate === bk.endDate ? bk.startDate : `${bk.startDate} → ${bk.endDate}`, reason: bk.reason || "" };
          blockoutRows.push(r); return null;
        }
      } else if (myBlk.some((b) => b.type === "churchBlock" && planKeys.some((dk) => covers(b, dk)))) {
        return null;
      }
      const sched = refPlan ? (schedBy[String(p._id)] || 0) : (schedBy[String(p._id)] ? schedBy[String(p._id)].size : 0);
      const blocked = refPlan ? 0 : planKeys.filter((dk) => myBlk.some((b) => b.type !== "churchBlock" && covers(b, dk))).length;
      return rowOf(p, sched, blocked);
    }).filter(Boolean);

    // prioritate: ROSTERUL POZIȚIEI întâi (cine slujește oficial pe EXACT poziția selectată),
    // apoi rosterul echipei, apoi SIM-ul echipei (soft — SIM2 NU e exclus, doar coboară)
    const posRosterRank = (r) => (positionId && r.inPosRoster ? 0 : 1);
    const rosterRank = (r) => (teamId && r.inRoster ? 0 : 1);
    const simRank = (r) => (teamSim && r.programIntent === teamSim ? 0 : 1);
    // buckets: 0× (neplanificați) … 4×+; în FIECARE: roster poziție → roster echipă → SIM echipă → liberi → nume
    const bucket = (n, last) => ({
      times: n, label: n === 0 ? "Neplanificați" : (last ? `${n}×+` : `${n}×`),
      people: rows.filter((r) => last ? r.scheduled >= n : r.scheduled === n).sort((a, b) => (posRosterRank(a) - posRosterRank(b)) || (rosterRank(a) - rosterRank(b)) || (simRank(a) - simRank(b)) || (b.free - a.free) || a.name.localeCompare(b.name)),
    });
    const buckets = [bucket(0), bucket(1), bucket(2), bucket(3), bucket(4, true)];

    res.json({
      serviceTypeName: st?.name || "", serviceTypeId: stId, teamId: teamId || null,
      positionId: positionId || null, positionName: posR?.name || "", count,
      interval: plans.length ? `${fmtDate(plans[0].sortDate, tz)} – ${fmtDate(plans[plans.length - 1].sortDate, tz)}` : "",
      teams: teams.map((t) => ({ teamId: t._id, name: t.name })),
      total: rows.length,
      buckets,
      // oamenii cu blockout în acea zi (container „Blockout" din Listă live) — doar în mod ZI (refPlan)
      blockout: blockoutRows.sort((a, b) => (posRosterRank(a) - posRosterRank(b)) || a.name.localeCompare(b.name, "ro")),
    });
  } catch (err) {
    console.error("[pc] GET /matrix/:serviceTypeId/coverage:", err.message);
    res.status(500).json({ error: "Eroare la raportul de acoperire: " + err.message });
  }
});

/* ───────── GET /:serviceTypeId/person-availability — disponibilitatea unei persoane (target-mode #11) ─────────
   Pentru planurile vizibile (?planIds=): per plan → blockout / deja planificat în acest plan / ocupat în
   altă parte în aceeași zi. Alimentează indicatorii din antet + „click ca să-l planific". Doar READ. */
router.get("/:serviceTypeId/person-availability", requireAny(CAN_VIEW_MATRIX), async (req, res) => {
  try {
    const personId = OID(req.query.personId);
    const planIds = String(req.query.planIds || "").split(",").map((s) => s.trim()).filter(Boolean).map(OID).filter(Boolean);
    if (!personId || !planIds.length) return res.status(400).json({ error: "personId/planIds lipsesc." });

    const dk = (d) => new Date(d).toISOString().slice(0, 10);
    const targetPlans = await PcPlan.find(scoped(req, { _id: { $in: planIds } })).select("sortDate serviceTypeId").lean();
    const dateOf = {}; targetPlans.forEach((p) => (dateOf[String(p._id)] = dk(p.sortDate)));

    const blk = await PcBlockout.find(scoped(req, { personId })).select("startDate endDate type").lean();
    const covers = (b, d) => (!b.startDate || b.startDate <= d) && (!b.endDate || b.endDate >= d);

    // toate asignările (ne-refuzate) ale persoanei → grupate pe zi (pt. „ocupat în aceeași zi")
    const myAssigns = await PcAssignment.find(scoped(req, { personId, status: { $ne: "declined" } })).select("planId teamId positionId isGuest").lean();
    const aPlanIds = [...new Set(myAssigns.map((a) => String(a.planId)))].map(OID).filter(Boolean);
    const [aPlans, teams, poss, sts] = await Promise.all([
      PcPlan.find(scoped(req, { _id: { $in: aPlanIds } })).select("sortDate serviceTypeId").lean(),
      PcTeam.find(scoped(req, { _id: { $in: myAssigns.map((a) => a.teamId).filter(Boolean) } })).select("name").lean(),
      PcPosition.find(scoped(req, { _id: { $in: myAssigns.map((a) => a.positionId).filter(Boolean) } })).select("name").lean(),
      PcServiceType.find(scoped(req)).select("name").lean(),
    ]);
    const aPlanById = Object.fromEntries(aPlans.map((p) => [String(p._id), p]));
    const teamN = Object.fromEntries(teams.map((t) => [String(t._id), t.name]));
    const posN = Object.fromEntries(poss.map((p) => [String(p._id), p.name]));
    const stN = Object.fromEntries(sts.map((s) => [String(s._id), s.name]));

    const byDate = {};
    myAssigns.forEach((a) => {
      const pl = aPlanById[String(a.planId)]; if (!pl) return;
      (byDate[dk(pl.sortDate)] = byDate[dk(pl.sortDate)] || []).push({
        planId: String(a.planId),
        label: [posN[String(a.positionId)], teamN[String(a.teamId)] || stN[String(pl.serviceTypeId)]].filter(Boolean).join(" · "),
      });
    });

    const availability = {};
    for (const [pid, d] of Object.entries(dateOf)) {
      const dayList = byDate[d] || [];
      const here = dayList.some((x) => x.planId === pid);
      const sameDay = dayList.filter((x) => x.planId !== pid);
      availability[pid] = {
        blockout: blk.some((b) => covers(b, d)),
        here,
        busy: sameDay.length > 0,
        busyLabel: [...new Set(sameDay.map((x) => x.label).filter(Boolean))].slice(0, 3).join("; "),
      };
    }
    res.json({ personId, availability });
  } catch (err) {
    console.error("[pc] GET /matrix/:serviceTypeId/person-availability:", err.message);
    res.status(500).json({ error: "Eroare la disponibilitate." });
  }
});

/* ───────── GET /:serviceTypeId/person-weeks — target view: CARDURI pe SĂPTĂMÂNĂ (fereastra Matrix) ─────────
   Pentru persoana targetată: pe fiecare săptămână din fereastra Matrix (+ alte service types SELECTATE),
   ce face omul — planificat (unde) / neplanificat / conflict / blockout(+motiv). Multi-program.
   „La tineret" (regula liderului) = roster/asignare în Laudă&Închinare (nu Copii) / Media / Asimilare Tineret.
   ST-ul Matrix e MEREU inclus (cardurile ferestrei); Tineret e bifat default dacă persoana e la tineret. Doar READ. */
router.get("/:serviceTypeId/person-weeks", requireAny(CAN_VIEW_MATRIX), async (req, res) => {
  try {
    const stId = OID(req.params.serviceTypeId);
    const personId = OID(req.query.personId);
    const winPlanIds = String(req.query.planIds || "").split(",").map((s) => s.trim()).filter(Boolean).map(OID).filter(Boolean);
    if (!personId || !winPlanIds.length) return res.status(400).json({ error: "personId/planIds lipsesc." });
    const tz = await campusTz(req);
    const dk = (d) => new Date(d).toISOString().slice(0, 10);

    // fereastra Matrix (ST curent) → interval de date
    const winPlans = await PcPlan.find(scoped(req, { _id: { $in: winPlanIds } })).select("sortDate serviceTypeId").sort({ sortDate: 1 }).lean();
    if (!winPlans.length) return res.json({ personId, youthMember: false, serviceTypes: [], cards: [] });
    const times = winPlans.map((p) => new Date(p.sortDate).getTime());
    const ds = new Date(Math.min(...times)); ds.setHours(0, 0, 0, 0);
    const de = new Date(Math.max(...times)); de.setHours(23, 59, 59, 999);

    // ── „la tineret?" — regula liderului ──
    const allTeams = await PcTeam.find(scoped(req)).select("name serviceTypeId").lean();
    const isYouthTeam = (n = "") => {
      const s = String(n).toLowerCase();
      if (/copii|kids/.test(s)) return false;
      return /asimilare\s*tineret/.test(s) || /laud.*[îi]nchinare/.test(s) || /\bmedia\b/.test(s);
    };
    const youthTeamIds = allTeams.filter((t) => isYouthTeam(t.name)).map((t) => t._id);
    const [youthRoster, youthAssign] = await Promise.all([
      youthTeamIds.length ? PcTeamMember.findOne(scoped(req, { personId, teamId: { $in: youthTeamIds } })).select("_id").lean() : null,
      youthTeamIds.length ? PcAssignment.findOne(scoped(req, { personId, teamId: { $in: youthTeamIds }, status: { $ne: "declined" } })).select("_id").lean() : null,
    ]);
    const youthMember = !!(youthRoster || youthAssign);
    // ST-ul Tineret = ST-ul care conține echipa „Asimilare Tineret"
    const tineretTeam = allTeams.find((t) => /asimilare\s*tineret/.test(String(t.name || "").toLowerCase()));
    const tineretStId = tineretTeam && tineretTeam.serviceTypeId ? String(tineretTeam.serviceTypeId) : "";

    // service types + planurile lor din interval
    const allSt = await PcServiceType.find(scoped(req)).select("name").lean();
    const stName = Object.fromEntries(allSt.map((s) => [String(s._id), s.name]));
    const rangePlans = await PcPlan.find(scoped(req, { sortDate: { $gte: ds, $lte: de } })).select("sortDate serviceTypeId").sort({ sortDate: 1 }).lean();
    const stWithPlans = new Set(rangePlans.map((p) => String(p.serviceTypeId || "")).filter(Boolean));

    const defaultSet = new Set([String(stId)]);
    if (youthMember && tineretStId) defaultSet.add(tineretStId);
    const serviceTypes = allSt
      .filter((s) => stWithPlans.has(String(s._id)) || defaultSet.has(String(s._id)))
      .map((s) => ({ id: s._id, name: s.name, isYouth: String(s._id) === tineretStId, default: defaultSet.has(String(s._id)) }));

    // STs selectate (din query sau default); ST-ul Matrix mereu inclus
    const reqSel = String(req.query.serviceTypeIds || "").split(",").map((s) => s.trim()).filter(Boolean);
    const selSet = reqSel.length ? new Set(reqSel) : new Set(defaultSet);
    selSet.add(String(stId));

    // planurile pe care le arătăm: ST Matrix = EXACT fereastra; alte STs selectate = planurile lor din interval
    const cardPlans = winPlans.map((p) => ({ planId: String(p._id), date: new Date(p.sortDate), serviceTypeId: String(stId) }));
    rangePlans.forEach((p) => {
      const sid = String(p.serviceTypeId || "");
      if (sid && sid !== String(stId) && selSet.has(sid)) cardPlans.push({ planId: String(p._id), date: new Date(p.sortDate), serviceTypeId: sid });
    });

    // asignările persoanei (ne-refuzate) → grupate pe plan + contor pe zi (pt. conflict)
    const myAssigns = await PcAssignment.find(scoped(req, { personId, status: { $ne: "declined" } })).select("planId teamId positionId status isGuest").lean();
    const myPlanIds = [...new Set(myAssigns.map((a) => String(a.planId)))].map(OID).filter(Boolean);
    const [aPlans, teams2, poss2] = await Promise.all([
      PcPlan.find(scoped(req, { _id: { $in: myPlanIds } })).select("sortDate").lean(),
      PcTeam.find(scoped(req, { _id: { $in: myAssigns.map((a) => a.teamId).filter(Boolean) } })).select("name").lean(),
      PcPosition.find(scoped(req, { _id: { $in: myAssigns.map((a) => a.positionId).filter(Boolean) } })).select("name").lean(),
    ]);
    const aDateById = Object.fromEntries(aPlans.map((p) => [String(p._id), dk(p.sortDate)]));
    const tN = Object.fromEntries(teams2.map((t) => [String(t._id), t.name]));
    const pN = Object.fromEntries(poss2.map((p) => [String(p._id), p.name]));
    const assignByPlan = {}; const countByDay = {};
    myAssigns.forEach((a) => {
      (assignByPlan[String(a.planId)] = assignByPlan[String(a.planId)] || []).push({
        position: pN[String(a.positionId)] || (a.isGuest ? "Invitat" : ""), team: tN[String(a.teamId)] || "", status: a.status,
      });
      const d = aDateById[String(a.planId)]; if (d) countByDay[d] = (countByDay[d] || 0) + 1;
    });

    const blk = await PcBlockout.find(scoped(req, { personId })).select("startDate endDate type reason").lean();
    const covers = (b, d) => (!b.startDate || b.startDate <= d) && (!b.endDate || b.endDate >= d);

    const bySt = {};
    cardPlans.forEach((c) => {
      const d = dk(c.date);
      const al = assignByPlan[c.planId] || [];
      const bk = blk.find((b) => covers(b, d));
      (bySt[c.serviceTypeId] = bySt[c.serviceTypeId] || []).push({
        planId: c.planId, dateLabel: `${fmtWeekday(c.date, tz)} ${fmtDate(c.date, tz)}`, sort: c.date.getTime(),
        status: bk ? "blockout" : (al.length ? "planned" : "free"),
        assignments: al, conflict: (countByDay[d] || 0) > 1,
        blockout: bk ? { label: bk.startDate === bk.endDate ? bk.startDate : `${bk.startDate} → ${bk.endDate}`, reason: bk.reason || "" } : null,
      });
    });
    const cards = Object.keys(bySt)
      .map((sid) => ({ serviceTypeId: sid, serviceTypeName: stName[sid] || "", isYouth: sid === tineretStId,
        weeks: bySt[sid].sort((a, b) => a.sort - b.sort) }))
      .sort((a, b) => ((a.serviceTypeId === String(stId) ? 0 : 1) - (b.serviceTypeId === String(stId) ? 0 : 1)) || ((a.isYouth ? 0 : 1) - (b.isYouth ? 0 : 1)) || a.serviceTypeName.localeCompare(b.serviceTypeName, "ro"));

    res.json({ personId, youthMember, serviceTypes, cards });
  } catch (err) {
    console.error("[pc] GET /matrix/:serviceTypeId/person-weeks:", err.message);
    res.status(500).json({ error: "Eroare la cardurile persoanei: " + err.message });
  }
});

/* ───────── GET /:serviceTypeId/anomalies — ANOMALII din import PCO: om cu BLOCKOUT + asignare în ACEEAȘI zi ─────────
   Imposibil în sistem curat (dacă ai blockout nu ești available), dar apare pt. datele importate din PCO.
   Se depistează: are blockout care acoperă ziua ȘI ≥1 slujire (asignare ne-refuzată) în acea zi.
   DOAR INFO: singura rezolvare oferită = scoaterea slujirii (DELETE assignment). Blockout-ul nu se atinge. READ. */
router.get("/:serviceTypeId/anomalies", requireAny(CAN_VIEW_MATRIX), async (req, res) => {
  try {
    // fereastra = planurile vizibile în Matrix (planIds). Anomaliile apar DIN PRIMA, fără să selectezi ceva.
    const winPlanIds = String(req.query.planIds || "").split(",").map((s) => s.trim()).filter(Boolean).map(OID).filter(Boolean);
    const refPlanId = OID(req.query.refPlanId); // compat (o singură zi)
    const tz = await campusTz(req);
    const dk = (d) => new Date(d).toISOString().slice(0, 10);
    const winPlans = winPlanIds.length
      ? await PcPlan.find(scoped(req, { _id: { $in: winPlanIds } })).select("sortDate").lean()
      : (refPlanId ? await PcPlan.find(scoped(req, { _id: refPlanId })).select("sortDate").lean() : []);
    if (!winPlans.length) return res.json({ people: [] });
    const dayKeys = [...new Set(winPlans.map((p) => dk(p.sortDate)))];
    const times = winPlans.map((p) => new Date(p.sortDate).getTime());
    const ds = new Date(Math.min(...times)); ds.setHours(0, 0, 0, 0);
    const de = new Date(Math.max(...times)); de.setHours(23, 59, 59, 999);

    // toate planurile (org) din zilele ferestrei → zi + service type per plan
    const rangePlans = await PcPlan.find(scoped(req, { sortDate: { $gte: ds, $lte: de } })).select("sortDate serviceTypeId").lean();
    const planDay = {}, planSt = {}, dayLabelOf = {};
    rangePlans.forEach((p) => {
      const d = dk(p.sortDate); planDay[String(p._id)] = d; planSt[String(p._id)] = String(p.serviceTypeId || "");
      if (!dayLabelOf[d]) dayLabelOf[d] = `${fmtWeekday(p.sortDate, tz)} ${fmtDate(p.sortDate, tz)}`;
    });
    const dayPlanIds = rangePlans.filter((p) => dayKeys.includes(planDay[String(p._id)])).map((p) => p._id);

    // blockouts → pt. fiecare persoană, ce ZILE din fereastră îi sunt blocate
    const covers = (b, d) => (!b.startDate || b.startDate <= d) && (!b.endDate || b.endDate >= d);
    const minDay = dayKeys.reduce((a, b) => (a < b ? a : b));
    const blkAll = await PcBlockout.find(scoped(req, { $or: [{ endDate: { $gte: minDay } }, { endDate: null }] })).select("personId startDate endDate reason").lean();
    const blockedDays = {}; // pid → { dayKey: blockout }
    blkAll.forEach((b) => dayKeys.forEach((d) => { if (covers(b, d)) (blockedDays[String(b.personId)] = blockedDays[String(b.personId)] || {})[d] = b; }));
    const blkIds = Object.keys(blockedDays).map(OID).filter(Boolean);
    if (!blkIds.length) return res.json({ people: [] });

    // asignări ale lor în zilele ferestrei (ne-refuzate); ANOMALIE = asignare a cărei ZI e blocată pt. acea persoană
    const assigns = await PcAssignment.find(scoped(req, { personId: { $in: blkIds }, planId: { $in: dayPlanIds }, status: { $ne: "declined" } }))
      .select("personId planId teamId positionId status isGuest").lean();
    const byPerson = {};
    assigns.forEach((a) => { const d = planDay[String(a.planId)]; if (blockedDays[String(a.personId)] && blockedDays[String(a.personId)][d]) (byPerson[String(a.personId)] = byPerson[String(a.personId)] || []).push({ ...a, day: d }); });
    const ids = Object.keys(byPerson);
    if (!ids.length) return res.json({ people: [] });

    const [people, teams, poss, sts] = await Promise.all([
      PcPerson.find(scoped(req, { _id: { $in: ids.map(OID).filter(Boolean) } })).select("firstName lastName avatar").lean(),
      PcTeam.find(scoped(req, { _id: { $in: assigns.map((a) => a.teamId).filter(Boolean) } })).select("name").lean(),
      PcPosition.find(scoped(req, { _id: { $in: assigns.map((a) => a.positionId).filter(Boolean) } })).select("name").lean(),
      PcServiceType.find(scoped(req)).select("name").lean(),
    ]);
    const tN = Object.fromEntries(teams.map((t) => [String(t._id), t.name]));
    const pN = Object.fromEntries(poss.map((p) => [String(p._id), p.name]));
    const stN = Object.fromEntries(sts.map((s) => [String(s._id), s.name]));
    const personById = Object.fromEntries(people.map((p) => [String(p._id), p]));

    const out = ids.map((pid) => {
      const p = personById[pid]; if (!p) return null;
      const firstB = Object.values(blockedDays[pid])[0];
      return {
        id: pid, name: [p.firstName, p.lastName].filter(Boolean).join(" "),
        initials: `${(p.firstName || "").charAt(0)}${(p.lastName || "").charAt(0)}`.toUpperCase(), avatar: p.avatar || "",
        blockout: { label: firstB.startDate === firstB.endDate ? firstB.startDate : `${firstB.startDate} → ${firstB.endDate}`, reason: firstB.reason || "" },
        servings: byPerson[pid].map((a) => ({
          assignmentId: a._id, planId: a.planId, dayLabel: dayLabelOf[a.day] || "",
          position: pN[String(a.positionId)] || (a.isGuest ? "Invitat" : "Poziție"),
          team: tN[String(a.teamId)] || "", serviceTypeName: stN[planSt[String(a.planId)]] || "", status: a.status,
        })),
      };
    }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, "ro"));

    res.json({ people: out });
  } catch (err) {
    console.error("[pc] GET /matrix/:serviceTypeId/anomalies:", err.message);
    res.status(500).json({ error: "Eroare la anomalii: " + err.message });
  }
});

module.exports = router;
