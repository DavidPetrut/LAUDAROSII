const nodemailer = require("nodemailer");

let transporter = null;

/**
 * Componenta GLOBALA de email, refolosibila oriunde in backend. Transportul se
 * construieste o singura data dintr-un cont SMTP comun definit in env (merge cu
 * orice provider: Brevo/SendGrid/Resend/Gmail). Fara configurare, emailul e
 * dezactivat elegant (functiile intorc { skipped:true }, nu arunca).
 *
 * ENV: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS (login SMTP),
 *      EMAIL_FROM (adresa expeditor verificata; implicit EMAIL_USER),
 *      EMAIL_FROM_NAME (numele afisat; implicit "Laudarosii").
 */
const getTransporter = () => {
  if (transporter) return transporter;
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return null;
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 587,
    secure: Number(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  return transporter;
};

const isEmailConfigured = () => !!getTransporter();

const fromName = () => process.env.EMAIL_FROM_NAME || "Laudarosii";
const fromAddress = () => process.env.EMAIL_FROM || process.env.EMAIL_USER;
const from = (name) => `"${name || fromName()}" <${fromAddress()}>`;

/**
 * Trimite un email generic. `to` poate fi string sau array; `bcc` la fel. Fara
 * transport configurat -> { skipped:true }. Nu arunca.
 */
const sendEmail = async ({ to, bcc, subject, text, html, replyTo }) => {
  const t = getTransporter();
  if (!t) return { sent: 0, skipped: true };
  try {
    await t.sendMail({
      from: from(),
      ...(to && { to }),
      ...(bcc && { bcc }),
      subject: subject || "Notificare",
      ...(text && { text }),
      ...(html && { html }),
      ...(replyTo && { replyTo }),
    });
    return { sent: 1 };
  } catch (e) {
    return { sent: 0, error: true };
  }
};

/**
 * Broadcast: un email de la contul comun, cu numele super-adminului ca expeditor
 * afisat. Destinatarii merg in BCC (nu isi vad adresele - GDPR).
 */
const sendBroadcastEmail = async (toEmails, { subject, text, fromName: displayName, replyTo }) => {
  const t = getTransporter();
  const emails = [...new Set(toEmails)].filter((e) => typeof e === "string" && e.includes("@"));
  if (!t || emails.length === 0) return { sent: 0, skipped: !t };
  try {
    await t.sendMail({
      from: from(displayName),
      to: fromAddress(),
      bcc: emails,
      subject: subject || "Notificare",
      text,
      ...(replyTo && { replyTo }),
    });
    return { sent: emails.length };
  } catch (e) {
    return { sent: 0, error: true };
  }
};

const escapeHtml = (s) =>
  String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/**
 * Email de invitatie in aplicatie, cu link de setare parola. Sobru (fara imagini,
 * un singur CTA) ca sa evite filtrele de spam.
 */
const sendInviteEmail = async ({ to, fullName, link, expiresDays = 7 }) => {
  const hi = fullName ? `Salut, ${escapeHtml(fullName)}!` : "Salut!";
  const subject = "Ai fost invitat in aplicatia Laudarosii";
  const text = `${fullName ? "Salut, " + fullName + "!" : "Salut!"}

Ai fost invitat sa faci parte din aplicatia Laudarosii.
Seteaza-ti parola si intra in cont aici:
${link}

Linkul expira in ${expiresDays} zile. Daca nu te asteptai la acest email, il poti ignora.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f2430">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <tr><td style="background:#7c3aed;padding:18px 24px;color:#fff;font-size:18px;font-weight:bold">Laudarosii</td></tr>
      <tr><td style="padding:24px">
        <p style="font-size:16px;margin:0 0 12px">${hi}</p>
        <p style="font-size:14px;line-height:1.6;margin:0 0 20px;color:#374151">Ai fost invitat sa faci parte din aplicatia <b>Laudarosii</b>. Apasa butonul de mai jos ca sa-ti setezi parola si sa intri in cont.</p>
        <p style="margin:0 0 24px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;font-size:15px">Seteaza-ti parola</a></p>
        <p style="font-size:12px;color:#6b7280;margin:0 0 4px">Sau copiaza linkul:</p>
        <p style="font-size:12px;color:#7c3aed;word-break:break-all;margin:0 0 16px">${escapeHtml(link)}</p>
        <p style="font-size:12px;color:#9ca3af;margin:0">Linkul expira in ${expiresDays} zile. Daca nu te asteptai la acest email, il poti ignora.</p>
      </td></tr>
    </table>
  </td></tr></table>
  </body></html>`;
  return sendEmail({ to, subject, text, html });
};

module.exports = {
  getTransporter,
  isEmailConfigured,
  sendEmail,
  sendBroadcastEmail,
  sendInviteEmail,
};
