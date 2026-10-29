"use client";
/**
 * WhatsApp — sincronizarea grupurilor cu Matrix-ul.
 * O mapare = o ECHIPĂ (headerul din Matrix) + a câta săptămână; rotim membrii = oamenii echipei pe acea dată.
 * Numele grupului se GENEREAZĂ: {prefix ales de user} - {dată} - {lider din poziția aleasă}.
 * Puntea (Baileys) rulează LOCAL. NIMIC pe oameni reali fără click (Preview → Sincronizează/Seed).
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
        .combo-pop { position: absolute; z-index: 30; top: calc(100% + 4px); left: 0; right: 0; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 9px; box-shadow: 0 14px 40px rgba(0,0,0,.5); padding: 7px; }
        .combo-search { width: 100%; background: var(--bg); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 32px; padding: 0 10px; font-size: 13px; outline: none; margin-bottom: 6px; }
        .combo-search:focus { border-color: var(--primary); }
        .combo-list { max-height: 260px; overflow: auto; display: flex; flex-direction: column; gap: 2px; }
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

export default function WhatsappPage() {
  const router = useRouter();
  const [st, setSt] = useState(null);
  const [groups, setGroups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [maps, setMaps] = useState([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState({});
  const [result, setResult] = useState({});
  const [addOpen, setAddOpen] = useState(false);
  const [seedWeekOpen, setSeedWeekOpen] = useState(false);
  const pollRef = useRef(null);

  const loadStatus = useCallback(async () => { try { setSt(await whatsappApi.status()); } catch {} }, []);
  const loadGroups = useCallback(async () => { try { const r = await whatsappApi.groups(); setGroups(r.groups || []); } catch { setGroups([]); } }, []);
  const loadMaps = useCallback(async () => { try { const r = await whatsappApi.mappings(); setMaps(r.mappings || []); } catch {} }, []);
  const teamName = (id) => teams.find((t) => String(t.id) === String(id))?.name || "echipă";
  const groupName = (jid, fallback) => groups.find((g) => g.jid === jid)?.name || fallback || jid;

  useEffect(() => {
    loadStatus(); loadMaps();
    whatsappApi.teams().then((r) => setTeams(r.teams || [])).catch(() => {});
  }, [loadStatus, loadMaps]);
  useEffect(() => {
    clearInterval(pollRef.current);
    if (st && !st.connected && st.bridgeEnabled) pollRef.current = setInterval(loadStatus, 2500);
    return () => clearInterval(pollRef.current);
  }, [st?.connected, st?.bridgeEnabled, loadStatus]);
  useEffect(() => { if (st?.connected) loadGroups(); }, [st?.connected, loadGroups]);
  useEffect(() => {
    if (!st?.connected || !maps.length) return;
    maps.forEach((m) => { if (!preview[m._id]) doPreview(m._id); });
    // eslint-disable-next-line
  }, [st?.connected, maps]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 5000); };
  const botNumber = st?.me?.id?.split("@")[0]?.split(":")[0] || "";
  const connected = st?.connected;
  // ordine: pe comunitate/echipă, apoi SĂPTĂMÂNA DIN LUNĂ crescător (1 → 5)
  const sortedMaps = [...maps].sort((a, b) =>
    (a.ministryGroup || "").localeCompare(b.ministryGroup || "") ||
    String(a.communityJid || "").localeCompare(String(b.communityJid || "")) ||
    String(a.teamId || "").localeCompare(String(b.teamId || "")) ||
    (a.weekOfMonth || 1) - (b.weekOfMonth || 1) ||
    (a.nameCached || "").localeCompare(b.nameCached || "")
  );

  async function connect() { setBusy("connect"); try { setSt(await whatsappApi.connect()); } catch (e) { flash(e.message); } finally { setBusy(""); } }
  async function logout() { if (!confirm("Deloghezi puntea? Va trebui să re-scanezi QR.")) return; setBusy("logout"); try { setSt(await whatsappApi.logout()); setGroups([]); } catch (e) { flash(e.message); } finally { setBusy(""); } }
  async function unmap(id) { if (!confirm("Scoți grupul din sincronizare? (grupul WhatsApp rămâne, doar maparea dispare)")) return; try { await whatsappApi.unmap(id); setPreview((p) => { const n = { ...p }; delete n[id]; return n; }); await loadMaps(); } catch (e) { flash(e.message); } }
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
    const empties = results.filter((r) => r.emptyMatrix).length;
    return `Seed: ${results.length} grupuri · +${a} adăugați · −${d} scoși${empties ? ` · ${empties} cu Matrix gol` : ""}.`;
  }
  async function doSeedAll() {
    if (!confirm("Seed TOATE grupurile din Matrix? (adaugă/scoate membri reali în fiecare grup mapat)")) return;
    setBusy("seedall");
    try { const r = await whatsappApi.seedAll(); flash(seedSummary(r.results || [])); await loadMaps(); maps.forEach((m) => doPreview(m._id)); }
    catch (e) { flash(e.message); } finally { setBusy(""); }
  }
  async function doSeedWeek(offset) {
    setSeedWeekOpen(false); setBusy("seedweek");
    try { const r = await whatsappApi.seedWeek(offset); flash(seedSummary(r.results || [])); await loadMaps(); maps.forEach((m) => doPreview(m._id)); }
    catch (e) { flash(e.message); } finally { setBusy(""); }
  }
  async function onAdded(n) { setAddOpen(false); await loadMaps(); flash(`${n || 1} grup(uri) adăugate în sincronizare.`); }

  return (
    <div className="wa">
      <div className="wa-head">
        <button className="wa-back" onClick={() => router.push("/plans")}>‹ Plans</button>
        <h1>Grupuri WhatsApp</h1>
        <span className="wa-note">Testează pe un grup de TEST, nu pe comunitatea reală.</span>
      </div>
      {msg && <div className="wa-flash">{msg}</div>}

      {/* CONEXIUNE */}
      <section className="wa-card conn">
        <div className="conn-left">
          <div className="wa-ct">Conexiune punte</div>
          {!st ? <div className="wa-muted">Se încarcă…</div> : !st.bridgeEnabled ? (
            <div className="wa-offline">Puntea rulează doar LOCAL. Pornește backend-ul cu <code>WHATSAPP_BRIDGE=1</code> și web-ul cu proxy local, apoi revino.</div>
          ) : connected ? (
            <div className="conn-on">
              <span className="wa-dot ok" />
              <div><div className="conn-name">Conectat ca <b>{st.me?.name || botNumber}</b></div><div className="conn-sub">Numărul-robot: {botNumber || "—"} · vezi toate grupurile; mapează-le mai jos.</div></div>
            </div>
          ) : st.state === "qr" && st.qr ? (
            <div className="wa-qr"><img src={st.qr} alt="QR" width="200" height="200" /><div className="wa-qrtext">Scanează: WhatsApp → Dispozitive conectate → Conectează un dispozitiv.</div></div>
          ) : (
            <div className="conn-on"><span className="wa-dot" /><div><div className="conn-name">{st.state === "logged-out" ? "Deconectat (logout/ban)" : "Neconectat"}</div><div className="conn-sub">Apasă „Conectează" ca să scanezi QR-ul.</div></div></div>
          )}
        </div>
        <div className="conn-right">
          {connected ? <button className="wa-btn ghost" disabled={busy === "logout"} onClick={logout}>Deloghează / schimbă numărul</button>
            : st?.bridgeEnabled && st?.state !== "qr" ? <button className="wa-btn" disabled={busy === "connect"} onClick={connect}>{busy === "connect" ? "Se conectează…" : "Conectează"}</button> : null}
        </div>
      </section>

      {/* GRUPURI */}
      {connected && (
        <>
          <div className="wa-toolbar">
            <div className="wa-ct2">Grupuri configurate <span className="wa-count">{maps.length}</span></div>
            <div className="wa-tacts">
              {maps.length > 0 && <>
                <button className="wa-btn ghost" disabled={busy === "seedall" || busy === "seedweek"} onClick={doSeedAll} title="Populează toate grupurile din Matrix">{busy === "seedall" ? "Seed…" : "⟳ Seed toate"}</button>
                <button className="wa-btn ghost" disabled={busy === "seedall" || busy === "seedweek"} onClick={() => setSeedWeekOpen(true)} title="Populează toate grupurile pe o anumită săptămână">Seed pe săptămână</button>
              </>}
              <button className="wa-btn add" onClick={() => setAddOpen(true)}>＋ Adaugă grup</button>
            </div>
          </div>

          {maps.length === 0 ? (
            <div className="wa-empty">
              <div className="wa-emptyt">Niciun grup configurat încă</div>
              <div className="wa-emptys">Alege o comunitate (sau un grup), mapează echipa din Matrix + a câta săptămână, și cum se generează numele. Apoi „Seed" îi populează din Matrix.</div>
              <button className="wa-btn add big" onClick={() => setAddOpen(true)}>＋ Adaugă primul grup</button>
            </div>
          ) : (
            <div className="wa-grid">
              {sortedMaps.map((m) => {
                const pv = preview[m._id]; const rs = result[m._id]; const g = groups.find((x) => x.jid === m.jid);
                return (
                  <div key={m._id} className="gcard">
                    <div className="gc-head">
                      <div className="gc-title">
                        <span className="gc-wa"><svg viewBox="0 0 24 24" width="16" height="16" fill="#25d366"><path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.02ZM12.04 20.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23a8.2 8.2 0 0 1 8.23 8.24c0 4.54-3.7 8.23-8.24 8.23Z"/></svg></span>
                        <div><div className="gc-name">{m.nameCached || groupName(m.jid)}</div>{g?.community && <div className="gc-comm">în comunitatea „{g.community}"</div>}</div>
                      </div>
                      <button className="gc-del" title="Scoate din sincronizare" onClick={() => unmap(m._id)}>×</button>
                    </div>

                    <div className="gc-bind">
                      <div className="gc-b"><span className="gc-bl">Echipă</span><b>{teamName(m.teamId)}</b></div>
                      <div className="gc-b"><span className="gc-bl">Săptămâna</span><b>a {m.weekOfMonth || 1}-a din lună</b> {pv?.weekLabel && <span className="gc-dim">· {pv.weekLabel}</span>}</div>
                      {m.namePrefix && <div className="gc-b"><span className="gc-bl">Prefix nume</span><b>{m.namePrefix}</b></div>}
                      {!g?.isAdmin && g && <div className="gc-warn">⚠ Nu ești admin în acest grup — nu poți adăuga/scoate.</div>}
                    </div>

                    <div className="gc-mode">
                      <span className="gc-ml">Mod</span>
                      <div className="gc-modes">
                        <button className={`gc-m ${m.mode === "auto" ? "on" : ""}`} title="Aplică singur din Matrix, fără click. Matrix gol → doar scoate. (Necesită scheduler-ul — Faza 3)" onClick={() => setMode(m._id, "auto")}>Automat</button>
                        <button className={`gc-m ${m.mode === "semi" ? "on" : ""}`} title="Sistemul pregătește + te anunță; confirmi cu un click. (Necesită scheduler-ul — Faza 3)" onClick={() => setMode(m._id, "semi")}>Semi-auto</button>
                        <button className={`gc-m ${m.mode === "manual" ? "on" : ""}`} title="Apeși tu Seed/Sincronizează când vrei." onClick={() => setMode(m._id, "manual")}>Manual</button>
                      </div>
                    </div>

                    <div className="gc-status">
                      {!pv ? <div className="wa-muted">{busy === "prev" + m._id ? "Se calculează…" : "—"}</div> : pv.liveError ? (
                        <div className="gc-srow err">{pv.liveError}</div>
                      ) : (
                        <>
                          <div className="gc-srow"><span className="gc-sl">Nume nou</span> <b className="gc-newname">{pv.plannedName || "—"}</b>{!pv.leaderName && <span className="gc-dim"> (fără lider)</span>}</div>
                          <div className="gc-srow"><span className="gc-sl">Trebuie</span> {pv.people?.length || 0} oameni · în grup acum {pv.currentCount}</div>
                          <div className="gc-srow"><span className="gc-sl">Schimbări</span> <span className="gc-add">+{pv.toAdd?.length || 0}</span> <span className="gc-rem">−{pv.toRemove?.length || 0}</span></div>
                          {pv.emptyMatrix && <div className="gc-srow warn">⚠ Matrix gol pe săptămâna asta — sync-ul doar scoate (fă planificarea + Seed).</div>}
                          {pv.missingPhone?.length > 0 && <div className="gc-srow warn">Fără număr: {pv.missingPhone.join(", ")}</div>}
                        </>
                      )}
                    </div>

                    <div className="gc-actions">
                      <button className="wa-btn ghost sm" disabled={busy === "prev" + m._id} onClick={() => doPreview(m._id)}>↻ Reîmprospătează</button>
                      <button className="wa-btn sm" disabled={busy === "sync" + m._id || !g?.isAdmin} onClick={() => doSync(m._id, m.nameCached || teamName(m.teamId))}>{busy === "sync" + m._id ? "Se sincronizează…" : "Sincronizează acum"}</button>
                    </div>
                    {rs && <div className="gc-res">Ultima sincronizare: +{rs.added?.length || 0} adăugați · −{rs.removed?.length || 0} scoși{rs.needInvite?.length > 0 ? ` · ${rs.needInvite.length} necesită link invitație` : ""}{rs.renamed ? ` · „${rs.renamed}"` : ""}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {addOpen && <SetupModal groups={groups} teams={teams} mappedJids={maps.map((m) => m.jid)} botNumber={botNumber} onClose={() => setAddOpen(false)} onAdded={onAdded} />}
      {seedWeekOpen && <SeedWeekModal onClose={() => setSeedWeekOpen(false)} onSeed={doSeedWeek} />}

      <style jsx>{`
        .wa { max-width: 1120px; margin: 0 auto; padding: 16px 20px 70px; }
        .wa-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
        .wa-back { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; height: 30px; padding: 0 12px; cursor: pointer; font-size: 13px; }
        .wa-back:hover { color: var(--text); }
        .wa-head h1 { font-size: 22px; font-weight: 600; margin: 0; }
        .wa-note { color: var(--text-faint); font-size: 12px; margin-left: auto; }
        .wa-flash { background: rgba(37,211,102,.14); border: 1px solid rgba(37,211,102,.4); color: #8fe0b4; border-radius: 8px; padding: 9px 13px; margin-bottom: 14px; font-size: 13px; }
        .wa-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; margin-bottom: 16px; }
        .wa-card.conn { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .conn-left { flex: 1; min-width: 260px; }
        .wa-ct { color: var(--text-faint); font-size: 11px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 11px; }
        .wa-muted { color: var(--text-faint); font-size: 13px; }
        .wa-offline { color: #e6cb74; font-size: 13px; line-height: 1.6; }
        .wa-offline code { background: var(--surface-2); padding: 1px 6px; border-radius: 4px; color: var(--text); }
        .conn-on { display: flex; align-items: center; gap: 12px; }
        .wa-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--text-faint); flex: none; }
        .wa-dot.ok { background: #25d366; box-shadow: 0 0 0 3px rgba(37,211,102,.2); }
        .conn-name { color: var(--text); font-size: 15px; }
        .conn-sub { color: var(--text-faint); font-size: 12px; margin-top: 2px; }
        .wa-qr { display: flex; align-items: center; gap: 16px; }
        .wa-qr img { border-radius: 10px; border: 4px solid #fff; background: #fff; flex: none; }
        .wa-qrtext { color: var(--text-dim); font-size: 12.5px; max-width: 240px; line-height: 1.5; }
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
        .wa-empty { text-align: center; padding: 50px 20px; background: var(--surface); border: 1px dashed var(--border-strong); border-radius: 12px; }
        .wa-emptyt { color: var(--text); font-size: 16px; font-weight: 600; }
        .wa-emptys { color: var(--text-faint); font-size: 13px; margin-top: 6px; max-width: 460px; margin-left: auto; margin-right: auto; line-height: 1.5; }
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
        .gc-m { background: transparent; border: none; color: var(--text-faint); font-size: 12.5px; padding: 5px 12px; border-radius: 6px; cursor: pointer; }
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

/* ── Setup: alegi comunitate/grup → configurezi fiecare grup (echipă + săptămână + nume + lider) → salvezi în bloc ── */
function SetupModal({ groups, teams, mappedJids, botNumber, onClose, onAdded }) {
  const [mounted, setMounted] = useState(false);
  const [targetJid, setTargetJid] = useState(""); // jid de comunitate SAU de grup
  const [rows, setRows] = useState({});            // { [jid]: { enabled, teamId, weekOfMonth, namePrefix, leaderPositionId, mode } }
  const [collapsed, setCollapsed] = useState({});  // { [jid]: bool } — rând restrâns
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { setMounted(true); }, []);

  // comunitățile (din intrările isCommunity SAU derivate din communityJid-ul copiilor) + grupurile de sine stătătoare
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
      const items = targetGroups
        .filter((g) => (rows[g.jid]?.enabled ?? true) && rows[g.jid]?.teamId)
        .map((g) => {
          const r = rows[g.jid] || {};
          return { jid: g.jid, nameCached: g.name || "", communityJid: g.communityJid || "", teamId: r.teamId, weekOfMonth: r.weekOfMonth || 1, namePrefix: r.namePrefix || "", leaderPositionId: r.leaderPositionId || null, mode: r.mode || "semi", botNumber };
        });
      if (!items.length) { setErr("Configurează cel puțin un grup (alege echipa)."); setSaving(false); return; }
      await whatsappApi.mapBulk(items);
      onAdded(items.length);
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  return createPortal((
    <div className="sm-ov" onClick={() => !saving && onClose()}>
      <div className="sm-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="sm-top">
          <div className="sm-title">Adaugă grupuri în sincronizare</div>
          <button className="sm-x" onClick={onClose}>×</button>
        </div>

        <div className="sm-pick">
          <label>Comunitate sau grup</label>
          <Combo value={targetJid} onChange={(v) => { setTargetJid(v); }} options={targetOpts} placeholder="alege o comunitate (toate grupurile ei) sau un grup…" />
          <div className="sm-hint">Alegi o <b>comunitate</b> → configurezi toate grupurile ei odată. Sau un singur <b>grup</b>. Numele de pe WhatsApp nu contează — tu mapezi headerul din Matrix.</div>
        </div>

        <div className="sm-body">
          {!targetJid ? (
            <div className="sm-ph">Alege o comunitate sau un grup ca să începi.</div>
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
        .sm-hint { color: var(--text-faint); font-size: 12px; line-height: 1.5; }
        .sm-body { padding: 10px 18px; overflow: auto; display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 120px; }
        .sm-ph { color: var(--text-faint); font-size: 13px; text-align: center; padding: 30px 10px; }
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

/* ── O linie de configurare pentru UN grup: echipă + săptămână + prefix + poziție-lider + mod + preview nume ── */
function GroupRow({ group, teams, value, onChange, alreadyMapped, collapsed, onToggleCollapse }) {
  const [weeks, setWeeks] = useState([]);
  const [positions, setPositions] = useState([]);
  const [tp, setTp] = useState(null);       // preview-țintă: câți din Matrix + liderul real
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
  const weekOpts = weeks; // [{ value: 1-5, label: „Săptămâna N (ex. …)" }]
  const posOpts = [{ value: "", label: "— fără lider în nume —" }, ...positions.map((p) => ({ value: p.id, label: p.name }))];
  const t = teams.find((x) => String(x.id) === String(v.teamId));
  const posName = positions.find((p) => String(p.id) === String(v.leaderPositionId))?.name;
  const wkShort = tp?.weekShort || ""; // data reală la care se rezolvă (ex. „15 noi")
  const prefix = v.namePrefix || t?.name || "";
  const leaderReal = tp?.leaderName;             // numele real din Matrix pe acea săptămână (dacă există)
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
              <button className={`gr-m ${v.mode === "auto" ? "on" : ""}`} title="Aplică singur din Matrix, fără click. Matrix gol → doar scoate. (Necesită scheduler-ul — Faza 3)" onClick={() => onChange({ mode: "auto" })}>Automat</button>
              <button className={`gr-m ${v.mode === "semi" ? "on" : ""}`} title="Sistemul pregătește + te anunță; confirmi cu un click. (Necesită scheduler-ul — Faza 3)" onClick={() => onChange({ mode: "semi" })}>Semi-auto</button>
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
        .gr-m { background: transparent; border: none; color: var(--text-faint); font-size: 12px; padding: 5px 11px; border-radius: 6px; cursor: pointer; }
        .gr-m.on { background: #25d366; color: #0a2e18; font-weight: 700; }
        .gr-prev { color: var(--text-faint); font-size: 12px; } .gr-prev b { color: #8fe0b4; }
        .gr-lph { color: var(--text-dim); border-bottom: 1px dotted var(--text-faint); cursor: help; }
      `}</style>
    </div>
  );
}

/* ── Mic modal pentru „Seed pe săptămână" (alege a câta săptămână, forțat pentru toate grupurile) ── */
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
        <div className="sw-sub">Populează TOATE grupurile mapate pe aceeași săptămână din lună (a câta slujire a lunii pentru fiecare echipă).</div>
        <Combo value={wom} onChange={setWom} options={opts} placeholder="alege săptămâna…" />
        <div className="sw-warn">⚠ Adaugă/scoate membri reali în toate grupurile. Matrix gol → doar scoate.</div>
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
