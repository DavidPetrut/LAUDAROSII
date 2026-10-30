/**
 * Push pentru Planning Center Alerts. Rezolvă destinatarii (oamenii programați ne-declinați în echipele-țintă
 * pe planul alertei) → PcPerson.userId → User.deviceTokens → Expo push. Folosit din rute (trimite acum) ȘI din
 * scheduler (alerte programate). GATED de env PC_ALERTS_PUSH=1 — altfel NU pleacă niciun push (regula „zero
 * notificări autonome la oameni reali"). David pornește flagul când vrea live.
 */
const { PcAssignment, PcPerson } = require("../models");
const User = require("../../models/User");
const { sendExpoPush } = require("../../services/pushService");

async function resolveAlertTokens(orgId, alert) {
  if (!alert || !alert.teamIds || !alert.teamIds.length) return [];
  const personIds = await PcAssignment.distinct("personId", {
    orgId, deletedAt: null, planId: alert.planId, teamId: { $in: alert.teamIds }, status: { $ne: "declined" },
  });
  if (!personIds.length) return [];
  const persons = await PcPerson.find({ orgId, _id: { $in: personIds } }).select("userId").lean();
  const userIds = persons.map((p) => p.userId).filter(Boolean);
  if (!userIds.length) return [];
  const users = await User.find({ _id: { $in: userIds } }).select("deviceTokens").lean();
  return [...new Set(users.flatMap((u) => u.deviceTokens || []))];
}

async function sendAlertPush(orgId, alert) {
  if (process.env.PC_ALERTS_PUSH !== "1") return { skipped: "flag_off" };
  const tokens = await resolveAlertTokens(orgId, alert);
  if (!tokens.length) return { skipped: "no_tokens" };
  const title = `🔔 ALERTĂ: ${alert.title || ""}`.trim();
  const body = String(alert.body || alert.title || "").slice(0, 300);
  return sendExpoPush(tokens, { title, body, data: { type: "pc_alert", alertId: String(alert._id), screen: "PcAlerts" }, channelId: "alerts" });
}

module.exports = { resolveAlertTokens, sendAlertPush };
