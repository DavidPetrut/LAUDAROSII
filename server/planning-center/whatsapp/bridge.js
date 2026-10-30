/**
 * Puntea WhatsApp (Baileys) MULTI-SESIUNE — self-hosted, DOAR local (flag WHATSAPP_BRIDGE=1).
 * Ține MAI MULTE numere-robot conectate simultan: hub keyed pe `sessionId` (id-ul docului PcWhatsappSession).
 * Fiecare sesiune (creds+keys) se salvează în Mongo (PcWhatsappSession, 1 doc / număr) → supraviețuiește restart-urilor.
 *
 * NU se încarcă pe Render: `require("@whiskeysockets/baileys")` e LAZY, doar în start/authState.
 * Expune: startAll(), connectNew(), reconnect(number), logout(number), statuses(), status(number),
 *   listGroups(number), groupMembers(number, jid), syncGroup(number, jid, nums), inviteLink(number, jid),
 *   groupName(number, jid), renameGroup(number, jid, s), selfIds(number), normalizeNumber(raw).
 */
const { PcOrg } = require("../models");
const PcWhatsappSession = require("../models/PcWhatsappSession");

let orgId = null;
const hub = {}; // sessionId(string) -> { sessionId, sock, connState, currentQr, meInfo, lastError, sessionDoc, saveTimer, starting, number }

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
const locPart = (x) => (x || "").split("@")[0].split(":")[0];
const numOf = (sock) => normalizeNumber(locPart(sock?.user?.id)) || locPart(sock?.user?.id) || null;

function entryByNumber(number) {
  const n = normalizeNumber(number) || number;
  return Object.values(hub).find((x) => x.number === n);
}
function sockOf(number) {
  const e = entryByNumber(number);
  if (!e || !e.sock || e.connState !== "connected") throw new Error("Numărul-robot nu e conectat.");
  return e.sock;
}

/** Auth state (creds+keys) legat de o intrare hub (docul ei PcWhatsappSession). */
function useMongoAuthState(baileys, entry) {
  const { initAuthCreds, BufferJSON, proto } = baileys;
  const stored = entry.sessionDoc.data || {};
  const creds = stored.creds ? JSON.parse(JSON.stringify(stored.creds), BufferJSON.reviver) : initAuthCreds();
  const keys = stored.keys || {};

  const persist = () => {
    clearTimeout(entry.saveTimer);
    entry.saveTimer = setTimeout(async () => {
      try {
        const data = JSON.parse(JSON.stringify({ creds, keys }, BufferJSON.replacer));
        await PcWhatsappSession.updateOne({ _id: entry.sessionDoc._id },
          { $set: { data, status: entry.connState, me: entry.meInfo, lastError: entry.lastError, botNumber: entry.number || entry.sessionDoc.botNumber || null } });
      } catch (e) { /* ignoră erorile tranzitorii */ }
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

async function startEntry(baileys, entry) {
  if (entry.sock || entry.starting) return;
  entry.starting = true;
  try {
    const makeWASocket = baileys.default;
    const { DisconnectReason, Browsers, fetchLatestBaileysVersion } = baileys;
    const QRCode = require("qrcode");

    const { state, saveCreds } = useMongoAuthState(baileys, entry);
    let version;
    try { ({ version } = await fetchLatestBaileysVersion()); } catch { version = undefined; }

    entry.connState = "connecting";
    const sock = makeWASocket({
      auth: state, version, printQRInTerminal: false,
      browser: Browsers.appropriate("Chrome"), syncFullHistory: false,
      logger: require("pino")({ level: "silent" }),
    });
    entry.sock = sock;
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (u) => {
      const { connection, lastDisconnect, qr } = u;
      if (qr) {
        entry.connState = "qr";
        try { entry.currentQr = await QRCode.toDataURL(qr); } catch { entry.currentQr = null; }
      }
      if (connection === "open") {
        entry.connState = "connected"; entry.currentQr = null; entry.lastError = "";
        entry.meInfo = sock.user ? { id: sock.user.id, name: sock.user.name || sock.user.verifiedName || "" } : null;
        entry.number = numOf(sock);
        try {
          const oid = await getOrgId();
          // re-pairing același număr: scoatem docurile/intrările vechi cu acest număr (păstrăm sesiunea nouă)
          await PcWhatsappSession.updateMany({ orgId: oid, botNumber: entry.number, _id: { $ne: entry.sessionDoc._id }, deletedAt: null }, { $set: { deletedAt: new Date() } });
          Object.values(hub).forEach((x) => { if (x !== entry && x.number === entry.number) { try { x.sock?.end?.(); } catch {} delete hub[x.sessionId]; } });
          await PcWhatsappSession.updateOne({ _id: entry.sessionDoc._id }, { $set: { botNumber: entry.number, status: "connected", me: entry.meInfo, lastConnectedAt: new Date(), lastError: "" } });
        } catch {}
      }
      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason?.loggedOut;
        entry.sock = null;
        if (loggedOut) {
          entry.connState = "logged-out"; entry.lastError = "logged-out"; entry.meInfo = null;
          try { await PcWhatsappSession.updateOne({ _id: entry.sessionDoc._id }, { $set: { data: {}, status: "logged-out", me: null, lastError: "logged-out" } }); } catch {}
        } else {
          entry.connState = "connecting";
          setTimeout(() => { startEntry(baileys, entry).catch(() => {}); }, 3000); // reconectare
        }
      }
    });
  } catch (e) {
    entry.lastError = String(e?.message || e); entry.connState = "disconnected"; entry.sock = null;
  } finally {
    entry.starting = false;
  }
}

async function newEntry() {
  const oid = await getOrgId();
  const doc = await PcWhatsappSession.create({ orgId: oid, data: {} });
  const entry = { sessionId: String(doc._id), sock: null, connState: "disconnected", currentQr: null, meInfo: null, lastError: "", sessionDoc: doc.toObject ? doc.toObject() : doc, saveTimer: null, starting: false, number: null };
  hub[entry.sessionId] = entry;
  return entry;
}

/** Pairing număr NOU (QR). Reutilizează un pairing în curs (fără număr) dacă există. */
async function connectNew() {
  const baileys = require("@whiskeysockets/baileys");
  let entry = Object.values(hub).find((e) => !e.number && (e.connState === "qr" || e.connState === "connecting"));
  if (!entry) entry = await newEntry();
  await startEntry(baileys, entry);
  return { sessionId: entry.sessionId };
}

/** Reconectează un număr existent (din Mongo dacă nu e în hub). */
async function reconnect(number) {
  const baileys = require("@whiskeysockets/baileys");
  const existing = entryByNumber(number);
  if (existing) { await startEntry(baileys, existing); return { sessionId: existing.sessionId }; }
  const oid = await getOrgId();
  const d = await PcWhatsappSession.findOne({ orgId: oid, botNumber: normalizeNumber(number) || number, deletedAt: null }).lean();
  if (!d) throw new Error("Număr necunoscut.");
  const entry = { sessionId: String(d._id), sock: null, connState: "disconnected", currentQr: null, meInfo: null, lastError: "", sessionDoc: d, saveTimer: null, starting: false, number: d.botNumber || null };
  hub[entry.sessionId] = entry;
  await startEntry(baileys, entry);
  return { sessionId: entry.sessionId };
}

/** La boot: reconectează toate sesiunile deja pair-uite (au creds). */
async function startAll() {
  const baileys = require("@whiskeysockets/baileys");
  const oid = await getOrgId();
  const docs = await PcWhatsappSession.find({ orgId: oid, deletedAt: null }).lean();
  for (const d of docs) {
    if (!d.data?.creds || hub[String(d._id)]) continue;
    const entry = { sessionId: String(d._id), sock: null, connState: "disconnected", currentQr: null, meInfo: null, lastError: "", sessionDoc: d, saveTimer: null, starting: false, number: d.botNumber || null };
    hub[entry.sessionId] = entry;
    startEntry(baileys, entry).catch(() => {});
  }
  return { count: Object.keys(hub).length };
}

function statusOf(e) {
  return { sessionId: e.sessionId, number: e.number, connected: e.connState === "connected", state: e.connState, me: e.meInfo, qr: e.currentQr, error: e.lastError };
}
function statuses() { return Object.values(hub).map(statusOf); }
function status(number) { const e = entryByNumber(number); return e ? statusOf(e) : { number: normalizeNumber(number) || number, connected: false, state: "disconnected" }; }

/** Scoate un cont după sessionId (pt. un pairing pornit din greșeală, fără număr). */
async function removeAccount(sessionId) {
  const e = hub[sessionId];
  if (!e) return;
  try { if (e.sock) await e.sock.logout?.(); } catch {}
  try { e.sock?.end?.(); } catch {}
  try { await PcWhatsappSession.updateOne({ _id: e.sessionDoc._id }, { $set: { deletedAt: new Date(), status: "disconnected" } }); } catch {}
  delete hub[sessionId];
}

/** Delogare + reset sesiune pentru un număr. */
async function logout(number) {
  const e = entryByNumber(number);
  if (!e) return;
  try { if (e.sock) await e.sock.logout(); } catch {}
  e.sock = null; e.connState = "disconnected"; e.currentQr = null; e.meInfo = null; e.lastError = "";
  try { await PcWhatsappSession.updateOne({ _id: e.sessionDoc._id }, { $set: { data: {}, status: "disconnected", me: null, lastError: "", deletedAt: new Date() } }); } catch {}
  delete hub[e.sessionId];
}

/** Grupurile în care e numărul-robot: [{ jid, name, size, isAdmin, community, communityJid, isCommunity }]. */
async function listGroups(number) {
  const sock = sockOf(number);
  const all = await sock.groupFetchAllParticipating();
  const list = Object.values(all || {});
  const commName = {};
  list.forEach((g) => { if (g.isCommunity) commName[g.id] = g.subject || ""; });
  // Baileys 7.x poate lista participanții după LID → potrivim numărul ȘI LID-ul meu, + owner.
  const mine = new Set([locPart(sock.user?.id), locPart(sock.user?.lid)].filter(Boolean));
  const isMe = (p) => mine.has(locPart(p?.id)) || mine.has(locPart(p?.jid)) || mine.has(locPart(p?.lid));
  return list
    .filter((g) => !g.isCommunityAnnounce)
    .map((g) => {
      const me = (g.participants || []).find(isMe);
      const owner = mine.has(locPart(g.owner)) || mine.has(locPart(g.subjectOwner));
      return {
        jid: g.id, name: g.subject || "", size: (g.participants || []).length,
        isAdmin: (me ? (me.admin === "admin" || me.admin === "superadmin") : false) || owner,
        community: g.linkedParent ? (commName[g.linkedParent] || "") : "",
        communityJid: g.linkedParent || "",
        isCommunity: !!g.isCommunity,
      };
    });
}

/** Identificatorii robotului (număr + LID, partea locală) pt. numărul dat. */
function selfIds(number) {
  const e = entryByNumber(number);
  const u = e?.sock?.user;
  if (!u) return [];
  return [locPart(u.id), locPart(u.lid)].filter(Boolean);
}

/** Membrii unui grup ca numere de telefon. Rezolvă LID-urile (@lid) → număr prin signalRepository.lidMapping. */
async function groupMembers(number, jid) {
  const sock = sockOf(number);
  const meta = await sock.groupMetadata(jid);
  const parts = meta.participants || [];
  const lidMap = sock.signalRepository?.lidMapping;
  const lids = [...new Set(parts.map((p) => p.jid || p.id || "").filter((id) => id.includes("@lid")))];
  const pnByLid = {};
  if (lids.length && lidMap?.getPNsForLIDs) {
    try {
      const res = await lidMap.getPNsForLIDs(lids);
      (res || []).forEach((r) => { if (r?.lid && r?.pn) pnByLid[r.lid] = r.pn; });
    } catch { /* fără rezolvare → cad pe LID */ }
  }
  return parts.map((p) => {
    const id = p.jid || p.id || "";
    const resolved = id.includes("@lid") ? (pnByLid[id] || id) : id;
    return locPart(resolved);
  });
}

/** Sincronizează grupul cu lista-țintă de numere: scoate cine nu mai e, adaugă cine lipsește. */
async function syncGroup(number, jid, targetNumbersRaw) {
  const sock = sockOf(number);
  const target = [...new Set((targetNumbersRaw || []).map(normalizeNumber).filter(Boolean))];
  const current = await groupMembers(number, jid);
  const self = new Set(selfIds(number));
  const currentSet = new Set(current);
  const targetSet = new Set(target);

  const toAdd = target.filter((n) => !currentSet.has(n) && !self.has(n));
  const toRemove = current.filter((n) => !targetSet.has(n) && !self.has(n)); // nu te scoți pe tine (num sau LID)

  const added = [], removed = [], failed = [], needInvite = [];
  if (toRemove.length) {
    try {
      const res = await sock.groupParticipantsUpdate(jid, toRemove.map(jidOf), "remove");
      (res || []).forEach((r) => { const n = locPart(r.jid); (String(r.status) === "200" ? removed : failed).push(n); });
    } catch (e) { toRemove.forEach((n) => failed.push(n)); }
  }
  if (toAdd.length) {
    try {
      const res = await sock.groupParticipantsUpdate(jid, toAdd.map(jidOf), "add");
      (res || []).forEach((r) => {
        const n = locPart(r.jid); const st = String(r.status);
        if (st === "200") added.push(n);
        else if (st === "403" || st === "409") needInvite.push(n);
        else failed.push(n);
      });
    } catch (e) { toAdd.forEach((n) => needInvite.push(n)); }
  }
  return { added, removed, failed, needInvite, targetCount: target.length, currentCount: current.length };
}

async function inviteLink(number, jid) {
  const sock = sockOf(number);
  const code = await sock.groupInviteCode(jid);
  return `https://chat.whatsapp.com/${code}`;
}

async function groupName(number, jid) {
  try { const sock = sockOf(number); const m = await sock.groupMetadata(jid); return m.subject || ""; } catch { return ""; }
}

async function renameGroup(number, jid, subject) {
  const sock = sockOf(number);
  const s = String(subject || "").slice(0, 100).trim();
  if (!s) return "";
  await sock.groupUpdateSubject(jid, s);
  return s;
}

module.exports = {
  startAll, connectNew, reconnect, logout, removeAccount, statuses, status,
  listGroups, groupMembers, syncGroup, inviteLink, groupName, renameGroup, selfIds, normalizeNumber,
};
