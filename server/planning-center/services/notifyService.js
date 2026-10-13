/**
 * Notificări către lideri/admini (emailuri REALE prin emailService global).
 * - La REFUZ (decline): anunță liderul (repliesToPersonId) sau, în lipsă, adminii.
 * - La BLOCKOUT nou: anunță adminii (+ eventualele conflicte cu programări).
 * Fără provider configurat → { skipped:true } (nu aruncă). Sobru (text) ca să evite spam-ul.
 */
const emailService = require("../../services/emailService");
const { PcPerson, PcPermission, PcPlan, PcServiceType, PcPosition } = require("../models");

const primaryEmail = (p) => (p?.emails || []).find((e) => e.primary)?.address || (p?.emails || [])[0]?.address || null;
const fullName = (p) => (p ? [p.firstName, p.lastName].filter(Boolean).join(" ").trim() : "");
const roDate = (d) => (d ? new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" }) : "");

/** Emailurile adminilor org-ului (peoplePlansLevel administrator/orgAdmin). */
async function adminEmailsByOrg(orgId) {
  if (!orgId) return [];
  const perms = await PcPermission.find({ orgId, deletedAt: null, peoplePlansLevel: { $in: ["administrator", "orgAdmin"] } }).select("userId").lean();
  const userIds = perms.map((p) => p.userId).filter(Boolean);
  if (userIds.length === 0) return [];
  const admins = await PcPerson.find({ orgId, deletedAt: null, userId: { $in: userIds } }).select("emails").lean();
  return [...new Set(admins.map(primaryEmail).filter(Boolean))];
}

/** Anunță la refuzul unei programări. `assignment` = document lean (are orgId). */
async function notifyAssignmentDeclined(assignment, reason) {
  try {
    if (!assignment) return { skipped: true };
    const orgId = assignment.orgId;
    const [person, plan] = await Promise.all([
      PcPerson.findOne({ _id: assignment.personId }).select("firstName lastName").lean(),
      PcPlan.findOne({ _id: assignment.planId }).select("serviceTypeId sortDate").lean(),
    ]);
    const [st, pos] = await Promise.all([
      plan ? PcServiceType.findOne({ _id: plan.serviceTypeId }).select("name").lean() : null,
      assignment.positionId ? PcPosition.findOne({ _id: assignment.positionId }).select("name").lean() : null,
    ]);

    let emails = [];
    if (assignment.repliesToPersonId) {
      const leader = await PcPerson.findOne({ _id: assignment.repliesToPersonId }).select("emails").lean();
      const e = primaryEmail(leader);
      if (e) emails.push(e);
    }
    if (emails.length === 0) emails = await adminEmailsByOrg(orgId);
    if (emails.length === 0) return { skipped: true };

    const name = fullName(person) || "Cineva";
    const posName = assignment.isTemporaryPosition ? assignment.tempPositionName : (pos?.name || "o poziție");
    const when = roDate(plan?.sortDate);
    const subject = `${name} a refuzat o programare`;
    const text = `${name} a refuzat programarea${when ? ` pentru ${when}` : ""}${st?.name ? ` (${st.name})` : ""}.
Poziție: ${posName}${reason ? `\nMotiv: ${reason}` : ""}

Poți reprograma pe altcineva din aplicație.`;
    return emailService.sendEmail({ to: emails, subject, text });
  } catch (e) {
    console.error("[pc] notifyAssignmentDeclined:", e.message);
    return { error: true };
  }
}

/** Anunță adminii la un blockout nou. */
async function notifyBlockoutCreated({ orgId, personName, blockout, conflictCount = 0 }) {
  try {
    const emails = await adminEmailsByOrg(orgId);
    if (emails.length === 0) return { skipped: true };
    const range = blockout.startDate === blockout.endDate ? blockout.startDate : `${blockout.startDate} → ${blockout.endDate}`;
    const subject = `${personName || "Cineva"} a adăugat un blockout`;
    const text = `${personName || "Cineva"} nu e disponibil(ă): ${range}${blockout.repeat && blockout.repeat !== "none" ? ` (se repetă: ${blockout.repeat})` : ""}.
${blockout.reason ? `Motiv: ${blockout.reason}\n` : ""}${conflictCount > 0 ? `⚠️ ${conflictCount} programare(i) existente în acest interval — verifică în aplicație.` : "Fără conflicte cu programări existente."}`;
    return emailService.sendEmail({ to: emails, subject, text });
  } catch (e) {
    console.error("[pc] notifyBlockoutCreated:", e.message);
    return { error: true };
  }
}

module.exports = { notifyAssignmentDeclined, notifyBlockoutCreated, adminEmailsByOrg };
