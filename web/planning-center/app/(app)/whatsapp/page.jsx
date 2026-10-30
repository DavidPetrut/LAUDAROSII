"use client";
/**
 * WhatsApp — sincronizarea grupurilor cu Matrix-ul. MULTI-NUMĂR + LUCRĂRI editabile.
 * Landing: numere conectate (cu „×" la pairing greșit) + carduri de LUCRĂRI (nume/imagine/număr, editabile).
 * Click pe o lucrare → ecran scoped (conexiunea ei, grupurile ei, seed + adaugă grup doar ale ei).
 * O mapare = echipă + săptămâna-din-lună + nume + lider + lucrare(+număr). Punte LOCAL. Nimic pe oameni reali fără click.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { whatsappApi } from "@/lib/api/client";

/* ── Combobox căutabil ── */
function Combo({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const sel = options.find((o) => String(o.value) === String(value));
  const filtered = q ? options.filter((o) => `${o.label} ${o.sub || ""}`.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <div className={`combo ${disabled ? "dis" : ""}`} ref={ref}>
      <button type="button" className="combo-btn" disabled={disabled} onClick={() => setOpen((v) => !v)}>
        <span className={sel ? "combo-val" : "combo-ph"}>{sel ? sel.label : placeholder}</span>
        <span className="combo-car">▾</span>
      </button>
      {open && (
        <div className="combo-pop">
          <input autoFocus className="combo-search" placeholder="caută…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="combo-list">
            {filtered.length === 0 ? <div className="combo-empty">Niciun rezultat</div> : filtered.map((o) => (
              <button type="button" key={o.value} className={`combo-opt ${String(o.value) === String(value) ? "on" : ""}`}
                onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}>
                <span className="combo-ol">{o.badge && <span className="combo-badge">{o.badge}</span>}{o.label}</span>{o.sub && <span className="combo-os">{o.sub}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <style jsx>{`
        .combo { position: relative; }
        .combo-btn { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 8px; height: 40px; padding: 0 12px; font-size: 13.5px; cursor: pointer; text-align: left; }
        .combo.dis .combo-btn { opacity: .5; cursor: default; }
        .combo-btn:hover { border-color: var(--text-faint); }
        .combo-val { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .combo-ph { color: var(--text-faint); }
        .combo-car { color: var(--text-faint); font-size: 10px; flex: none; }
        .combo-pop { position: absolute; z-index: 130; top: calc(100% + 4px); left: 0; right: 0; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 9px; box-shadow: 0 14px 40px rgba(0,0,0,.5); padding: 7px; }
        .combo-search { width: 100%; background: var(--bg); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 32px; padding: 0 10px; font-size: 13px; outline: none; margin-bottom: 6px; }
        .combo-search:focus { border-color: var(--primary); }
        .combo-list { max-height: 240px; overflow: auto; display: flex; flex-direction: column; gap: 2px; }
        .combo-empty { color: var(--text-faint); font-size: 12.5px; padding: 12px; text-align: center; }
        .combo-opt { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; background: transparent; border: none; color: var(--text); border-radius: 6px; padding: 8px 10px; cursor: pointer; text-align: left; }
        .combo-opt:hover { background: var(--surface-2); }
        .combo-opt.on { background: rgba(37,211,102,.14); }
        .combo-ol { font-size: 13.5px; display: flex; align-items: center; gap: 7px; }
        .combo-badge { font-size: 9.5px; font-weight: 800; letter-spacing: .4px; text-transform: uppercase; background: var(--surface); border: 1px solid var(--border-strong); color: var(--text-faint); border-radius: 5px; padding: 1px 5px; }
        .combo-os { font-size: 11.5px; color: var(--text-faint); }
      `}</style>
    </div>
  );
}

const waIcon = (s = 16) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="#25d366"><path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.02ZM12.04 20.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23a8.2 8.2 0 0 1 8.23 8.24c0 4.54-3.7 8.23-8.24 8.23Z"/></svg>
);

function readImage(file, cb) {
  if (!file) return;
  if (file.size > 1500000) { alert("Imaginea e prea mare (max ~1.5MB)."); return; }
  const r = new FileReader(); r.onload = () => cb(String(r.result)); r.readAsDataURL(file);
}

/* ── Cardul unui NUMĂR-robot ── */
function AccountCard({ a, busy, onLogout, onReconnect, onRemove }) {
  return (
    <div className={`ac ${a.connected ? "on" : ""}`}>
      {!a.connected && <button className="ac-rm" title="Scoate acest pairing" onClick={onRemove}>×</button>}
      {a.connected ? (
        <>
          <div className="ac-row"><span className="wa-dot ok" /><div className="ac-main"><div className="ac-name">{a.me?.name || a.number}</div><div className="ac-sub">{a.number}</div></div></div>
          <button className="ac-x" disabled={busy === "logout" + a.number} onClick={onLogout}>Deloghează</button>
        </>
      ) : a.state === "qr" && a.qr ? (
        <div className="ac-qr"><img src={a.qr} alt="QR" width="150" height="150" /><div className="ac-qrt">Scanează: WhatsApp → Dispozitive conectate → Conectează un dispozitiv.</div></div>
      ) : (
        <>
          <div className="ac-row"><span className="wa-dot" /><div className="ac-main"><div className="ac-name">{a.number || "Număr nou"}</div><div className="ac-sub">{a.state === "logged-out" ? "Deconectat (logout/ban)" : a.state === "connecting" ? "Se conectează…" : "Neconectat"}</div></div></div>
          {a.number && <button className="ac-x" disabled={busy === "conn" + a.number} onClick={onReconnect}>Reconectează</button>}
        </>
      )}
      <style jsx>{`
        .ac { position: relative; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 11px; padding: 12px 14px; display: flex; flex-direction: column; gap: 9px; min-width: 240px; }
        .ac.on { border-color: rgba(37,211,102,.35); }
        .ac-rm { position: absolute; top: 7px; right: 8px; background: transparent; border: none; color: var(--text-faint); font-size: 18px; line-height: 1; cursor: pointer; padding: 0 3px; }
        .ac-rm:hover { color: var(--danger); }
        .ac-row { display: flex; align-items: center; gap: 10px; }
        .ac-main { min-width: 0; }
        .ac-name { color: var(--text); font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ac-sub { color: var(--text-faint); font-size: 12px; margin-top: 1px; }
        .wa-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--text-faint); flex: none; }
        .wa-dot.ok { background: #25d366; box-shadow: 0 0 0 3px rgba(37,211,102,.2); }
        .ac-x { align-self: flex-start; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 7px; height: 30px; padding: 0 12px; font-size: 12.5px; cursor: pointer; }
        .ac-x:hover { color: var(--text); } .ac-x:disabled { opacity: .5; cursor: default; }
        .ac-qr { display: flex; align-items: center; gap: 13px; }
        .ac-qr img { border-radius: 9px; border: 4px solid #fff; background: #fff; flex: none; }
        .ac-qrt { color: var(--text-dim); font-size: 12px; line-height: 1.5; max-width: 190px; }
      `}</style>
    </div>
  );
}

/* ── Modal cu numerele/roboții conectați (deschis din iconul robot din header) ── */
function AccountsModal({ accounts, bridgeEnabled, busy, onClose, onConnect, onLogout, onReconnect, onRemove }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal((
    <div className="am-ov" onClick={onClose}>
      <div className="am-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="am-top"><div className="am-title">Numere / roboți conectați</div><button className="am-x" onClick={onClose}>×</button></div>
        <div className="am-body">
          {!bridgeEnabled ? (
            <div className="am-off">Puntea rulează doar LOCAL. Pornește backend-ul cu <code>WHATSAPP_BRIDGE=1</code> și web-ul cu proxy local.</div>
          ) : (
            <div className="am-grid">
              {accounts.map((a) => <AccountCard key={a.sessionId} a={a} busy={busy} onLogout={() => onLogout(a.number)} onReconnect={() => onReconnect(a.number)} onRemove={() => onRemove(a.sessionId)} />)}
              <button className="am-add" disabled={busy === "connect"} onClick={onConnect}>{busy === "connect" ? "Se pregătește QR…" : "＋ Conectează un număr"}</button>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .am-ov { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 124; display: flex; align-items: flex-start; justify-content: center; padding: 64px 20px 20px; animation: amov .14s ease; }
        @keyframes amov { from { opacity: 0; } to { opacity: 1; } }
        .am-dlg { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 15px; width: 660px; max-width: 96vw; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 26px 70px rgba(0,0,0,.55); animation: amin .18s cubic-bezier(.2,.9,.3,1.2); }
        @keyframes amin { from { opacity: 0; transform: translateY(-10px) scale(.98); } to { opacity: 1; transform: none; } }
        .am-top { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--border); }
        .am-title { color: var(--text); font-size: 16px; font-weight: 700; }
        .am-x { background: transparent; border: none; color: var(--text-faint); font-size: 23px; cursor: pointer; line-height: 1; } .am-x:hover { color: var(--text); }
        .am-body { padding: 16px 18px; overflow: auto; }
        .am-off { color: #e6cb74; font-size: 13px; line-height: 1.6; } .am-off code { background: var(--surface-2); padding: 1px 6px; border-radius: 4px; color: var(--text); }
        .am-grid { display: flex; flex-wrap: wrap; gap: 12px; align-items: stretch; }
        .am-add { background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-dim); border-radius: 11px; padding: 12px 18px; font-size: 13px; font-weight: 600; cursor: pointer; min-width: 220px; }
        .am-add:hover { color: var(--text); border-color: var(--text-faint); } .am-add:disabled { opacity: .5; cursor: default; }
      `}</style>
    </div>
  ), document.body);
}

export default function WhatsappPage() {
  const router = useRouter();
  const [st, setSt] = useState(null);
  const [maps, setMaps] = useState([]);
  const [lucrari, setLucrari] = useState([]);
  const [teams, setTeams] = useState([]);
  const [sel, setSel] = useState(null);       // lucrarea selectată (_id) sau null (landing)
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState({});
  const [result, setResult] = useState({});
  const [addOpen, setAddOpen] = useState(false);
  const [editLuc, setEditLuc] = useState(null);     // lucrarea în editare
  const [seedWeekOpen, setSeedWeekOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false); // modalul de numere/roboți
  const [planOpen, setPlanOpen] = useState(true);          // containerul „Planning lucrări"
  const pollRef = useRef(null);

  const accounts = st?.accounts || [];
  const bridgeEnabled = st?.bridgeEnabled;
  const connectedAccounts = accounts.filter((a) => a.connected);
  const accountOf = (num) => accounts.find((a) => a.number === num);
  const robotOk = bridgeEnabled && connectedAccounts.length > 0; // bulina din iconul robot

  const loadStatus = useCallback(async () => { try { setSt(await whatsappApi.status()); } catch {} }, []);
  const loadMaps = useCallback(async () => { try { const r = await whatsappApi.mappings(); setMaps(r.mappings || []); } catch {} }, []);
  const loadLucrari = useCallback(async () => { try { const r = await whatsappApi.lucrari(); setLucrari(r.lucrari || []); } catch {} }, []);
  const teamName = (id) => teams.find((t) => String(t.id) === String(id))?.name || "echipă";

  useEffect(() => {
    loadStatus(); loadMaps(); loadLucrari();
    whatsappApi.teams().then((r) => setTeams(r.teams || [])).catch(() => {});
  }, [loadStatus, loadMaps, loadLucrari]);
  useEffect(() => {
    clearInterval(pollRef.current);
    const pending = accounts.some((a) => a.state === "qr" || a.state === "connecting");
    if (bridgeEnabled && pending) pollRef.current = setInterval(loadStatus, 2500);
    return () => clearInterval(pollRef.current);
  }, [accounts, bridgeEnabled, loadStatus]);

  const luObj = sel ? lucrari.find((l) => String(l._id) === String(sel)) : null;
  const luMaps = useMemo(() => {
    if (!luObj) return [];
    return maps.filter((m) => String(m.lucrareId) === String(luObj._id)).sort((a, b) => (a.weekOfMonth || 1) - (b.weekOfMonth || 1) || (a.nameCached || "").localeCompare(b.nameCached || ""));
  }, [luObj, maps]);
  const luNumber = luObj?.botNumber || "";
  const luConnected = !!accountOf(luNumber)?.connected;

  useEffect(() => {
    if (!luObj) return;
    luMaps.forEach((m) => { if (accountOf(m.botNumber)?.connected && !preview[m._id]) doPreview(m._id); });
    // eslint-disable-next-line
  }, [sel, accounts.length]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 5000); };

  async function connect() { setBusy("connect"); try { setSt(await whatsappApi.connect()); } catch (e) { flash(e.message); } finally { setBusy(""); } }
  async function reconnect(num) { setBusy("conn" + num); try { setSt(await whatsappApi.reconnect(num)); } catch (e) { flash(e.message); } finally { setBusy(""); } }
  async function logout(num) { if (!confirm("Deloghezi acest număr? Va trebui re-scanat QR.")) return; setBusy("logout" + num); try { setSt(await whatsappApi.logout(num)); } catch (e) { flash(e.message); } finally { setBusy(""); } }
  async function removeAccount(sessionId) { try { setSt(await whatsappApi.removeAccount(sessionId)); } catch (e) { flash(e.message); } }
  async function unmap(id) { if (!confirm("Scoți grupul din sincronizare? (grupul WhatsApp rămâne)")) return; try { await whatsappApi.unmap(id); setPreview((p) => { const n = { ...p }; delete n[id]; return n; }); await loadMaps(); await loadLucrari(); } catch (e) { flash(e.message); } }
  async function setMode(id, mode) { try { await whatsappApi.setMode(id, mode); setMaps((m) => m.map((x) => String(x._id) === String(id) ? { ...x, mode } : x)); } catch (e) { flash(e.message); } }
  async function doPreview(id) { setBusy("prev" + id); try { const r = await whatsappApi.preview(id); setPreview((p) => ({ ...p, [id]: r })); } catch (e) { flash(e.message); } finally { setBusy(""); } }
  async function doSync(id, name) {
    if (!confirm(`Sincronizezi „${name}" cu oamenii săptămânii? (adaugă/scoate membri reali + redenumește grupul)`)) return;
    setBusy("sync" + id);
    try { const r = await whatsappApi.sync(id); setResult((x) => ({ ...x, [id]: r })); await doPreview(id); flash(`Gata: +${r.added?.length || 0} adăugați, −${r.removed?.length || 0} scoși${r.renamed ? `, „${r.renamed}"` : ""}.`); }
    catch (e) { flash(e.message); } finally { setBusy(""); }
  }
  function seedSummary(results) {
    const a = results.reduce((s, r) => s + (r.added?.length || 0), 0);
    const d = results.reduce((s, r) => s + (r.removed?.length || 0), 0);
    const skipped = results.filter((r) => r.skipped).length;
    return `Seed: ${results.length} grupuri · +${a} · −${d}${skipped ? ` · ${skipped} sărite (număr neconectat)` : ""}.`;
  }
  async function doSeedAll() {
    if (!confirm("Seed grupurile acestei lucrări din Matrix? (adaugă/scoate membri reali)")) return;
    setBusy("seedall");
    try { const r = await whatsappApi.seedAll(luMaps.map((m) => m._id)); flash(seedSummary(r.results || [])); await loadMaps(); luMaps.forEach((m) => doPreview(m._id)); }
    catch (e) { flash(e.message); } finally { setBusy(""); }
  }
  async function doSeedWeek(wom) {
    setSeedWeekOpen(false); setBusy("seedweek");
    try { const r = await whatsappApi.seedWeek(wom, luMaps.map((m) => m._id)); flash(seedSummary(r.results || [])); await loadMaps(); luMaps.forEach((m) => doPreview(m._id)); }
    catch (e) { flash(e.message); } finally { setBusy(""); }
  }
  async function onAdded(n) { setAddOpen(false); await loadMaps(); await loadLucrari(); flash(`${n || 1} grup(uri) adăugate.`); }
  async function onLucEdited(deleted) { setEditLuc(null); if (deleted) setSel(null); await loadLucrari(); await loadMaps(); }

  return (
    <div className="wa">
      <div className="wa-head">
        <button className="wa-back" onClick={() => router.push("/plans")}>‹ Plans</button>
        <h1>Grupuri WhatsApp</h1>
        <button className={`wa-robot ${robotOk ? "" : "off"}`} title="Roboți / numere conectate" onClick={() => setAccountsOpen(true)}>
          <img src="/iconita-robot.png" alt="roboți" />
        </button>
        <span className="wa-note">Testează pe un grup de TEST, nu pe comunitatea reală.</span>
      </div>
      {msg && <div className="wa-flash">{msg}</div>}
      {st && !bridgeEnabled && <div className="wa-offline-bar">Puntea rulează doar LOCAL. Pornește backend-ul cu <code>WHATSAPP_BRIDGE=1</code> și web-ul cu proxy local, apoi revino.</div>}

      {/* ===== PLANNING LUCRĂRI (container colapsabil) ===== */}
      {bridgeEnabled && (
        <section className="pl">
          <button className="pl-head" onClick={() => setPlanOpen((o) => !o)}>
            <span className="pl-ic">{waIcon(18)}</span>
            <div className="pl-tt"><div className="pl-title">Planning lucrări</div><div className="pl-sub">grupuri WhatsApp sincronizate cu Matrix</div></div>
            <span className="pl-count">{lucrari.length}</span>
            <span className="pl-chev">{planOpen ? "▾" : "▸"}</span>
          </button>
          {planOpen && (<div className="pl-body">
      {!sel && (
        <>
          <div className="wa-toolbar">
            <div className="wa-ct2">Lucrări <span className="wa-count">{lucrari.length}</span></div>
            <button className="wa-btn add" disabled={!connectedAccounts.length} title={connectedAccounts.length ? "" : "Conectează un număr întâi"} onClick={() => setAddOpen(true)}>＋ Lucrare nouă / grup</button>
          </div>
          {lucrari.length === 0 ? (
            <div className="wa-empty">
              <div className="wa-emptyt">Nicio lucrare configurată încă</div>
              <div className="wa-emptys">Conectează un număr, apoi „Lucrare nouă": îi dai nume + număr (+ imagine), alegi comunitatea și mapezi grupurile pe echipe și săptămâni din lună.</div>
              <button className="wa-btn add big" disabled={!connectedAccounts.length} onClick={() => setAddOpen(true)}>＋ Adaugă prima lucrare</button>
            </div>
          ) : (
            <div className="lu-grid">
              {lucrari.map((l) => {
                const acc = accountOf(l.botNumber);
                return (
                  <div key={l._id} className="lu-card" onClick={() => setSel(l._id)}>
                    <button className="lu-edit" title="Editează lucrarea" onClick={(e) => { e.stopPropagation(); setEditLuc(l); }}>✎</button>
                    <div className="lu-thumb">{l.image ? <img src={l.image} alt="" /> : waIcon(52)}</div>
                    <div className="lu-body">
                      <div className="lu-name">{l.name || "Fără nume"}</div>
                      <div className="lu-rows">
                        <div className="lu-r"><span className="lu-k">Grupuri active:</span> <b>{l.count}</b></div>
                        <div className="lu-r"><span className="lu-k">Număr conectat:</span> <b>{acc?.me?.name || l.botNumber || "—"}</b> <span className={`lu-sdot ${acc?.connected ? "on" : "off"}`} /></div>
                        <div className="lu-r"><span className="lu-k">Status:</span> <b className={acc?.connected ? "lu-son" : "lu-soff"}>{acc?.connected ? "Connected" : "Disabled"}</b></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== ECRAN LUCRARE ===== */}
      {sel && luObj && (
        <>
          <div className="lu-head">
            <button className="wa-back" onClick={() => setSel(null)}>‹ Lucrări</button>
            <div className="lu-hthumb">{luObj.image ? <img src={luObj.image} alt="" /> : waIcon(18)}</div>
            <h2>{luObj.name || "Fără nume"}</h2>
            {luNumber && <span className="lu-hnum">{waIcon(13)} {accountOf(luNumber)?.me?.name || luNumber}{!luConnected && <span className="lu-hoff"> · neconectat</span>}</span>}
            <button className="wa-btn ghost sm" onClick={() => setEditLuc(luObj)}>✎ Editează lucrarea</button>
          </div>

          <div className="wa-toolbar">
            <div className="wa-ct2">Grupuri <span className="wa-count">{luMaps.length}</span></div>
            <div className="wa-tacts">
              {luMaps.length > 0 && <>
                <button className="wa-btn ghost" disabled={busy === "seedall" || busy === "seedweek" || !luConnected} onClick={doSeedAll}>{busy === "seedall" ? "Seed…" : "⟳ Seed toate"}</button>
                <button className="wa-btn ghost" disabled={busy === "seedall" || busy === "seedweek" || !luConnected} onClick={() => setSeedWeekOpen(true)}>Seed pe săptămână</button>
              </>}
              <button className="wa-btn add" onClick={() => setAddOpen(true)}>＋ Adaugă grup</button>
            </div>
          </div>

          <div className="wa-grid">
            {luMaps.map((m) => {
              const pv = preview[m._id]; const rs = result[m._id]; const connected = accountOf(m.botNumber)?.connected;
              return (
                <div key={m._id} className="gcard">
                  <div className="gc-head">
                    <div className="gc-title">
                      <span className="gc-wa">{waIcon(16)}</span>
                      <div><div className="gc-name">{m.nameCached || m.jid}</div>{m.namePrefix && <div className="gc-comm">prefix „{m.namePrefix}"</div>}</div>
                    </div>
                    <button className="gc-del" title="Scoate din sincronizare" onClick={() => unmap(m._id)}>×</button>
                  </div>
                  <div className="gc-bind">
                    <div className="gc-b"><span className="gc-bl">Echipă</span><b>{teamName(m.teamId)}</b></div>
                    <div className="gc-b"><span className="gc-bl">Săptămâna</span><b>a {m.weekOfMonth || 1}-a din lună</b> {pv?.weekLabel && <span className="gc-dim">· {pv.weekLabel}</span>}</div>
                  </div>
                  <div className="gc-mode">
                    <span className="gc-ml">Mod</span>
                    <div className="gc-modes">
                      <button className={`gc-m ${m.mode === "auto" ? "on" : ""}`} title="Aplică singur din Matrix, fără click. Matrix gol → doar scoate. (scheduler)" onClick={() => setMode(m._id, "auto")}>Automat</button>
                      <button className={`gc-m ${m.mode === "semi" ? "on" : ""}`} title="Sistemul pregătește + te anunță; confirmi cu un click. (scheduler)" onClick={() => setMode(m._id, "semi")}>Semi-auto</button>
                      <button className={`gc-m ${m.mode === "manual" ? "on" : ""}`} title="Apeși tu Seed/Sincronizează când vrei." onClick={() => setMode(m._id, "manual")}>Manual</button>
                    </div>
                  </div>
                  <div className="gc-status">
                    {!pv ? <div className="wa-muted">{busy === "prev" + m._id ? "Se calculează…" : connected ? "—" : "numărul lucrării nu e conectat"}</div> : pv.liveError ? (
                      <div className="gc-srow err">{pv.liveError}</div>
                    ) : (
                      <>
                        <div className="gc-srow"><span className="gc-sl">Nume nou</span> <b className="gc-newname">{pv.plannedName || "—"}</b>{!pv.leaderName && <span className="gc-dim"> (fără lider)</span>}</div>
                        <div className="gc-srow"><span className="gc-sl">Trebuie</span> {pv.people?.length || 0} oameni · în grup acum {pv.currentCount}</div>
                        <div className="gc-srow"><span className="gc-sl">Schimbări</span> <span className="gc-add">+{pv.toAdd?.length || 0}</span> <span className="gc-rem">−{pv.toRemove?.length || 0}</span></div>
                        {pv.emptyMatrix && <div className="gc-srow warn">⚠ Matrix gol pe săptămâna asta — sync-ul doar scoate.</div>}
                        {pv.missingPhone?.length > 0 && <div className="gc-srow warn">Fără număr: {pv.missingPhone.join(", ")}</div>}
                      </>
                    )}
                  </div>
                  <div className="gc-actions">
                    <button className="wa-btn ghost sm" disabled={busy === "prev" + m._id || !connected} onClick={() => doPreview(m._id)}>↻ Reîmprospătează</button>
                    <button className="wa-btn sm" disabled={busy === "sync" + m._id || !connected} onClick={() => doSync(m._id, m.nameCached || teamName(m.teamId))}>{busy === "sync" + m._id ? "Se sincronizează…" : "Sincronizează acum"}</button>
                  </div>
                  {rs && <div className="gc-res">Ultima sincronizare: +{rs.added?.length || 0} · −{rs.removed?.length || 0}{rs.needInvite?.length > 0 ? ` · ${rs.needInvite.length} necesită link` : ""}{rs.renamed ? ` · „${rs.renamed}"` : ""}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
          </div>)}
        </section>
      )}

      {accountsOpen && <AccountsModal accounts={accounts} bridgeEnabled={bridgeEnabled} busy={busy} onClose={() => setAccountsOpen(false)} onConnect={connect} onLogout={logout} onReconnect={reconnect} onRemove={removeAccount} />}
      {addOpen && <SetupModal accounts={connectedAccounts} lucrari={lucrari} teams={teams} mappedJids={maps.map((m) => m.jid)} prefillLucrareId={sel} onClose={() => setAddOpen(false)} onAdded={onAdded} />}
      {editLuc && <EditLucrareModal lucrare={editLuc} accounts={connectedAccounts} onClose={() => setEditLuc(null)} onSaved={onLucEdited} />}
      {seedWeekOpen && <SeedWeekModal onClose={() => setSeedWeekOpen(false)} onSeed={doSeedWeek} />}

      <style jsx>{`
        .wa { max-width: 1120px; margin: 0 auto; padding: 16px 20px 70px; }
        .wa-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
        .wa-back { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; height: 30px; padding: 0 12px; cursor: pointer; font-size: 13px; flex: none; }
        .wa-back:hover { color: var(--text); }
        .wa-head h1 { font-size: 22px; font-weight: 600; margin: 0; }
        .wa-note { color: var(--text-faint); font-size: 12px; margin-left: auto; }
        .wa-flash { background: rgba(37,211,102,.14); border: 1px solid rgba(37,211,102,.4); color: #8fe0b4; border-radius: 8px; padding: 9px 13px; margin-bottom: 14px; font-size: 13px; }
        .wa-robot { height: 53px; flex: none; background: transparent; border: none; cursor: pointer; padding: 0; display: inline-flex; align-items: center; transition: transform .12s ease; }
        .wa-robot:hover { transform: scale(1.1); }
        .wa-robot:hover img { filter: brightness(1.35) drop-shadow(0 0 7px rgba(37,211,102,.8)); }
        .wa-robot img { height: 100%; width: auto; display: block; transition: filter .12s ease; }
        .wa-robot.off img { filter: grayscale(1); opacity: .45; }
        .wa-offline-bar { color: #e6cb74; font-size: 12.5px; background: rgba(201,162,39,.1); border: 1px solid rgba(201,162,39,.3); border-radius: 8px; padding: 9px 13px; margin-bottom: 16px; line-height: 1.5; }
        .wa-offline-bar code { background: var(--surface-2); padding: 1px 6px; border-radius: 4px; color: var(--text); }
        .pl { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 18px; overflow: hidden; }
        .pl-head { width: 100%; display: flex; align-items: center; gap: 13px; background: transparent; border: none; padding: 16px 18px; cursor: pointer; text-align: left; }
        .pl-head:hover { background: var(--surface-2); }
        .pl-ic { width: 38px; height: 38px; flex: none; border-radius: 10px; background: rgba(37,211,102,.14); display: flex; align-items: center; justify-content: center; }
        .pl-tt { flex: 1; min-width: 0; }
        .pl-title { color: var(--text); font-size: 16px; font-weight: 700; }
        .pl-sub { color: var(--text-faint); font-size: 12px; margin-top: 1px; }
        .pl-count { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 20px; font-size: 12px; padding: 1px 10px; flex: none; }
        .pl-chev { color: var(--text-faint); font-size: 13px; flex: none; }
        .pl-body { padding: 14px 18px 18px; border-top: 1px solid var(--border); }
        .wa-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; margin-bottom: 18px; }
        .wa-ct { color: var(--text-faint); font-size: 11px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 12px; }
        .wa-muted { color: var(--text-faint); font-size: 13px; }
        .wa-offline { color: #e6cb74; font-size: 13px; line-height: 1.6; }
        .wa-offline code { background: var(--surface-2); padding: 1px 6px; border-radius: 4px; color: var(--text); }
        .acc-grid { display: flex; flex-wrap: wrap; gap: 12px; align-items: stretch; }
        .acc-add { background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-dim); border-radius: 11px; padding: 12px 18px; font-size: 13px; font-weight: 600; cursor: pointer; min-width: 220px; }
        .acc-add:hover { color: var(--text); border-color: var(--text-faint); } .acc-add:disabled { opacity: .5; cursor: default; }
        .wa-btn { background: #25d366; border: 1px solid #1fb457; color: #0a2e18; border-radius: 8px; height: 36px; padding: 0 16px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .wa-btn:hover { filter: brightness(1.05); } .wa-btn:disabled { opacity: .5; cursor: default; filter: none; }
        .wa-btn.ghost { background: var(--surface-2); border-color: var(--border-strong); color: var(--text-dim); }
        .wa-btn.ghost:hover { color: var(--text); }
        .wa-btn.sm { height: 32px; padding: 0 13px; font-size: 12.5px; }
        .wa-btn.add { height: 34px; }
        .wa-btn.add.big { height: 40px; padding: 0 20px; margin-top: 14px; }
        .wa-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 12px; flex-wrap: wrap; }
        .wa-tacts { display: flex; gap: 9px; align-items: center; }
        .wa-ct2 { color: var(--text); font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 9px; }
        .wa-count { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 20px; font-size: 12px; padding: 1px 10px; }
        .wa-empty { text-align: center; padding: 48px 20px; background: var(--surface); border: 1px dashed var(--border-strong); border-radius: 12px; }
        .wa-emptyt { color: var(--text); font-size: 16px; font-weight: 600; }
        .wa-emptys { color: var(--text-faint); font-size: 13px; margin-top: 6px; max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.5; }
        .lu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 16px; }
        .lu-card { position: relative; text-align: left; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 16px; padding: 18px; cursor: pointer; display: flex; align-items: center; gap: 18px; transition: border-color .12s, background .12s; }
        .lu-card:hover { border-color: #25d366; background: var(--surface-2); }
        .lu-edit { position: absolute; top: 12px; right: 12px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-faint); border-radius: 8px; width: 32px; height: 32px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 2; }
        .lu-edit:hover { color: var(--text); border-color: #25d366; }
        .lu-thumb { width: 150px; height: 150px; flex: none; border-radius: 16px; background: rgba(37,211,102,.1); display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .lu-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .lu-body { flex: 1; min-width: 0; }
        .lu-name { color: var(--text); font-size: 20px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 11px; }
        .lu-rows { display: flex; flex-direction: column; gap: 5px; }
        .lu-r { color: var(--text-dim); font-size: 13px; display: flex; align-items: center; gap: 6px; }
        .lu-k { color: var(--text-faint); }
        .lu-r b { color: var(--text); font-weight: 600; }
        .lu-sdot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex: none; }
        .lu-sdot.on { background: #25d366; box-shadow: 0 0 0 3px rgba(37,211,102,.18); }
        .lu-sdot.off { background: #e06060; }
        .lu-son { color: #8fe0b4 !important; } .lu-soff { color: #e06060 !important; }
        .lu-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .lu-hthumb { width: 34px; height: 34px; flex: none; border-radius: 9px; background: rgba(37,211,102,.12); display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .lu-hthumb img { width: 100%; height: 100%; object-fit: cover; }
        .lu-head h2 { font-size: 19px; font-weight: 700; margin: 0; color: var(--text); }
        .lu-hnum { display: inline-flex; align-items: center; gap: 6px; color: var(--text-dim); font-size: 12.5px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 20px; padding: 3px 11px; }
        .lu-hoff { color: #e6cb74; }
        .wa-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; }
        .gcard { background: var(--surface); border: 1px solid var(--border-strong); border-radius: 13px; padding: 15px 16px; display: flex; flex-direction: column; gap: 12px; }
        .gc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .gc-title { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .gc-wa { width: 32px; height: 32px; flex: none; border-radius: 9px; background: rgba(37,211,102,.14); display: inline-flex; align-items: center; justify-content: center; }
        .gc-name { color: var(--text); font-size: 15.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gc-comm { color: var(--text-faint); font-size: 11.5px; margin-top: 1px; }
        .gc-del { background: transparent; border: none; color: var(--text-faint); font-size: 21px; line-height: 1; cursor: pointer; padding: 0 3px; flex: none; }
        .gc-del:hover { color: var(--danger); }
        .gc-bind { display: flex; flex-direction: column; gap: 6px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 9px; padding: 10px 12px; }
        .gc-b { display: flex; align-items: center; gap: 8px; color: var(--text); font-size: 13px; }
        .gc-bl { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .4px; min-width: 86px; }
        .gc-dim { color: var(--text-faint); } .gc-warn { color: #e6cb74; font-size: 12px; }
        .gc-mode { display: flex; align-items: center; gap: 11px; }
        .gc-ml { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .4px; }
        .gc-modes { display: inline-flex; background: var(--bg); border: 1px solid var(--border-strong); border-radius: 8px; padding: 2px; gap: 2px; }
        .gc-m { background: transparent; border: none; color: var(--text-faint); font-size: 12px; padding: 5px 10px; border-radius: 6px; cursor: pointer; }
        .gc-m.on { background: #25d366; color: #0a2e18; font-weight: 700; }
        .gc-status { display: flex; flex-direction: column; gap: 5px; border-top: 1px dashed var(--border); padding-top: 11px; }
        .gc-srow { color: var(--text-dim); font-size: 12.5px; }
        .gc-srow .gc-sl { color: var(--text-faint); display: inline-block; min-width: 86px; }
        .gc-srow.err { color: var(--danger); } .gc-srow.warn { color: #e6cb74; }
        .gc-newname { color: #8fe0b4; }
        .gc-add { color: var(--product); font-weight: 700; } .gc-rem { color: var(--danger); font-weight: 700; }
        .gc-actions { display: flex; gap: 9px; justify-content: flex-end; }
        .gc-res { background: rgba(37,211,102,.1); border: 1px solid rgba(37,211,102,.3); border-radius: 8px; color: #8fe0b4; font-size: 12px; padding: 8px 11px; }
      `}</style>
    </div>
  );
}

/* ── Modal editare lucrare (nume / număr / imagine / șterge) ── */
function EditLucrareModal({ lucrare, accounts, onClose, onSaved }) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState(lucrare.name || "");
  const [botNumber, setBotNumber] = useState(lucrare.botNumber || "");
  const [image, setImage] = useState(lucrare.image || "");
  const [check, setCheck] = useState(null);   // verificare număr nou (admin în grupurile lucrării)
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!botNumber || botNumber === (lucrare.botNumber || "")) { setCheck(null); return; }
    let alive = true; setCheck("loading");
    whatsappApi.checkLucrareNumber(lucrare._id, botNumber).then((r) => { if (alive) setCheck(r); }).catch(() => { if (alive) setCheck(null); });
    return () => { alive = false; };
  }, [botNumber, lucrare._id, lucrare.botNumber]);
  if (!mounted || typeof document === "undefined") return null;
  const numberOpts = accounts.map((a) => ({ value: a.number, label: a.me?.name || a.number, sub: a.number }));
  const badGroups = check && check !== "loading" ? (check.groups || []).filter((g) => !g.ok) : [];
  const numberBlocked = check && check !== "loading" && (!check.connected || badGroups.length > 0);

  async function save() {
    setSaving(true); setErr("");
    try { await whatsappApi.updateLucrare(lucrare._id, { name, botNumber, image }); onSaved(false); }
    catch (e) { setErr(e.message); } finally { setSaving(false); }
  }
  async function del() {
    if (!confirm("Ștergi lucrarea? Toate grupurile ei dispar din sincronizare (grupurile WhatsApp rămân neatinse).")) return;
    setSaving(true); try { await whatsappApi.deleteLucrare(lucrare._id); onSaved(true); } catch (e) { setErr(e.message); setSaving(false); }
  }

  return createPortal((
    <div className="el-ov" onClick={() => !saving && onClose()}>
      <div className="el-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="el-top"><div className="el-title">Editează lucrarea</div><button className="el-x" onClick={onClose}>×</button></div>
        <div className="el-body">
          <div className="el-f"><label>Nume</label><input className="el-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Laudă și Închinare" /></div>
          <div className="el-f"><label>Număr-robot</label><Combo value={botNumber} onChange={setBotNumber} options={numberOpts} placeholder="alege numărul…" />
            {botNumber !== (lucrare.botNumber || "") && (
              check === "loading" ? <div className="el-note">Se verifică accesul numărului în grupuri…</div>
              : check && !check.connected ? <div className="el-bad">⚠ Numărul nu e conectat. Conectează-l (scanează QR) întâi.</div>
              : check && badGroups.length > 0 ? <div className="el-bad">⚠ Numărul nou NU e admin / nu e în: {badGroups.map((g) => g.name).join(", ")}. Nu pot muta până nu-l faci admin în ele.</div>
              : check && check.ok ? <div className="el-ok">✓ Numărul e admin în toate grupurile lucrării — se poate muta.</div>
              : <div className="el-note">Schimbarea mută grupurile pe numărul nou — el trebuie să fie deja admin în ele.</div>
            )}
          </div>
          <div className="el-f"><label>Imagine (opțional)</label>
            <div className="el-img">
              <div className="el-thumb">{image ? <img src={image} alt="" /> : "fără"}</div>
              <label className="el-upl">Alege imagine<input type="file" accept="image/*" hidden onChange={(e) => readImage(e.target.files?.[0], setImage)} /></label>
              {image && <button className="el-rmimg" onClick={() => setImage("")}>scoate</button>}
            </div>
          </div>
          {err && <div className="el-err">{err}</div>}
        </div>
        <div className="el-foot">
          <button className="el-del" disabled={saving} onClick={del}>Șterge lucrarea</button>
          <div className="el-fb">
            <button className="el-btn ghost" onClick={onClose}>Anulează</button>
            <button className="el-btn" disabled={saving || numberBlocked} onClick={save}>{saving ? "Se salvează…" : "Salvează"}</button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .el-ov { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 122; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .el-dlg { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 15px; width: 460px; max-width: 95vw; box-shadow: 0 26px 70px rgba(0,0,0,.55); }
        .el-top { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 0; }
        .el-title { color: var(--text); font-size: 16px; font-weight: 700; }
        .el-x { background: transparent; border: none; color: var(--text-faint); font-size: 23px; cursor: pointer; line-height: 1; } .el-x:hover { color: var(--text); }
        .el-body { padding: 14px 18px; display: flex; flex-direction: column; gap: 13px; }
        .el-f { display: flex; flex-direction: column; gap: 6px; }
        .el-f label { color: var(--text); font-size: 13px; font-weight: 600; }
        .el-in { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 8px; height: 40px; padding: 0 12px; font-size: 13.5px; outline: none; }
        .el-in:focus { border-color: var(--primary); }
        .el-note { color: var(--text-faint); font-size: 11.5px; line-height: 1.4; }
        .el-bad { color: #e6cb74; font-size: 12px; line-height: 1.45; background: rgba(201,162,39,.1); border: 1px solid rgba(201,162,39,.3); border-radius: 7px; padding: 7px 10px; }
        .el-ok { color: #8fe0b4; font-size: 12px; line-height: 1.45; background: rgba(37,211,102,.1); border: 1px solid rgba(37,211,102,.3); border-radius: 7px; padding: 7px 10px; }
        .el-img { display: flex; align-items: center; gap: 12px; }
        .el-thumb { width: 54px; height: 54px; flex: none; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border-strong); display: flex; align-items: center; justify-content: center; color: var(--text-faint); font-size: 11px; overflow: hidden; }
        .el-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .el-upl { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 7px; height: 32px; padding: 0 12px; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; }
        .el-upl:hover { color: var(--text); }
        .el-rmimg { background: transparent; border: none; color: var(--text-faint); font-size: 12px; text-decoration: underline; cursor: pointer; }
        .el-err { color: #e6cb74; font-size: 12.5px; background: rgba(201,162,39,.1); border: 1px solid rgba(201,162,39,.3); border-radius: 7px; padding: 8px 11px; }
        .el-foot { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-top: 1px solid var(--border); }
        .el-del { background: transparent; border: 1px solid rgba(220,70,70,.4); color: #e07a7a; border-radius: 8px; height: 36px; padding: 0 13px; font-size: 12.5px; cursor: pointer; }
        .el-del:hover { background: rgba(220,70,70,.1); } .el-del:disabled { opacity: .5; }
        .el-fb { display: flex; gap: 9px; }
        .el-btn { background: #25d366; border: 1px solid #1fb457; color: #0a2e18; border-radius: 8px; height: 36px; padding: 0 16px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .el-btn:disabled { opacity: .5; } .el-btn.ghost { background: var(--surface-2); border-color: var(--border-strong); color: var(--text-dim); }
      `}</style>
    </div>
  ), document.body);
}

/* ── Setup: alegi/creezi LUCRARE → comunitate/grup → configurezi grupurile → salvezi în bloc ── */
function SetupModal({ accounts, lucrari, teams, mappedJids, prefillLucrareId, onClose, onAdded }) {
  const [mounted, setMounted] = useState(false);
  const [lucrareId, setLucrareId] = useState(prefillLucrareId || (lucrari[0]?._id ? String(lucrari[0]._id) : "__new__"));
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState(accounts[0]?.number || "");
  const [newImage, setNewImage] = useState("");
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [targetJid, setTargetJid] = useState("");
  const [rows, setRows] = useState({});
  const [collapsed, setCollapsed] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { setMounted(true); }, []);

  const isNew = lucrareId === "__new__";
  const existing = lucrari.find((l) => String(l._id) === String(lucrareId));
  const number = isNew ? newNumber : (existing?.botNumber || "");

  useEffect(() => {
    if (!number) { setGroups([]); return; }
    setGroupsLoading(true); setTargetJid("");
    whatsappApi.groups(number).then((r) => setGroups(r.groups || [])).catch(() => setGroups([])).finally(() => setGroupsLoading(false));
  }, [number]);

  const communities = useMemo(() => {
    const m = {};
    groups.forEach((g) => {
      if (g.isCommunity) m[g.jid] = { jid: g.jid, name: g.name || "Comunitate" };
      else if (g.communityJid) m[g.communityJid] = m[g.communityJid] || { jid: g.communityJid, name: g.community || "Comunitate" };
    });
    return Object.values(m);
  }, [groups]);
  const plainGroups = useMemo(() => groups.filter((g) => !g.isCommunity), [groups]);
  const childrenOf = (commJid) => plainGroups.filter((g) => g.communityJid === commJid);

  const lucrareOpts = [...lucrari.map((l) => ({ value: String(l._id), label: l.name || "Fără nume", sub: `${l.count} grupuri` })), { value: "__new__", label: "＋ Lucrare nouă", sub: "nume + număr + imagine" }];
  const numberOpts = accounts.map((a) => ({ value: a.number, label: a.me?.name || a.number, sub: a.number }));
  const targetOpts = [
    ...communities.map((c) => ({ value: c.jid, label: c.name, badge: "Comunitate", sub: `${childrenOf(c.jid).length} grupuri` })),
    ...plainGroups.map((g) => ({ value: g.jid, label: g.name || g.jid, badge: "Grup", sub: [g.community && `în ${g.community}`, `${g.size} membri`, g.isAdmin ? "ești admin" : "NU ești admin", mappedJids.includes(g.jid) ? "deja mapat" : ""].filter(Boolean).join(" · ") })),
  ];

  const isCommunity = communities.some((c) => c.jid === targetJid);
  const targetGroups = isCommunity ? childrenOf(targetJid) : plainGroups.filter((g) => g.jid === targetJid);
  const setRow = (jid, patch) => setRows((r) => ({ ...r, [jid]: { ...(r[jid] || defaultRow()), ...patch } }));
  const enabledRows = targetGroups.filter((g) => (rows[g.jid]?.enabled ?? true) && rows[g.jid]?.teamId);

  if (!mounted || typeof document === "undefined") return null;

  async function save() {
    setSaving(true); setErr("");
    try {
      let lid = isNew ? null : lucrareId;
      if (isNew) {
        if (!newName.trim()) { setErr("Dă un nume lucrării noi."); setSaving(false); return; }
        if (!newNumber) { setErr("Alege numărul lucrării."); setSaving(false); return; }
        const r = await whatsappApi.createLucrare({ name: newName.trim(), botNumber: newNumber, image: newImage });
        lid = r.lucrare?._id;
      }
      const items = targetGroups
        .filter((g) => (rows[g.jid]?.enabled ?? true) && rows[g.jid]?.teamId)
        .map((g) => { const r = rows[g.jid] || {}; return { jid: g.jid, nameCached: g.name || "", communityJid: g.communityJid || "", teamId: r.teamId, weekOfMonth: r.weekOfMonth || 1, namePrefix: r.namePrefix || "", leaderPositionId: r.leaderPositionId || null, mode: r.mode || "semi", botNumber: number, lucrareId: lid }; });
      if (!items.length) { setErr("Configurează cel puțin un grup (alege echipa)."); setSaving(false); return; }
      await whatsappApi.mapBulk(items);
      onAdded(items.length);
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  return createPortal((
    <div className="sm-ov" onClick={() => !saving && onClose()}>
      <div className="sm-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="sm-top"><div className="sm-title">Adaugă grupuri în sincronizare</div><button className="sm-x" onClick={onClose}>×</button></div>

        <div className="sm-pick">
          <label>Lucrare</label>
          <Combo value={lucrareId} onChange={setLucrareId} options={lucrareOpts} placeholder="alege lucrarea…" />
          {isNew && (
            <div className="sm-new">
              <input className="sm-in" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Numele lucrării (ex. Laudă și Închinare)" />
              <Combo value={newNumber} onChange={setNewNumber} options={numberOpts} placeholder="alege numărul-robot…" />
              <label className="sm-upl">{newImage ? "Schimbă imaginea" : "Imagine (opțional)"}<input type="file" accept="image/*" hidden onChange={(e) => readImage(e.target.files?.[0], setNewImage)} /></label>
              {newImage && <span className="sm-imgok">✓ imagine aleasă</span>}
            </div>
          )}
          <label style={{ marginTop: 6 }}>Comunitate sau grup</label>
          <Combo value={targetJid} onChange={setTargetJid} options={targetOpts} placeholder={groupsLoading ? "se încarcă grupurile…" : (number ? "alege o comunitate sau un grup…" : "alege numărul întâi")} disabled={!number || groupsLoading} />
          <div className="sm-hint">Numele de pe WhatsApp nu contează — tu mapezi headerul din Matrix.</div>
        </div>

        <div className="sm-body">
          {!targetJid ? (
            <div className="sm-ph">{number ? "Alege o comunitate sau un grup ca să începi." : "Alege un număr ca să-i vezi grupurile."}</div>
          ) : targetGroups.length === 0 ? (
            <div className="sm-ph">Comunitatea asta n-are grupuri vizibile pentru numărul-robot.</div>
          ) : (
            <>
              {targetGroups.length > 1 && (
                <div className="sm-rtools">
                  <span>{enabledRows.length} configurate din {targetGroups.length}</span>
                  <div className="sm-rbtns">
                    <button onClick={() => setCollapsed(Object.fromEntries(targetGroups.filter((g) => rows[g.jid]?.teamId).map((g) => [g.jid, true])))}>Restrânge configurate</button>
                    <button onClick={() => setCollapsed({})}>Desfă tot</button>
                  </div>
                </div>
              )}
              {targetGroups.map((g) => (
                <GroupRow key={g.jid} group={g} teams={teams}
                  value={rows[g.jid] || defaultRow()} onChange={(patch) => setRow(g.jid, patch)}
                  alreadyMapped={mappedJids.includes(g.jid)}
                  collapsed={!!collapsed[g.jid]} onToggleCollapse={() => setCollapsed((c) => ({ ...c, [g.jid]: !c[g.jid] }))} />
              ))}
            </>
          )}
        </div>

        {err && <div className="sm-err">{err}</div>}
        <div className="sm-foot">
          <div className="sm-count">{enabledRows.length} grup(uri) de configurat</div>
          <div className="sm-fbtns">
            <button className="sm-btn ghost" onClick={onClose}>Anulează</button>
            <button className="sm-btn" disabled={saving || !enabledRows.length} onClick={save}>{saving ? "Se salvează…" : `Salvează ${enabledRows.length || ""}`}</button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .sm-ov { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 120; display: flex; align-items: center; justify-content: center; padding: 20px; animation: smov .14s ease; }
        @keyframes smov { from { opacity: 0; } to { opacity: 1; } }
        .sm-dlg { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 15px; width: 720px; max-width: 96vw; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 26px 70px rgba(0,0,0,.55); animation: smin .18s cubic-bezier(.2,.9,.3,1.2); }
        @keyframes smin { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
        .sm-top { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 0; }
        .sm-title { color: var(--text); font-size: 16px; font-weight: 700; }
        .sm-x { background: transparent; border: none; color: var(--text-faint); font-size: 23px; cursor: pointer; line-height: 1; } .sm-x:hover { color: var(--text); }
        .sm-pick { padding: 14px 18px 4px; display: flex; flex-direction: column; gap: 8px; }
        .sm-pick label { color: var(--text); font-size: 13.5px; font-weight: 600; }
        .sm-new { display: flex; flex-direction: column; gap: 8px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 9px; padding: 11px; }
        .sm-in { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 8px; height: 40px; padding: 0 12px; font-size: 13.5px; outline: none; }
        .sm-in:focus { border-color: var(--primary); }
        .sm-upl { align-self: flex-start; background: var(--surface); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 7px; height: 34px; padding: 0 12px; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; }
        .sm-imgok { color: #8fe0b4; font-size: 12px; }
        .sm-hint { color: var(--text-faint); font-size: 12px; line-height: 1.5; }
        .sm-body { padding: 10px 18px; overflow: auto; display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 110px; }
        .sm-ph { color: var(--text-faint); font-size: 13px; text-align: center; padding: 26px 10px; }
        .sm-rtools { display: flex; align-items: center; justify-content: space-between; color: var(--text-faint); font-size: 12px; padding: 2px 2px 4px; }
        .sm-rbtns { display: flex; gap: 8px; }
        .sm-rbtns button { background: transparent; border: none; color: var(--text-dim); font-size: 12px; cursor: pointer; text-decoration: underline; padding: 0; }
        .sm-rbtns button:hover { color: var(--text); }
        .sm-err { color: #e6cb74; font-size: 12.5px; background: rgba(201,162,39,.1); border: 1px solid rgba(201,162,39,.3); border-radius: 7px; padding: 8px 11px; margin: 0 18px; }
        .sm-foot { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-top: 1px solid var(--border); }
        .sm-count { color: var(--text-faint); font-size: 12.5px; }
        .sm-fbtns { display: flex; gap: 9px; }
        .sm-btn { background: #25d366; border: 1px solid #1fb457; color: #0a2e18; border-radius: 8px; height: 38px; padding: 0 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .sm-btn:hover { filter: brightness(1.05); } .sm-btn:disabled { opacity: .5; cursor: default; filter: none; }
        .sm-btn.ghost { background: var(--surface-2); border-color: var(--border-strong); color: var(--text-dim); }
        .sm-btn.ghost:hover { color: var(--text); }
      `}</style>
    </div>
  ), document.body);
}

function defaultRow() { return { enabled: true, teamId: "", weekOfMonth: 1, namePrefix: "", leaderPositionId: "", mode: "semi" }; }

/* ── O linie de configurare pentru UN grup: echipă + săptămână-din-lună + prefix + poziție-lider + mod ── */
function GroupRow({ group, teams, value, onChange, alreadyMapped, collapsed, onToggleCollapse }) {
  const [weeks, setWeeks] = useState([]);
  const [positions, setPositions] = useState([]);
  const [tp, setTp] = useState(null);
  const [loading, setLoading] = useState(false);
  const v = value;

  useEffect(() => {
    if (!v.teamId) { setWeeks([]); setPositions([]); return; }
    setLoading(true);
    Promise.all([whatsappApi.teamWeeks(v.teamId), whatsappApi.teamPositions(v.teamId)])
      .then(([w, p]) => {
        const ws = w.weeks || []; setWeeks(ws); setPositions(p.positions || []);
        if (ws.length && !ws.find((x) => x.value === v.weekOfMonth)) onChange({ weekOfMonth: ws[0]?.value ?? 1 });
      })
      .catch(() => { setWeeks([]); setPositions([]); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [v.teamId]);

  useEffect(() => {
    if (!v.teamId) { setTp(null); return; }
    let alive = true;
    whatsappApi.targetPreview(v.teamId, v.weekOfMonth, v.leaderPositionId).then((r) => { if (alive) setTp(r); }).catch(() => { if (alive) setTp(null); });
    return () => { alive = false; };
    // eslint-disable-next-line
  }, [v.teamId, v.weekOfMonth, v.leaderPositionId]);

  const teamOpts = teams.map((t) => ({ value: t.id, label: t.name, sub: t.ministryGroup || "" }));
  const weekOpts = weeks;
  const posOpts = [{ value: "", label: "— fără lider în nume —" }, ...positions.map((p) => ({ value: p.id, label: p.name }))];
  const t = teams.find((x) => String(x.id) === String(v.teamId));
  const posName = positions.find((p) => String(p.id) === String(v.leaderPositionId))?.name;
  const wkShort = tp?.weekShort || "";
  const prefix = v.namePrefix || t?.name || "";
  const leaderReal = tp?.leaderName;
  const nameBits = [prefix, wkShort].filter(Boolean).join(" - ");
  const configured = !!v.teamId;
  const on = v.enabled ?? true;

  return (
    <div className={`gr ${on ? "" : "off"} ${configured ? "ok" : ""}`}>
      <div className="gr-head">
        <label className="gr-chk"><input type="checkbox" checked={on} onChange={(e) => onChange({ enabled: e.target.checked })} /></label>
        <button type="button" className="gr-htoggle" onClick={onToggleCollapse}>
          <span className="gr-chev">{collapsed ? "▸" : "▾"}</span>
          <span className="gr-gname">{group.name || group.jid}</span>
          {configured && <span className="gr-okb">✓ configurat</span>}
        </button>
        <div className="gr-badges">
          {!group.isAdmin && <span className="gr-badge warn">nu ești admin</span>}
          {alreadyMapped && <span className="gr-badge">deja mapat</span>}
          <span className="gr-badge dim">{group.size} în grup acum</span>
        </div>
      </div>

      {on && collapsed && configured && (
        <div className="gr-sum">
          <b>{prefix}</b>{wkShort && <> · {wkShort}</>} · {posName ? `#${posName}` : "fără lider"} · {!tp ? "…" : tp.emptyMatrix ? <span className="gr-warn">Matrix gol</span> : <span className="gr-cnt">👥 {tp.people} din Matrix</span>}
        </div>
      )}

      {on && !collapsed && (
        <>
          <div className="gr-grid">
            <div className="gr-f"><span className="gr-l">Echipă (header Matrix)</span><Combo value={v.teamId} onChange={(x) => onChange({ teamId: x })} options={teamOpts} placeholder="alege echipa…" /></div>
            <div className="gr-f"><span className="gr-l">Săptămâna din lună <span className="gr-i" title="A câta slujire din lună (1-a…5-a). Rămâne FIX prin rotație — nu alunecă. Numele arată data reală.">ⓘ</span></span><Combo value={v.weekOfMonth} onChange={(x) => onChange({ weekOfMonth: x })} options={weekOpts} placeholder={loading ? "se încarcă…" : (v.teamId ? "alege săptămâna…" : "alege echipa întâi")} disabled={!v.teamId || !weekOpts.length} /></div>
            <div className="gr-f"><span className="gr-l">Prefix nume</span><input className="gr-in" value={v.namePrefix} onChange={(e) => onChange({ namePrefix: e.target.value })} placeholder={t?.name || "ex. SIM1"} /></div>
            <div className="gr-f"><span className="gr-l">Lider <span className="gr-i" title="Aici intră AUTOMAT numele persoanei de pe poziția asta în săptămâna aleasă — nu textul poziției.">ⓘ</span></span><Combo value={v.leaderPositionId} onChange={(x) => onChange({ leaderPositionId: x })} options={posOpts} placeholder={v.teamId ? "#alege poziția…" : "alege echipa întâi"} disabled={!v.teamId} /></div>
          </div>

          {v.teamId && (
            <div className="gr-count">
              {!tp ? <span className="gr-dim">se calculează din Matrix…</span>
                : tp.emptyMatrix ? <span className="gr-warn">⚠ Matrix gol pe {wkShort || "data asta"} — n-ai pe cine adăuga (fă planificarea, apoi Seed).</span>
                : <><span className="gr-cnt">👥 {tp.people} oameni din Matrix</span>{tp.missingPhone?.length > 0 && <span className="gr-warn"> · {tp.missingPhone.length} fără număr</span>}</>}
            </div>
          )}

          <div className="gr-foot">
            <div className="gr-mode">
              <button className={`gr-m ${v.mode === "auto" ? "on" : ""}`} title="Aplică singur din Matrix, fără click. Matrix gol → doar scoate. (scheduler)" onClick={() => onChange({ mode: "auto" })}>Automat</button>
              <button className={`gr-m ${v.mode === "semi" ? "on" : ""}`} title="Sistemul pregătește + te anunță; confirmi cu un click. (scheduler)" onClick={() => onChange({ mode: "semi" })}>Semi-auto</button>
              <button className={`gr-m ${v.mode === "manual" ? "on" : ""}`} title="Apeși tu Seed/Sincronizează când vrei." onClick={() => onChange({ mode: "manual" })}>Manual</button>
            </div>
            <div className="gr-prev">
              {v.teamId ? (
                <>se va numi: <b>{nameBits}</b>{(leaderReal || posName) && <> - {leaderReal ? <b>{leaderReal}</b> : <span className="gr-lph" title={`Se completează automat cu cine e pe «${posName}» în acea săptămână.`}>{posName} ⓘ</span>}</>}</>
              ) : "alege echipa ca să vezi numele"}
            </div>
          </div>
        </>
      )}
      <style jsx>{`
        .gr { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 11px; padding: 12px 13px; display: flex; flex-direction: column; gap: 11px; }
        .gr.off { opacity: .55; }
        .gr.ok { border-color: rgba(37,211,102,.35); }
        .gr-head { display: flex; align-items: center; gap: 10px; }
        .gr-chk { display: flex; align-items: center; cursor: pointer; flex: none; }
        .gr-chk input { width: 16px; height: 16px; accent-color: #25d366; }
        .gr-htoggle { display: flex; align-items: center; gap: 8px; background: transparent; border: none; color: var(--text); cursor: pointer; flex: 1; min-width: 0; text-align: left; padding: 0; }
        .gr-chev { color: var(--text-faint); font-size: 10px; flex: none; }
        .gr-gname { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gr-okb { flex: none; font-size: 10px; font-weight: 700; color: #8fe0b4; background: rgba(37,211,102,.14); border-radius: 5px; padding: 2px 7px; }
        .gr-badges { display: flex; gap: 6px; flex: none; }
        .gr-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; background: var(--surface); border: 1px solid var(--border-strong); color: var(--text-faint); border-radius: 5px; padding: 2px 6px; }
        .gr-badge.warn { color: #e6cb74; border-color: rgba(201,162,39,.4); }
        .gr-badge.dim { color: var(--text-faint); }
        .gr-sum { color: var(--text-dim); font-size: 12.5px; padding-left: 24px; }
        .gr-sum b { color: var(--text); }
        .gr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
        .gr-f { display: flex; flex-direction: column; gap: 5px; }
        .gr-l { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .4px; display: flex; align-items: center; gap: 5px; }
        .gr-i { cursor: help; color: var(--text-faint); font-size: 11px; text-transform: none; }
        .gr-in { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 8px; height: 40px; padding: 0 12px; font-size: 13.5px; outline: none; }
        .gr-in:focus { border-color: var(--primary); }
        .gr-count { font-size: 12.5px; }
        .gr-cnt { color: #8fe0b4; font-weight: 600; }
        .gr-warn { color: #e6cb74; }
        .gr-dim { color: var(--text-faint); }
        .gr-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .gr-mode { display: inline-flex; background: var(--bg); border: 1px solid var(--border-strong); border-radius: 8px; padding: 2px; gap: 2px; }
        .gr-m { background: transparent; border: none; color: var(--text-faint); font-size: 12px; padding: 5px 10px; border-radius: 6px; cursor: pointer; }
        .gr-m.on { background: #25d366; color: #0a2e18; font-weight: 700; }
        .gr-prev { color: var(--text-faint); font-size: 12px; } .gr-prev b { color: #8fe0b4; }
        .gr-lph { color: var(--text-dim); border-bottom: 1px dotted var(--text-faint); cursor: help; }
      `}</style>
    </div>
  );
}

/* ── Mic modal pentru „Seed pe săptămână" ── */
function SeedWeekModal({ onClose, onSeed }) {
  const [mounted, setMounted] = useState(false);
  const [wom, setWom] = useState(1);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === "undefined") return null;
  const opts = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: `Săptămâna ${n} din lună` }));
  return createPortal((
    <div className="sw-ov" onClick={onClose}>
      <div className="sw-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="sw-title">Seed pe săptămână</div>
        <div className="sw-sub">Populează grupurile acestei lucrări pe aceeași săptămână din lună (a câta slujire a lunii).</div>
        <Combo value={wom} onChange={setWom} options={opts} placeholder="alege săptămâna…" />
        <div className="sw-warn">⚠ Adaugă/scoate membri reali. Matrix gol → doar scoate.</div>
        <div className="sw-foot">
          <button className="sw-btn ghost" onClick={onClose}>Anulează</button>
          <button className="sw-btn" onClick={() => onSeed(wom)}>Seed săptămâna {wom}</button>
        </div>
      </div>
      <style jsx>{`
        .sw-ov { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 125; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .sw-dlg { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 14px; width: 420px; max-width: 95vw; padding: 18px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 26px 70px rgba(0,0,0,.55); }
        .sw-title { color: var(--text); font-size: 16px; font-weight: 700; }
        .sw-sub { color: var(--text-faint); font-size: 12.5px; line-height: 1.5; }
        .sw-warn { color: #e6cb74; font-size: 12px; background: rgba(201,162,39,.1); border: 1px solid rgba(201,162,39,.3); border-radius: 7px; padding: 8px 11px; }
        .sw-foot { display: flex; justify-content: flex-end; gap: 9px; margin-top: 2px; }
        .sw-btn { background: #25d366; border: 1px solid #1fb457; color: #0a2e18; border-radius: 8px; height: 38px; padding: 0 16px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .sw-btn.ghost { background: var(--surface-2); border-color: var(--border-strong); color: var(--text-dim); }
      `}</style>
    </div>
  ), document.body);
}
