/**
 * Email de PROGRAMARE (§18, [SCHED-EMAIL-UI]) — CEL MAI IMPORTANT lucru (cerință user).
 * Reutilizează emailService-ul global al app-ului (nodemailer/Brevo, provider-agnostic).
 * Trimite UN email per persoană cu toate programările ei pe un plan + butoane Accept/Decline
 * (link-uri publice tokenizate care NU necesită login).
 */
const emailService = require("../../services/emailService");

const esc = (s) =>
  String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function publicBase() {
  return process.env.PUBLIC_BASE_URL || "https://laudarosii-api.onrender.com";
}
function respondUrl(token, action) {
  return `${publicBase()}/api/pc-respond/${token}?a=${action}`;
}

/**
 * assignments: [{ positionName, teamName, dateLabel, serviceTypeName, timeLabels:[{label,sub}], responseToken }]
 */
function buildScheduleEmail({ personName, assignments, repliesToName, churchName }) {
  const subject = "Ai fost programat — confirmă disponibilitatea";
  const greeting = personName ? `Salut, ${esc(personName)},` : "Salut,";

  const blocks = assignments
    .map((a) => {
      const timesRows = (a.timeLabels || [])
        .map((t) => `<div style="font-size:13px;color:#374151;margin:2px 0"><b>${esc(t.label)}</b>${t.sub ? " — " + esc(t.sub) : ""}</div>`)
        .join("");
      const accept = respondUrl(a.responseToken, "accept");
      const decline = respondUrl(a.responseToken, "decline");
      return `
      <tr><td style="padding:18px 0 6px">
        <div style="font-size:18px;font-weight:bold;color:#111827">${esc(a.dateLabel)}</div>
        <div style="font-size:13px;color:#6b7280">${esc(a.serviceTypeName || "")}</div>
      </td></tr>
      <tr><td style="background:#f3f4f6;border-radius:10px;padding:14px 16px">
        <div style="font-size:15px;font-weight:bold;color:#111827;margin-bottom:6px">${esc(a.positionName)}${a.teamName ? ` <span style="color:#6b7280;font-weight:normal">(${esc(a.teamName)})</span>` : ""}</div>
        ${timesRows}
        <div style="margin-top:14px">
          <a href="${accept}" style="display:inline-block;background:#21c063;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:bold;font-size:14px;margin-right:8px">Accept</a>
          <a href="${decline}" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:bold;font-size:14px">Decline</a>
        </div>
      </td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f2430">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <tr><td style="background:#141414;padding:18px 24px;color:#86C13F;font-size:18px;font-weight:bold">${esc(churchName || "Planificare")}</td></tr>
      <tr><td style="padding:22px 24px">
        <p style="font-size:16px;margin:0 0 10px">${greeting}</p>
        <p style="font-size:14px;line-height:1.6;margin:0 0 6px;color:#374151">Ai fost programat pentru următoarele date. Răspunde apăsând butonul potrivit mai jos.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${blocks}</table>
        <p style="font-size:13px;color:#6b7280;margin:22px 0 0">Mulțumim,<br>${esc(repliesToName || churchName || "Echipa")}</p>
      </td></tr>
      <tr><td style="background:#fafafa;border-top:1px solid #eee;padding:12px 24px;color:#9ca3af;font-size:12px">${esc(churchName || "")} · Planificare</td></tr>
    </table>
  </td></tr></table>
  </body></html>`;

  const text = `${greeting}

Ai fost programat pentru:
${assignments.map((a) => `- ${a.dateLabel} — ${a.positionName}${a.teamName ? ` (${a.teamName})` : ""}
  Accept: ${respondUrl(a.responseToken, "accept")}
  Decline: ${respondUrl(a.responseToken, "decline")}`).join("\n")}

Mulțumim,
${repliesToName || churchName || "Echipa"}`;

  return { subject, html, text };
}

async function sendScheduleEmail({ to, personName, assignments, repliesToName, replyToEmail, churchName }) {
  const { subject, html, text } = buildScheduleEmail({ personName, assignments, repliesToName, churchName });
  return emailService.sendEmail({ to, subject, html, text, replyTo: replyToEmail });
}

module.exports = { sendScheduleEmail, buildScheduleEmail };
