/** Loghează mesaje în istoricul persoanei (Profile → MESSAGES). Fire-and-forget, nu aruncă. */
const { PcMessage } = require("../models");

async function logMessage(orgId, { personId, direction = "received", subject = "", body = "", read, relatedPlanId = null }) {
  try {
    if (!orgId || !personId) return;
    await PcMessage.create({
      orgId, personId, direction, subject, body,
      read: read !== undefined ? read : direction === "sent",
      relatedPlanId,
    });
  } catch (e) { /* non-fatal */ }
}

module.exports = { logMessage };
