/**
 * My Schedule (membru) — programări (pending/confirmed grupate pe plan) + accept/decline/accept-all,
 * calendar personal + BLOCKOUTS (cu repeat, motiv, conflicte). /api/pc/v1/schedule.
 * Validare blockout pe server (autoritate): interval valid + dedup concurent (same second-safe).
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcAssignment, PcPlan, PcServiceType, PcPosition, PcTeam, PcPlanTime, PcPerson, PcOrg, PcCampus, PcBlockout,
} = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { notifyAssignmentDeclined, notifyBlockoutCreated } = require("../services/notifyService");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function campusTz(req) {
  if (req._pcTz) return req._pcTz;
  const org = await PcOrg.findById(req.pcOrgId).select("defaultCampusId").lean();
  let tz = "Europe/Bucharest";
  if (org?.defaultCampusId) {
    const c = await PcCampus.findById(org.defaultCampusId).select("timezone").lean();
    if (c?.timezone) tz = c.timezone;
  }
  req._pcTz = tz;
  return tz;
}
const fmtDate = (d, tz) => (d ? new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(new Date(d)) : "");
const fmtTime = (d, tz) => (d ? new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d)) : "");
const isoDate = (d, tz) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d)) : "");
const weekdayOf = (ds) => new Date(ds + "T12:00:00Z").getUTCDay();

async function viewerPerson(req) {
  const p = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
  return p?._id || null;
}

/** Programările vizibile ale viewerului (ne-declinate, trimise sau ne-prepared). */
async function viewerAssignments(req, pid) {
  return PcAssignment.find(
    scoped(req, { personId: pid, status: { $ne: "declined" }, $or: [{ prepared: false }, { notificationSentAt: { $ne: null } }] })
  ).lean();
}

/** Grupează assignment-urile pe plan, cu nume + ore. Întoarce array de grupuri. */
async function buildGroups(req, assigns, tz) {
  const planIds = [...new Set(assigns.map((a) => String(a.planId)))].map(OID);
  const [plans, positions, teams, times] = await Promise.all([
    PcPlan.find(scoped(req, { _id: { $in: planIds } })).select("serviceTypeId sortDate").lean(),
    PcPosition.find(scoped(req, { _id: { $in: assigns.map((a) => a.positionId).filter(Boolean) } })).select("name").lean(),
    PcTeam.find(scoped(req, { _id: { $in: assigns.map((a) => a.teamId).filter(Boolean) } })).select("name").lean(),
    PcPlanTime.find(scoped(req, { planId: { $in: planIds } })).sort({ startsAt: 1 }).lean(),
  ]);
  const sts = await PcServiceType.find(scoped(req, { _id: { $in: plans.map((p) => p.serviceTypeId) } })).select("name").lean();
  const planById = Object.fromEntries(plans.map((p) => [String(p._id), p]));
  const stName = Object.fromEntries(sts.map((s) => [String(s._id), s.name]));
  const posName = Object.fromEntries(positions.map((p) => [String(p._id), p.name]));
  const teamName = Object.fromEntries(teams.map((t) => [String(t._id), t.name]));

  const groups = {};
  for (const a of assigns) {
    const key = String(a.planId);
    const plan = planById[key] || {};
    if (!groups[key]) {
      const planTimes = times.filter((t) => String(t.planId) === key);
      groups[key] = {
        planId: a.planId,
        sortDate: plan.sortDate || null,
        dateStr: isoDate(plan.sortDate, tz),
        dateLabel: fmtDate(plan.sortDate, tz),
        serviceTypeName: stName[String(plan.serviceTypeId)] || "",
        positions: [],
        times: planTimes.map((t) => ({
          type: t.type || "service",
          name: t.type === "service" ? "Service" : (t.name || "Rehearsal"),
          dateLabel: new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "2-digit", day: "2-digit", year: "2-digit" }).format(new Date(t.startsAt)),
          range: `${fmtTime(t.startsAt, tz)}${t.endsAt ? ` - ${fmtTime(t.endsAt, tz)}` : ""}`,
        })),
        hasAudio: false,
      };
    }
    groups[key].positions.push({
      assignmentId: a._id,
      positionName: a.isTemporaryPosition ? a.tempPositionName : (posName[String(a.positionId)] || "Poziție"),
      teamName: teamName[String(a.teamId)] || "",
      status: a.status,
    });
  }
  return Object.values(groups).sort((x, y) => new Date(x.sortDate || 0) - new Date(y.sortDate || 0));
}

/* ───────── GET /my — grupate pe plan (pending / confirmed) ───────── */
router.get("/my", async (req, res) => {
  try {
    const pid = await viewerPerson(req);
    if (!pid) return res.json({ pending: [], confirmed: [] });
    const tz = await campusTz(req);
    const assigns = await viewerAssignments(req, pid);
    const todayStr = isoDate(new Date(), tz);
    // DOAR VIITOR (incl. azi), sortat prezent→viitor (buildGroups sortează ascendent). Fără istoric.
    const groups = (await buildGroups(req, assigns, tz)).filter((g) => g.dateStr >= todayStr);
    const pending = groups.filter((g) => g.positions.some((p) => p.status === "unconfirmed"));
    const confirmed = groups.filter((g) => !g.positions.some((p) => p.status === "unconfirmed"));
    const declinedAssigns = await PcAssignment.find(scoped(req, { personId: pid, status: "declined" })).lean();
    const declined = (await buildGroups(req, declinedAssigns, tz)).filter((g) => g.dateStr >= todayStr);
    res.json({ pending, confirmed, declined });
  } catch (err) {
    console.error("[pc] GET /schedule/my:", err.message);
    res.status(500).json({ error: "Eroare la programul meu." });
  }
});

/* ───────── GET /calendar?year=&month= — calendar personal (programări + blockouts) ───────── */
router.get("/calendar", async (req, res) => {
  try {
    const pid = await viewerPerson(req);
    if (!pid) return res.json({ scheduled: [], blockoutDays: [], blockouts: [] });
    const tz = await campusTz(req);
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1); // 1-12
    const mm = String(month).padStart(2, "0");
    const monthStart = `${year}-${mm}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${mm}-${String(daysInMonth).padStart(2, "0")}`;

    const assigns = await viewerAssignments(req, pid);
    const groups = await buildGroups(req, assigns, tz);
    const scheduled = groups
      .filter((g) => g.dateStr >= monthStart && g.dateStr <= monthEnd)
      .map((g) => ({
        date: g.dateStr, planId: g.planId, serviceTypeName: g.serviceTypeName,
        status: g.positions.some((p) => p.status === "unconfirmed") ? "pending" : "confirmed",
        positions: g.positions, times: g.times,
      }));

    const blockouts = await PcBlockout.find(scoped(req, { personId: pid })).lean();
    const blockoutDays = new Set();
    for (const b of blockouts) {
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${year}-${mm}-${String(d).padStart(2, "0")}`;
        if (blockoutOccursOn(b, ds)) blockoutDays.add(ds);
      }
    }
    res.json({
      year, month,
      scheduled,
      blockoutDays: [...blockoutDays].sort(),
      blockouts: blockouts.map(dtoBlockout),
    });
  } catch (err) {
    console.error("[pc] GET /schedule/calendar:", err.message);
    res.status(500).json({ error: "Eroare la calendar." });
  }
});

/** Un blockout se întâmplă în ziua `ds` (YYYY-MM-DD)? Ține cont de repeat. */
function blockoutOccursOn(b, ds) {
  if (ds < b.startDate) {
    // pt. repeat, poate apărea și înainte de endDate inițial? repeat începe de la startDate
  }
  if (b.repeat === "none" || !b.repeat) return ds >= b.startDate && ds <= b.endDate;
  if (ds < b.startDate) return false;
  const spanDays = Math.max(0, Math.round((new Date(b.endDate) - new Date(b.startDate)) / 86400000));
  // verifică dacă ds cade într-o fereastră recurentă [occStart, occStart+span]
  if (b.repeat === "weekly") {
    return weekdayOf(ds) === weekdayOf(b.startDate) || within(b, ds, spanDays, (o) => weekdayOf(o) === weekdayOf(b.startDate));
  }
  if (b.repeat === "monthly") {
    return ds.slice(8) === b.startDate.slice(8) || within(b, ds, spanDays, (o) => o.slice(8) === b.startDate.slice(8));
  }
  if (b.repeat === "yearly") {
    return ds.slice(5) === b.startDate.slice(5) || within(b, ds, spanDays, (o) => o.slice(5) === b.startDate.slice(5));
  }
  return false;
}
function within(b, ds, spanDays, matchStart) {
  if (spanDays === 0) return false;
  for (let k = 1; k <= spanDays; k++) {
    const o = isoShift(ds, -k);
    if (o >= b.startDate && matchStart(o)) return true;
  }
  return false;
}
const isoShift = (ds, days) => { const d = new Date(ds + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

const dtoBlockout = (b) => ({
  id: b._id, startDate: b.startDate, endDate: b.endDate, allDay: b.allDay,
  startTime: b.startTime, endTime: b.endTime, repeat: b.repeat, reason: b.reason,
  type: b.type || "personal", // personal vs churchBlock (blocat de echipă) — pt. UI (non-deletabil self)
  label: b.startDate === b.endDate ? b.startDate : `${b.startDate} → ${b.endDate}`,
});

/* ───────── GET /blockouts — blockout-urile mele ───────── */
router.get("/blockouts", async (req, res) => {
  try {
    const pid = await viewerPerson(req);
    if (!pid) return res.json({ blockouts: [] });
    const tz = await campusTz(req);
    const todayStr = isoDate(new Date(), tz);
    const blockouts = await PcBlockout.find(scoped(req, { personId: pid })).sort({ startDate: 1 }).lean();
    // DOAR VIITOR: blockout care se termină azi/în viitor SAU care se repetă (perpetuu). Fără istoric.
    const future = blockouts.filter((b) => (b.repeat && b.repeat !== "none") || b.endDate >= todayStr);
    res.json({ blockouts: future.map(dtoBlockout) });
  } catch (err) { console.error("[pc] GET /schedule/blockouts:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── GET /blockouts/conflicts?start=&end= — programări în interval (pt. panoul de conflicte) ───────── */
router.get("/blockouts/conflicts", async (req, res) => {
  try {
    const pid = await viewerPerson(req);
    if (!pid) return res.json({ conflicts: [] });
    const start = String(req.query.start || ""); const end = String(req.query.end || start);
    if (!DATE_RE.test(start)) return res.status(400).json({ error: "start invalid (YYYY-MM-DD)." });
    const tz = await campusTz(req);
    const [assigns, person] = await Promise.all([
      viewerAssignments(req, pid),
      PcPerson.findOne(scoped(req, { _id: pid })).select("avatar firstName lastName").lean(),
    ]);
    const avatar = person?.avatar || "";
    const initials = [person?.firstName, person?.lastName].filter(Boolean).map((s) => s[0]).join("").toUpperCase();
    const groups = await buildGroups(req, assigns, tz);
    const conflicts = [];
    for (const g of groups) {
      if (g.dateStr >= start && g.dateStr <= (DATE_RE.test(end) ? end : start)) {
        for (const p of g.positions) {
          conflicts.push({ assignmentId: p.assignmentId, planId: g.planId, dateLabel: g.dateLabel, dateStr: g.dateStr, serviceTypeName: g.serviceTypeName, positionName: p.positionName, teamName: p.teamName, label: `${g.serviceTypeName}: ${p.positionName}`, status: p.status, avatar, initials });
        }
      }
    }
    res.json({ conflicts });
  } catch (err) { console.error("[pc] GET conflicts:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── POST /blockouts — creează (unul sau mai multe). Validare + dedup concurent. ───────── */
router.post("/blockouts", async (req, res) => {
  try {
    const pid = await viewerPerson(req);
    if (!pid) return res.status(400).json({ error: "Persoană inexistentă pentru acest cont." });
    const list = Array.isArray(req.body?.blockouts) ? req.body.blockouts : [req.body];
    const toCreate = [];
    for (const raw of list) {
      const startDate = String(raw?.startDate || "");
      const endDate = String(raw?.endDate || startDate);
      if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) return res.status(400).json({ error: "Dată invalidă (format YYYY-MM-DD)." });
      if (endDate < startDate) return res.status(400).json({ error: "Data de final e înaintea celei de început." });
      const allDay = raw?.allDay !== false;
      const repeat = ["none", "weekly", "monthly", "yearly"].includes(raw?.repeat) ? raw.repeat : "none";
      const reason = String(raw?.reason || "").trim();
      const startTime = allDay ? "" : String(raw?.startTime || "");
      const endTime = allDay ? "" : String(raw?.endTime || "");
      if (!allDay && startTime && endTime && endTime < startTime) return res.status(400).json({ error: "Ora de final e înaintea celei de început." });
      toCreate.push({ startDate, endDate, allDay, repeat, reason, startTime, endTime });
    }
    // ── Reguli lider (blockout) ──
    // Pre-încarcă programările viitoare ale persoanei + ziua fiecărui plan.
    const tzR = await campusTz(req);
    const myAssigns = await PcAssignment.find(scoped(req, { personId: pid, status: { $ne: "declined" } })).lean();
    const aPlanIds = [...new Set(myAssigns.map((a) => String(a.planId)))].map(OID).filter(Boolean);
    const aPlans = aPlanIds.length ? await PcPlan.find(scoped(req, { _id: { $in: aPlanIds } })).select("sortDate").lean() : [];
    const planDayStr = Object.fromEntries(aPlans.map((p) => [String(p._id), new Intl.DateTimeFormat("en-CA", { timeZone: tzR, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(p.sortDate))]));
    const assignByDay = {};
    myAssigns.forEach((a) => { const ds = planDayStr[String(a.planId)]; if (ds) (assignByDay[ds] = assignByDay[ds] || []).push(a); });
    const inRange = (ds, b) => ds >= b.startDate && ds <= b.endDate;
    // REGULĂ (David): blockout-ul NU se poate salva dacă se suprapune cu ORICE programare (pending SAU confirmată).
    // Conflictele sunt doar vizibile (view-only) în modal; aici serverul le respinge. ZERO auto-decline.
    const conflicts = [];
    for (const b of toCreate) {
      for (const [ds, arr] of Object.entries(assignByDay)) {
        if (inRange(ds, b)) for (const a of arr) conflicts.push({ assignmentId: a._id, planId: a.planId, dateStr: ds, status: a.status });
      }
    }
    if (conflicts.length) {
      return res.status(409).json({ error: "Nu poți pune blockout peste o programare. Rezolvă întâi din programul tău (accept/decline) sau vorbește cu planificatorul.", conflicts });
    }

    const created = [];
    for (const b of toCreate) {
      // Dedup concurent: dacă există deja identic (person+interval+allDay+repeat+reason), nu dubla.
      const existing = await PcBlockout.findOne(scoped(req, {
        personId: pid, startDate: b.startDate, endDate: b.endDate, allDay: b.allDay, repeat: b.repeat, reason: b.reason,
        startTime: b.startTime, endTime: b.endTime,
      })).select("_id").lean();
      if (existing) { created.push({ id: existing._id, deduped: true }); continue; }
      const doc = await PcBlockout.create(stamp(req, { personId: pid, ...b }));
      created.push({ id: doc._id, blockout: b });
    }

    // (fără auto-decline — conflictele blochează salvarea mai sus; nimic nu se refuză automat.)
    res.status(201).json({ ok: true, created: created.map((c) => ({ id: c.id, deduped: c.deduped })), count: created.length, autoDeclined: 0 });

    // Anunță adminii (email real) — după răspuns, fără să blocheze (cerință user „adminul sa le primeasca").
    const fresh = created.filter((c) => !c.deduped && c.blockout);
    if (fresh.length) {
      (async () => {
        try {
          const orgId = req.pcOrgId;
          const tz = await campusTz(req);
          const person = await PcPerson.findOne(scoped(req, { _id: pid })).select("firstName lastName").lean();
          const name = [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
          const groups = await buildGroups(req, await viewerAssignments(req, pid), tz);
          for (const c of fresh) {
            const conflictCount = groups.filter((g) => g.dateStr >= c.blockout.startDate && g.dateStr <= c.blockout.endDate).length;
            await notifyBlockoutCreated({ orgId, personName: name, blockout: c.blockout, conflictCount });
          }
        } catch (e) { console.error("[pc] blockout notify:", e.message); }
      })();
    }
  } catch (err) { console.error("[pc] POST /schedule/blockouts:", err.message); res.status(500).json({ error: "Eroare la salvarea blockout-ului." }); }
});

/* ───────── DELETE /blockouts/:id ───────── */
router.delete("/blockouts/:id", async (req, res) => {
  try {
    const pid = await viewerPerson(req);
    const b = await PcBlockout.findOneAndUpdate(scoped(req, { _id: OID(req.params.id), personId: pid }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!b) return res.status(404).json({ error: "Blockout inexistent." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE blockout:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── POST /assignments/:id/respond — accept/decline o poziție ───────── */
router.post("/assignments/:id/respond", async (req, res) => {
  try {
    const pid = await viewerPerson(req);
    const action = req.body?.action;
    if (!["accept", "decline"].includes(action)) return res.status(400).json({ error: "action invalid." });
    const a = await PcAssignment.findOne(scoped(req, { _id: OID(req.params.id), personId: pid }));
    if (!a) return res.status(404).json({ error: "Programare inexistentă." });
    const wasConfirmed = a.status === "confirmed";
    // REGULĂ (David): o programare deja confirmată NU mai poate fi refuzată (nici decline, nici prin blockout).
    if (action === "decline" && wasConfirmed) return res.status(409).json({ error: "Nu poți refuza o programare deja confirmată. Vorbește cu planificatorul." });
    if (action === "accept") { a.status = "confirmed"; a.acceptedAt = new Date(); }
    else { a.status = "declined"; a.declinedAt = new Date(); a.declineReason = req.body?.reason || ""; }
    await a.save();
    if (action === "decline") notifyAssignmentDeclined(a.toObject(), a.declineReason).catch(() => {});
    require("../services/messageService").logMessage(req.pcOrgId, { personId: pid, direction: "sent", planId: a.planId,
      subject: action === "accept" ? "Ai confirmat o programare" : "Ai refuzat o programare", body: "" });
    res.json({ ok: true, status: a.status });
  } catch (err) { console.error("[pc] respond:", err.message); res.status(500).json({ error: "Eroare la răspuns." }); }
});

/* ───────── POST /plans/:planId/respond — accept/decline TOATE pozițiile mele din plan ───────── */
router.post("/plans/:planId/respond", async (req, res) => {
  try {
    const pid = await viewerPerson(req);
    const action = req.body?.action;
    if (!["accept", "decline"].includes(action)) return res.status(400).json({ error: "action invalid." });
    const status = action === "accept" ? "confirmed" : "declined";
    const filter = scoped(req, { planId: OID(req.params.planId), personId: pid, status: "unconfirmed" });
    const affected = action === "decline" ? await PcAssignment.find(filter).lean() : [];
    const now = new Date();
    const setFields = action === "accept"
      ? { status, acceptedAt: now }
      : { status, declinedAt: now, declineReason: req.body?.reason || "" }; // erau unconfirmed → decline simplu
    const r = await PcAssignment.updateMany(filter, { $set: setFields });
    if (action === "decline" && affected.length) {
      // o singură notificare pe plan (reprezentativă) ca să nu spam-ăm liderul.
      notifyAssignmentDeclined({ ...affected[0], status: "declined" }, req.body?.reason || "").catch(() => {});
    }
    res.json({ ok: true, modified: r.modifiedCount });
  } catch (err) { console.error("[pc] plan respond:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── POST /accept-all — acceptă TOATE pozițiile mele neconfirmate ───────── */
router.post("/accept-all", async (req, res) => {
  try {
    const pid = await viewerPerson(req);
    if (!pid) return res.status(400).json({ error: "Persoană inexistentă." });
    const r = await PcAssignment.updateMany(scoped(req, { personId: pid, status: "unconfirmed" }), { $set: { status: "confirmed", acceptedAt: new Date() } });
    res.json({ ok: true, modified: r.modifiedCount });
  } catch (err) { console.error("[pc] accept-all:", err.message); res.status(500).json({ error: "Eroare." }); }
});

module.exports = router;
