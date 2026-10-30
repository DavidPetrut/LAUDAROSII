/**
 * Integrări calendar (OAuth) — Google Calendar. Utilizatorul se conectează din profil/modal;
 * scriem evenimente (repetiție + slujire) în calendarul lui. Apple = .ics (client), fără OAuth server.
 * NECESITĂ env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI (+ opțional PC_WEB_URL).
 * `router` = rute autentificate; `callback` = ruta PUBLICĂ unde redirectează Google (montată înainte de auth).
 */
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { PcCalendarToken, PcPerson } = require("../models");
const { scoped } = require("../core/orgScope");

const router = express.Router();
const callback = express.Router();

const CID = () => process.env.GOOGLE_CLIENT_ID || "";
const CSEC = () => process.env.GOOGLE_CLIENT_SECRET || "";
const REDIR = () => process.env.GOOGLE_REDIRECT_URI || "";
const WEB = () => process.env.PC_WEB_URL || "http://localhost:4100";
const SCOPES = "openid email https://www.googleapis.com/auth/calendar.events";

async function viewerPerson(req) {
  const p = await PcPerson.findOne(scoped(req, { userId: req.user.id })).select("_id").lean();
  return p?._id || null;
}

/* GET /google/connect → URL de consimțământ Google */
router.get("/google/connect", async (req, res) => {
  if (!CID() || !REDIR()) return res.json({ configured: false, error: "Google OAuth neconfigurat pe server (GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI)." });
  const pid = await viewerPerson(req);
  if (!pid) return res.status(400).json({ error: "Persoană inexistentă." });
  const state = jwt.sign({ personId: String(pid), orgId: String(req.pcOrgId) }, process.env.JWT_SECRET, { expiresIn: "15m" });
  const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
    client_id: CID(), redirect_uri: REDIR(), response_type: "code", scope: SCOPES,
    access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
  }).toString();
  res.json({ configured: true, url });
});

/* GET /google/status */
router.get("/google/status", async (req, res) => {
  const pid = await viewerPerson(req);
  if (!pid) return res.json({ connected: false, configured: !!CID() });
  const t = await PcCalendarToken.findOne(scoped(req, { personId: pid, provider: "google" })).lean();
  res.json({ connected: !!(t && t.refreshToken), email: t?.email || "", configured: !!CID() });
});

/* POST /google/disconnect */
router.post("/google/disconnect", async (req, res) => {
  const pid = await viewerPerson(req);
  if (pid) await PcCalendarToken.updateOne(scoped(req, { personId: pid, provider: "google" }), { $set: { deletedAt: new Date() } });
  res.json({ ok: true });
});

async function freshAccess(req, pid) {
  const t = await PcCalendarToken.findOne(scoped(req, { personId: pid, provider: "google" }));
  if (!t) return null;
  if (t.expiresAt && t.expiresAt.getTime() > Date.now() + 60000) return t.accessToken;
  if (!t.refreshToken) return t.accessToken || null;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: t.refreshToken, client_id: CID(), client_secret: CSEC(), grant_type: "refresh_token" }),
  });
  const j = await r.json();
  if (!j.access_token) return t.accessToken || null;
  t.accessToken = j.access_token; t.expiresAt = new Date(Date.now() + (j.expires_in || 3500) * 1000); await t.save();
  return j.access_token;
}

/* POST /google/events  { events: [{ summary, description, start(ISO), end(ISO), tz }] } */
router.post("/google/events", async (req, res) => {
  try {
    const pid = await viewerPerson(req);
    if (!pid) return res.status(400).json({ error: "Persoană inexistentă." });
    const access = await freshAccess(req, pid);
    if (!access) return res.status(409).json({ error: "Nu ești conectat la Google Calendar." });
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    const created = [];
    for (const e of events) {
      if (!e.start) continue;
      const body = { summary: String(e.summary || "Eveniment"), description: String(e.description || ""), start: { dateTime: e.start, timeZone: e.tz || "Europe/Bucharest" }, end: { dateTime: e.end || e.start, timeZone: e.tz || "Europe/Bucharest" } };
      try { const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", { method: "POST", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); const j = await r.json(); if (j.id) created.push({ id: j.id, htmlLink: j.htmlLink }); } catch { /* skip */ }
    }
    res.json({ ok: true, created: created.length, events: created });
  } catch (err) { console.error("[pc] gcal events:", err.message); res.status(500).json({ error: "Eroare la crearea evenimentelor." }); }
});

/* GET /  (callback public) — Google redirectează aici cu ?code&state */
callback.get("/", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.redirect(`${WEB()}/my-schedule?gcal=error`);
    let decoded;
    try { decoded = jwt.verify(String(state), process.env.JWT_SECRET); } catch { return res.redirect(`${WEB()}/my-schedule?gcal=error`); }
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: String(code), client_id: CID(), client_secret: CSEC(), redirect_uri: REDIR(), grant_type: "authorization_code" }),
    });
    const tok = await tokenRes.json();
    if (!tok.access_token) return res.redirect(`${WEB()}/my-schedule?gcal=error`);
    let email = "";
    try { const ui = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } }); email = (await ui.json()).email || ""; } catch { /* ok */ }
    const orgId = new mongoose.Types.ObjectId(decoded.orgId);
    const personId = new mongoose.Types.ObjectId(decoded.personId);
    const expiresAt = new Date(Date.now() + (tok.expires_in || 3500) * 1000);
    await PcCalendarToken.updateOne(
      { orgId, personId, provider: "google" },
      { $set: { accessToken: tok.access_token, expiresAt, email, deletedAt: null, ...(tok.refresh_token ? { refreshToken: tok.refresh_token } : {}) }, $setOnInsert: { orgId, personId, provider: "google" } },
      { upsert: true }
    );
    res.redirect(`${WEB()}/my-schedule?gcal=connected`);
  } catch (err) { console.error("[pc] gcal callback:", err.message); res.redirect(`${WEB()}/my-schedule?gcal=error`); }
});

module.exports = { router, callback };
