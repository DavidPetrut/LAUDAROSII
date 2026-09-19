const nodemailer = require("nodemailer");

let transporter = null;

/**
 * Construieste (o singura data) transportul de email dintr-un cont comun definit
 * in env. Daca lipseste configurarea, emailul e dezactivat elegant (returneaza null).
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

/**
 * Trimite un email de broadcast de la contul comun, dar cu numele super-adminului
 * ca expeditor afisat. Destinatarii merg in BCC (nu isi vad adresele - GDPR).
 */
const sendBroadcastEmail = async (toEmails, { subject, text, fromName, replyTo }) => {
  const t = getTransporter();
  const emails = [...new Set(toEmails)].filter((e) => typeof e === "string" && e.includes("@"));
  if (!t || emails.length === 0) return { sent: 0, skipped: !t };
  const from = `"${fromName || "Laudăroșii"}" <${process.env.EMAIL_USER}>`;
  try {
    await t.sendMail({
      from,
      to: process.env.EMAIL_USER,
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

module.exports = { sendBroadcastEmail };
