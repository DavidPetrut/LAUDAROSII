const nodemailer = require("nodemailer");

/**
 * Componenta GLOBALA de email, refolosibila oriunde in backend. UN SINGUR loc pentru TOT emailul
 * (invitatii, broadcast, programari Planning Center, notificari, orice adaugi in viitor).
 *
 * Integrare oriunde:
 *   const { sendEmail } = require("<cale>/services/emailService");
 *   await sendEmail({ to, subject, text, html });   // to poate fi string sau array
 *
 * ROBUST / DINAMIC: transportul SMTP incearca automat mai multe porturi si il cache-uieste pe
 * primul care se conecteaza. Unele hosturi blocheaza porturi SMTP (ex: Render blocheaza
 * 25/465/587, dar lasa 2525) — asa emailul "just works" fara sa modifici cod cand schimbi host.
 *
 * ENV: EMAIL_HOST, EMAIL_USER, EMAIL_PASS (login SMTP), EMAIL_PORT (preferat; fallback 2525/587/465),
 *      EMAIL_FROM (expeditor verificat; implicit EMAIL_USER), EMAIL_FROM_NAME (implicit "Laudarosii").
 * Fara EMAIL_HOST/USER/PASS, emailul e dezactivat elegant ({ skipped:true }, nu arunca).
 */

const envReady = () =>
  !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);

// Porturi incercate, in ordine: intai cel configurat, apoi fallback-uri uzuale.
const candidatePorts = () => {
  const configured = Number(process.env.EMAIL_PORT) || null;
  return [...new Set([configured, 2525, 587, 465].filter(Boolean))];
};

const buildTransport = (port) =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 20000,
  });

let cached = null; // { transporter, port }
let resolving = null; // promisiunea de rezolvare in curs (evita curse la cold start)

/** Primul transport care se conecteaza (cache-uit). Null daca niciun port nu merge. */
const getWorkingTransport = async () => {
  if (!envReady()) return null;
  if (cached) return cached.transporter;
  if (resolving) return resolving;
  resolving = (async () => {
    for (const port of candidatePorts()) {
      const t = buildTransport(port);
      try {
        await t.verify();
        cached = { transporter: t, port };
        console.log(`[email] transport activ pe portul ${port}`);
        return t;
      } catch (e) {
        console.warn(`[email] portul ${port} indisponibil: ${e.message}`);
      }
    }
    console.error("[email] niciun port SMTP disponibil (verifica EMAIL_* / reteaua hostului)");
    return null;
  })();
  try {
    return await resolving;
  } finally {
    resolving = null;
  }
};

const isConnError = (e) =>
  /timeout|econn|etimedout|esocket|connection|greeting|dns|enotfound/i.test(
    String((e && (e.message || e.code)) || ""),
  );

/** Trimite; daca pica din conexiune, reseteaza cache-ul si reincearca o data (poate alt port). */
const deliver = async (mailOptions) => {
  let t = await getWorkingTransport();
  if (!t) return { sent: 0, skipped: true };
  try {
    await t.sendMail(mailOptions);
    return { sent: 1, port: cached && cached.port };
  } catch (e) {
    if (isConnError(e)) {
      cached = null;
      t = await getWorkingTransport();
      if (t) {
        try {
          await t.sendMail(mailOptions);
          return { sent: 1, port: cached && cached.port };
        } catch (e2) {
          console.error("[email] send failed (retry):", e2.message);
          return { sent: 0, error: true };
        }
      }
    }
    console.error("[email] send failed:", e.message);
    return { sent: 0, error: true };
  }
};

const fromName = () => process.env.EMAIL_FROM_NAME || "Laudarosii";
const fromAddress = () => process.env.EMAIL_FROM || process.env.EMAIL_USER;
const from = (name) => `"${name || fromName()}" <${fromAddress()}>`;

const isEmailConfigured = () => envReady();

/** Stare email (fara a trimite): config prezenta + portul SMTP activ rezolvat. */
const emailHealth = async () => {
  if (!envReady()) return { configured: false };
  const t = await getWorkingTransport();
  return { configured: true, ok: !!t, activePort: cached && cached.port };
};

// Pastrat pentru compatibilitate (transport pe portul configurat, sincron). Pentru trimitere
// foloseste sendEmail (care are fallback de port).
const getTransporter = () =>
  envReady() ? buildTransport(Number(process.env.EMAIL_PORT) || 2525) : null;

/**
 * Trimite un email generic. `to`/`bcc` pot fi string sau array. Fara config -> { skipped:true }.
 */
const sendEmail = async ({ to, bcc, subject, text, html, replyTo }) => {
  if (!envReady()) return { sent: 0, skipped: true };
  return deliver({
    from: from(),
    ...(to && { to }),
    ...(bcc && { bcc }),
    subject: subject || "Notificare",
    ...(text && { text }),
    ...(html && { html }),
    ...(replyTo && { replyTo }),
  });
};

/**
 * Broadcast: un email de la contul comun, cu numele super-adminului ca expeditor afisat.
 * Destinatarii merg in BCC (nu isi vad adresele - GDPR).
 */
const sendBroadcastEmail = async (toEmails, { subject, text, fromName: displayName, replyTo }) => {
  const emails = [...new Set(toEmails)].filter((e) => typeof e === "string" && e.includes("@"));
  if (!envReady() || emails.length === 0) return { sent: 0, skipped: !envReady() };
  const r = await deliver({
    from: from(displayName),
    to: fromAddress(),
    bcc: emails,
    subject: subject || "Notificare",
    text,
    ...(replyTo && { replyTo }),
  });
  return r.sent ? { sent: emails.length } : { sent: 0, error: true };
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
  emailHealth,
  sendEmail,
  sendBroadcastEmail,
  sendInviteEmail,
};
