/**
 * Scheduler Planning Center Alerts (in-proces, setInterval/minut, fără pachete noi): la fiecare minut
 * ia alertele `scheduled` ajunse la scadență (scheduledAt<=acum, încă ne-procesate) → le trece pe `sent`
 * (devin active pentru pop-up la poll) și trimite push O SINGURĂ DATĂ (gated de PC_ALERTS_PUSH în alertNotify).
 */
const { PcAlert } = require("./models");
const { sendAlertPush } = require("./services/alertNotify");

function startAlertScheduler() {
  const tick = async () => {
    try {
      const now = new Date();
      const due = await PcAlert.find({ status: "scheduled", scheduledAt: { $lte: now }, pushedAt: null, deletedAt: null }).limit(100).lean();
      for (const a of due) {
        await PcAlert.updateOne({ _id: a._id }, { $set: { status: "sent", sentAt: now, pushedAt: now } });
        try { await sendAlertPush(a.orgId, { ...a, status: "sent" }); } catch (e) { console.error("[pc] alert scheduler push:", e.message); }
      }
    } catch (e) { console.error("[pc] alert scheduler:", e.message); }
  };
  setInterval(tick, 60 * 1000);
  tick();
}

module.exports = { startAlertScheduler };
