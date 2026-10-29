/**
 * Puntea WhatsApp (Baileys) — self-hosted, rulează DOAR local/always-on (flag WHATSAPP_BRIDGE=1).
 * Acționează ca un „linked device" (WhatsApp Web) al unui NUMĂR-ROBOT admin în grupuri.
 * Sesiunea (creds+keys) se salvează în Mongo (PcWhatsappSession), nu pe disc → supraviețuiește restart-urilor.
 *
 * NU se încarcă pe Render: `require("@whiskeysockets/baileys")` e LAZY, doar în start()/authState.
 * Expune: start(), status(), listGroups(), groupMembers(jid), syncGroup(jid, targetNumbers), inviteLink(jid),
 *         logoutAndReset(), normalizeNumber(raw). Faza 1 = un singur socket (un număr-robot).
 */
const { PcOrg } = require("../models");
const PcWhatsappSession = require("../models/PcWhatsappSession");

let sock = null;
let connState = "disconnected"; // disconnected|connecting|qr|connected|logged-out
let currentQr = null;           // data URL (PNG) al QR-ului curent, cât timp e nevoie de pairing
let meInfo = null;              // { id, name }
let lastError = "";
let orgId = null;
let sessionDoc = null;
let saveTimer = null;
let starting = false;

async function getOrgId() {
  if (orgId) return orgId;
  const org = await PcOrg.findOne({}).select("_id").lean();
  orgId = org ? org._id : null;
  return orgId;
}

/** Normalizează un număr la cifre E.164 fără „+": 07… → 407…, +40/0040 → 40…, păstrează prefixul de țară. */
function normalizeNumber(raw) {
  let s = String(raw || "").replace(/[^\d+]/g, "");
  if (!s) return null;
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("00")) s = s.slice(2);
  if (s.startsWith("0")) s = "40" + s.slice(1); // număr local RO fără prefix → +40
  s = s.replace(/\D/g, "");
  return s.length >= 10 ? s : null;
}
const jidOf = (num) => `${num}@s.whatsapp.net`;

/** Auth state stocat în Mongo (echivalentul useMultiFileAuthState, dar pe un document). */
async function useMongoAuthState(baileys) {
  const { initAuthCreds, BufferJSON, proto } = baileys;
  const oid = await getOrgId();
  sessionDoc = await PcWhatsappSession.findOne({ orgId: oid, deletedAt: null });
  if (!sessionDoc) sessionDoc = await PcWhatsappSession.create({ orgId: oid, data: {} });

  const stored = sessionDoc.data || {};
  const creds = stored.creds
    ? JSON.parse(JSON.stringify(stored.creds), BufferJSON.reviver)
    : initAuthCreds();
  const keys = stored.keys || {};

  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const data = JSON.parse(JSON.stringify({ creds, keys }, BufferJSON.replacer));
        await PcWhatsappSession.updateOne({ _id: sessionDoc._id }, { $set: { data, status: connState, me: meInfo, lastError } });
      } catch (e) { /* ignoră erorile de salvare tranzitorii */ }
    }, 800);
  };

  const state = {
    creds,
    keys: {
      get: (type, ids) => {
        const out = {};
        for (const id of ids) {
          let val = keys[`${type}-${id}`];
          if (val) {
            val = JSON.parse(JSON.stringify(val), BufferJSON.reviver);
            if (type === "app-state-sync-key" && proto?.Message?.AppStateSyncKeyData) {
              val = proto.Message.AppStateSyncKeyData.fromObject(val);
            }
          }
          out[id] = val;
        }
        return out;
      },
      set: (dataSet) => {
        for (const type in dataSet) {
          for (const id in dataSet[type]) {
            const val = dataSet[type][id];
            const k = `${type}-${id}`;
            if (val) keys[k] = JSON.parse(JSON.stringify(val, BufferJSON.replacer));
            else delete keys[k];
          }
        }
        persist();
      },
    },
  };
  return { state, saveCreds: () => persist() };
}

async function start() {
  if (sock || starting) return;
  starting = true;
  try {
    const baileys = require("@whiskeysockets/baileys");
    const makeWASocket = baileys.default;
    const { DisconnectReason, Browsers, fetchLatestBaileysVersion } = baileys;
    const QRCode = require("qrcode");

    const { state, saveCreds } = await useMongoAuthState(baileys);
    let version;
    try { ({ version } = await fetchLatestBaileysVersion()); } catch { version = undefined; }

    connState = "connecting";
    sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
      browser: Browsers.appropriate("Chrome"),
      syncFullHistory: false,
      logger: require("pino")({ level: "silent" }),
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (u) => {
      const { connection, lastDisconnect, qr } = u;
      if (qr) {
        connState = "qr";
        try { currentQr = await QRCode.toDataURL(qr); } catch { currentQr = null; }
      }
      if (connection === "open") {
        connState = "connected"; currentQr = null; lastError = "";
        meInfo = sock?.user ? { id: sock.user.id, name: sock.user.name || sock.user.verifiedName || "" } : null;
        try { await PcWhatsappSession.updateOne({ _id: sessionDoc?._id }, { $set: { status: "connected", me: meInfo, lastConnectedAt: new Date(), lastError: "" } }); } catch {}
      }
      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason?.loggedOut;
        sock = null;
        if (loggedOut) {
          connState = "logged-out"; lastError = "logged-out"; meInfo = null;
          try { await PcWhatsappSession.updateOne({ _id: sessionDoc?._id }, { $set: { data: {}, status: "logged-out", me: null, lastError: "logged-out" } }); } catch {}
        } else {
          connState = "connecting";
          setTimeout(() => { start().catch(() => {}); }, 3000); // reconectare
        }
      }
    });
  } catch (e) {
    lastError = String(e?.message || e); connState = "disconnected"; sock = null;
  } finally {
    starting = false;
  }
}

function status() {
  return { connected: connState === "connected", state: connState, me: meInfo, qr: currentQr, error: lastError };
}

async function ensureStarted() { if (!sock && connState !== "qr" && connState !== "connecting") await start(); }

/** Grupurile în care e numărul-robot: [{ jid, name, size, isAdmin, community, isCommunity }]. */
async function listGroups() {
  if (!sock) return [];
  const all = await sock.groupFetchAllParticipating();
  const list = Object.values(all || {});
  const commName = {};
  list.forEach((g) => { if (g.isCommunity) commName[g.id] = g.subject || ""; }); // comunitățile-părinte
  // Baileys 7.x poate lista participanții după LID (@lid), nu după număr → potrivim numărul ȘI LID-ul meu,
  // și acceptăm și creatorul grupului (owner) ca admin.
  const idNum = (x) => (x || "").split("@")[0].split(":")[0];
  const mine = new Set([idNum(sock.user?.id), idNum(sock.user?.lid)].filter(Boolean));
  const isMe = (p) => mine.has(idNum(p?.id)) || mine.has(idNum(p?.jid)) || mine.has(idNum(p?.lid));
  return list
    .filter((g) => !g.isCommunityAnnounce) // grupul-anunț al comunității nu e țintă de sync
    .map((g) => {
      const me = (g.participants || []).find(isMe);
      const owner = mine.has(idNum(g.owner)) || mine.has(idNum(g.subjectOwner)); // creatorul grupului/comunității
      return {
        jid: g.id, name: g.subject || "", size: (g.participants || []).length,
        isAdmin: (me ? (me.admin === "admin" || me.admin === "superadmin") : false) || owner,
        community: g.linkedParent ? (commName[g.linkedParent] || "") : "",
        communityJid: g.linkedParent || "",
        isCommunity: !!g.isCommunity,
      };
    });
}

/** Identificatorii robotului (număr + LID, partea locală) — ca să nu se scoată/numere pe el însuși. */
function selfIds() {
  if (!sock?.user) return [];
  const loc = (x) => (x || "").split("@")[0].split(":")[0];
  return [loc(sock.user.id), loc(sock.user.lid)].filter(Boolean);
}

/** Membrii unui grup ca numere (preferă numărul de telefon `jid` în fața LID-ului, fără sufix). */
async function groupMembers(jid) {
  if (!sock) return [];
  const meta = await sock.groupMetadata(jid);
  return (meta.participants || []).map((p) => ((p.jid || p.id) || "").split("@")[0].split(":")[0]);
}

/**
 * Sincronizează grupul cu lista-țintă de numere: scoate cine nu mai e, adaugă cine lipsește.
 * Returnează { added, removed, failed, needInvite } — needInvite = cei care nu pot fi adăugați direct (privacy).
 */
async function syncGroup(jid, targetNumbersRaw) {
  if (!sock) throw new Error("Puntea nu e conectată.");
  const target = [...new Set((targetNumbersRaw || []).map(normalizeNumber).filter(Boolean))];
  const current = await groupMembers(jid);
  const self = new Set(selfIds());
  const currentSet = new Set(current);
  const targetSet = new Set(target);

  const toAdd = target.filter((n) => !currentSet.has(n) && !self.has(n));
  const toRemove = current.filter((n) => !targetSet.has(n) && !self.has(n)); // nu te scoți pe tine (robotul: număr sau LID)

  const added = [], removed = [], failed = [], needInvite = [];

  if (toRemove.length) {
    try {
      const res = await sock.groupParticipantsUpdate(jid, toRemove.map(jidOf), "remove");
      (res || []).forEach((r) => { const n = (r.jid || "").split("@")[0]; (String(r.status) === "200" ? removed : failed).push(n); });
    } catch (e) { toRemove.forEach((n) => failed.push(n)); }
  }
  if (toAdd.length) {
    try {
      const res = await sock.groupParticipantsUpdate(jid, toAdd.map(jidOf), "add");
      (res || []).forEach((r) => {
        const n = (r.jid || "").split("@")[0]; const st = String(r.status);
        if (st === "200") added.push(n);
        else if (st === "403" || st === "409") needInvite.push(n); // privacy / nu poate fi adăugat direct
        else failed.push(n);
      });
    } catch (e) { toAdd.forEach((n) => needInvite.push(n)); }
  }
  return { added, removed, failed, needInvite, targetCount: target.length, currentCount: current.length };
}

async function inviteLink(jid) {
  if (!sock) throw new Error("Puntea nu e conectată.");
  const code = await sock.groupInviteCode(jid);
  return `https://chat.whatsapp.com/${code}`;
}

/** Numele (subject) curent al grupului. */
async function groupName(jid) {
  if (!sock) return "";
  try { const m = await sock.groupMetadata(jid); return m.subject || ""; } catch { return ""; }
}

/** Redenumește grupul (ex. „SIM1 - 1 noi - Alex Lascae"). */
async function renameGroup(jid, subject) {
  if (!sock) throw new Error("Puntea nu e conectată.");
  const s = String(subject || "").slice(0, 100).trim();
  if (!s) return "";
  await sock.groupUpdateSubject(jid, s);
  return s;
}

/** Delogare + reset sesiune (pt. re-pair cu alt număr). */
async function logoutAndReset() {
  try { if (sock) await sock.logout(); } catch {}
  sock = null; connState = "disconnected"; currentQr = null; meInfo = null; lastError = "";
  try { const oid = await getOrgId(); await PcWhatsappSession.updateOne({ orgId: oid }, { $set: { data: {}, status: "disconnected", me: null, lastError: "" } }); } catch {}
}

module.exports = { start, ensureStarted, status, listGroups, groupMembers, syncGroup, inviteLink, groupName, renameGroup, logoutAndReset, normalizeNumber, selfIds };
