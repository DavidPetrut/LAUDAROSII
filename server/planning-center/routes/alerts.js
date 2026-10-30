/**
 * Planning Center Alerts — latura VIEWER (mobil + web): ce alerte obligatorii am de confirmat + „Am înțeles".
 * Primesc alerta DOAR dacă sunt programat (ne-declinat) într-una din echipele-țintă ale alertei, pe planul ei,
 * alerta e activă (sent, sau scheduled cu scheduledAt<=acum) și nu am confirmat-o încă. /api/pc/v1/alerts.
 */
const express = require("express");
const mongoose = require("mongoose");
const { PcAlert, PcAlertAck, PcAssignment, PcPerson } = require("../models");
const { scoped, stamp } = require("../core/orgScope");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);

async function viewerPerson(req) {
  const p = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
  return p?._id || null;
}

/* ───────── GET /pending — alertele mele neconfirmate (pentru pop-up-ul obligatoriu) ───────── */
router.get("/pending", async (req, res) => {
  try {
    const pid = await viewerPerson(req);
    if (!pid) return res.json({ alerts: [] });
    const assigns = await PcAssignment.find(scoped(req, { personId: pid, status: { $ne: "declined" } })).select("planId teamId").lean();
    if (!assigns.length) return res.json({ alerts: [] });
    const teamsByPlan = {};
    for (const a of assigns) { const k = String(a.planId); (teamsByPlan[k] = teamsByPlan[k] || new Set()).add(String(a.teamId)); }
    const planIds = Object.keys(teamsByPlan).map(OID);
    const now = new Date();
    const alerts = await PcAlert.find(scoped(req, {
      planId: { $in: planIds },
      $or: [{ status: "sent" }, { status: "scheduled", scheduledAt: { $lte: now } }],
    })).sort({ createdAt: 1 }).lean();
    // doar cele care mă vizează (o echipă-țintă e printre echipele mele pe planul respectiv)
    const mine = alerts.filter((al) => (al.teamIds || []).some((t) => teamsByPlan[String(al.planId)]?.has(String(t))));
    if (!mine.length) return res.json({ alerts: [] });
    const acked = new Set((await PcAlertAck.find(scoped(req, { personId: pid, alertId: { $in: mine.map((a) => a._id) } })).select("alertId").lean()).map((a) => String(a.alertId)));
    const todo = mine.filter((a) => !acked.has(String(a._id)));
    const creatorIds = [...new Set(todo.map((a) => String(a.createdByPersonId)).filter((x) => x && x !== "null"))].map(OID);
    const creators = creatorIds.length ? await PcPerson.find(scoped(req, { _id: { $in: creatorIds } })).select("firstName lastName avatar").lean() : [];
    const cById = Object.fromEntries(creators.map((c) => [String(c._id), c]));
    res.json({
      alerts: todo.map((a) => {
        const c = cById[String(a.createdByPersonId)];
        return {
          id: a._id, title: a.title || "", body: a.body || "",
          attachments: a.attachments || [], links: a.links || [],
          by: c ? { name: [c.firstName, c.lastName].filter(Boolean).join(" "), avatar: c.avatar || "", initials: [c.firstName, c.lastName].filter(Boolean).map((s) => s[0]).join("").toUpperCase() } : null,
          at: a.sentAt || a.scheduledAt || a.createdAt,
        };
      }),
    });
  } catch (err) { console.error("[pc] GET /alerts/pending:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── POST /:alertId/ack — „Am înțeles" ───────── */
router.post("/:alertId/ack", async (req, res) => {
  try {
    const pid = await viewerPerson(req);
    if (!pid) return res.status(400).json({ error: "Persoană inexistentă." });
    const alertId = OID(req.params.alertId);
    if (!alertId) return res.status(400).json({ error: "ID invalid." });
    await PcAlertAck.updateOne(scoped(req, { alertId, personId: pid }), { $setOnInsert: stamp(req, { alertId, personId: pid, acknowledgedAt: new Date() }) }, { upsert: true });
    res.json({ ok: true });
  } catch (err) { if (err.code === 11000) return res.json({ ok: true }); console.error("[pc] POST ack:", err.message); res.status(500).json({ error: "Eroare." }); }
});

module.exports = router;
