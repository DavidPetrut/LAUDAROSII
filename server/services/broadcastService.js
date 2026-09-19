const { Broadcast, User } = require("../models");
const { sendExpoPush } = require("./pushService");
const { sendBroadcastEmail } = require("./emailService");

/**
 * Rezolva userii vizati de un broadcast dupa taguri si/sau roluri. Fara niciun
 * criteriu = toti userii activi. Intoarce doar campurile necesare livrarii.
 */
const resolveRecipients = async ({ targetTags = [], targetRoles = [] }) => {
  const or = [];
  if (targetTags.length) or.push({ tags: { $in: targetTags } });
  if (targetRoles.length) or.push({ role: { $in: targetRoles } });
  const query = or.length
    ? { $and: [{ "status.isActive": true }, { $or: or }] }
    : { "status.isActive": true };
  return User.find(query).select("email deviceTokens");
};

/**
 * Numara destinatarii unui segment (pentru previzualizare in timp real).
 */
const countAudience = async (target) => {
  const users = await resolveRecipients(target);
  return users.length;
};

/**
 * Livreaza un broadcast: push la toate device-urile vizate + optional email.
 * Actualizeaza statusul si numarul de destinatari.
 */
const deliverBroadcast = async (broadcast) => {
  try {
    const users = await resolveRecipients(broadcast);
    const tokens = users.flatMap((u) => u.deviceTokens || []);
    await sendExpoPush(tokens, {
      title: broadcast.title || "Anunț",
      body: broadcast.message,
      data: { type: "broadcast" },
    });
    if (broadcast.sendEmail) {
      const emails = users.map((u) => u.email).filter(Boolean);
      await sendBroadcastEmail(emails, {
        subject: broadcast.title || "Anunț",
        text: broadcast.message,
        fromName: broadcast.fromName,
      });
    }
    broadcast.status = "sent";
    broadcast.sentAt = new Date();
    broadcast.recipientCount = users.length;
    await broadcast.save();
  } catch (e) {
    broadcast.status = "failed";
    await broadcast.save();
  }
  return broadcast;
};

/**
 * Porneste un scheduler simplu in proces: la fiecare minut livreaza broadcast-urile
 * programate care au devenit scadente. Fara pachete noi (setInterval).
 */
const startBroadcastScheduler = () => {
  const tick = async () => {
    try {
      const due = await Broadcast.find({
        status: "pending",
        sendAt: { $lte: new Date() },
      }).limit(20);
      for (const b of due) await deliverBroadcast(b);
    } catch (e) {}
  };
  setInterval(tick, 60 * 1000);
  tick();
};

module.exports = { resolveRecipients, countAudience, deliverBroadcast, startBroadcastScheduler };
