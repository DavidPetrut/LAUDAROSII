"use client";
/**
 * WhatsApp — sincronizarea grupurilor cu Matrix-ul (Faza 1: fundație + dovadă).
 * 1 grup permanent per lucrare; rotim membrii = oamenii săptămânii curente. Puntea (Baileys) rulează LOCAL.
 * NIMIC nu se aplică pe oameni reali fără click (Preview → Sincronizează). Testează pe un grup de TEST.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { whatsappApi } from "@/lib/api/client";

export default function WhatsappPage() {
  const router = useRouter();
  const [st, setSt] = useState(null);          // status punte
  const [groups, setGroups] = useState([]);    // grupuri reale
  const [teams, setTeams] = useState([]);      // echipe (pt. picker)
  const [weeks, setWeeks] = useState([]);      // săptămânile echipei alese (offset + dată)
  const [maps, setMaps] = useState([]);
  const [busy, setBusy] = useState("");        // id acțiune în curs
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState({});  // mappingId -> preview
  const [result, setResult] = useState({});    // mappingId -> result sync
  const [addJid, setAddJid] = useState("");
  const [addTeam, setAddTeam] = useState("");
  const [addOffset, setAddOffset] = useState(0);
  const [addMode, setAddMode] = useState("semi");
  const pollRef = useRef(null);

  const loadStatus = useCallback(async () => { try { setSt(await whatsappApi.status()); } catch {} }, []);
  const loadGroups = useCallback(async () => { try { const r = await whatsappApi.groups(); setGroups(r.groups || []); } catch { setGroups([]); } }, []);
  const loadMaps = useCallback(async () => { try { const r = await whatsappApi.mappings(); setMaps(r.mappings || []); } catch {} }, []);
  const teamName = (id) => teams.find((t) => String(t.id) === String(id))?.name || "echipă";

  useEffect(() => {
    loadStatus(); loadMaps();
    whatsappApi.teams().then((r) => setTeams(r.teams || [])).catch(() => {});
  }, [loadStatus, loadMaps]);
  // când alegi o echipă → încarcă săptămânile ei (offset + dată)
  useEffect(() => {
    if (!addTeam) { setWeeks([]); return; }
    whatsappApi.teamWeeks(addTeam).then((r) => { setWeeks(r.weeks || []); setAddOffset(0); }).catch(() => setWeeks([]));
  }, [addTeam]);

  // polling status cât timp NU e conectat (ca să prindem QR-ul + conectarea)
  useEffect(() => {
    clearInterval(pollRef.current);
    if (st && !st.connected && st.bridgeEnabled) pollRef.current = setInterval(loadStatus, 2500);
    return () => clearInterval(pollRef.current);
  }, [st?.connected, st?.bridgeEnabled, loadStatus]);
  // când devine conectat → încarcă grupurile reale
  useEffect(() => { if (st?.connected) loadGroups(); }, [st?.connected, loadGroups]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  async function connect() { setBusy("connect"); try { setSt(await whatsappApi.connect()); } catch (e) { flash(e.message); } finally { setBusy(""); } }
  async function logout() { if (!confirm("Deloghezi puntea? Va trebui să re-scanezi QR.")) return; setBusy("logout"); try { setSt(await whatsappApi.logout()); setGroups([]); } catch (e) { flash(e.message); } finally { setBusy(""); } }

  async function addMapping() {
    if (!addJid || !addTeam) return flash("Alege un grup și o echipă.");
    const g = groups.find((x) => x.jid === addJid);
    setBusy("add");
    try { await whatsappApi.map({ jid: addJid, nameCached: g?.name || "", teamId: addTeam, weekOffset: addOffset, mode: addMode, botNumber: st?.me?.id?.split("@")[0]?.split(":")[0] }); setAddJid(""); setAddTeam(""); setAddOffset(0); await loadMaps(); flash("Mapat."); }
    catch (e) { flash(e.message); } finally { setBusy(""); }
  }
  async function unmap(id) { if (!confirm("Scoți maparea?")) return; try { await whatsappApi.unmap(id); await loadMaps(); } catch (e) { flash(e.message); } }
  async function setMode(id, mode) { try { await whatsappApi.setMode(id, mode); setMaps((m) => m.map((x) => String(x._id) === String(id) ? { ...x, mode } : x)); } catch (e) { flash(e.message); } }
  async function doPreview(id) { setBusy("prev" + id); try { const r = await whatsappApi.preview(id); setPreview((p) => ({ ...p, [id]: r })); } catch (e) { flash(e.message); } finally { setBusy(""); } }
  async function doSync(id, name) {
    if (!confirm(`Sincronizezi grupul „${name}" cu oamenii săptămânii curente? (adaugă/scoate membri reali)`)) return;
    setBusy("sync" + id);
    try { const r = await whatsappApi.sync(id); setResult((x) => ({ ...x, [id]: r })); await doPreview(id); flash(`Gata: +${r.added?.length || 0} adăugați, -${r.removed?.length || 0} scoși.`); }
    catch (e) { flash(e.message); } finally { setBusy(""); }
  }

  const connected = st?.connected;

  return (
    <div className="wa pc-full pc-pad">
      <div className="wa-head">
        <button className="wa-back" onClick={() => router.push("/plans")}>‹ Plans</button>
        <h1>Grupuri WhatsApp</h1>
        <span className="wa-note">Testează pe un grup de TEST, nu pe comunitatea reală.</span>
      </div>

      {msg && <div className="wa-flash">{msg}</div>}

      {/* STATUS / PAIRING */}
      <section className="wa-card">
        <div className="wa-ct">Conexiune punte</div>
        {!st ? <div className="wa-muted">Se încarcă…</div> : !st.bridgeEnabled ? (
          <div className="wa-offline">
            Puntea rulează doar LOCAL. Pornește backend-ul cu <code>WHATSAPP_BRIDGE=1</code> (și web-ul cu proxy spre backend-ul local), apoi revino aici.
          </div>
        ) : connected ? (
          <div className="wa-conn">
            <span className="wa-dot ok" /> Conectat ca <b>{st.me?.name || st.me?.id?.split("@")[0] || "—"}</b>
            <button className="wa-btn ghost" disabled={busy === "logout"} onClick={logout}>Deloghează / schimbă numărul</button>
          </div>
        ) : st.state === "qr" && st.qr ? (
          <div className="wa-qr">
            <img src={st.qr} alt="QR WhatsApp" width="220" height="220" />
            <div className="wa-qrtext">Scanează cu telefonul: WhatsApp → Dispozitive conectate → Conectează un dispozitiv.</div>
          </div>
        ) : (
          <div className="wa-conn">
            <span className="wa-dot" /> {st.state === "logged-out" ? "Deconectat (logout/ban)." : "Neconectat."}
            <button className="wa-btn" disabled={busy === "connect"} onClick={connect}>{busy === "connect" ? "Se conectează…" : "Conectează (arată QR)"}</button>
          </div>
        )}
      </section>

      {/* MAPARE grup↔lucrare */}
      {connected && (
        <section className="wa-card">
          <div className="wa-ct">Adaugă mapare grup ↔ lucrare</div>
          <div className="wa-addrow">
            <select value={addJid} onChange={(e) => setAddJid(e.target.value)}>
              <option value="">— alege grup WhatsApp —</option>
              {groups.map((g) => <option key={g.jid} value={g.jid}>{g.name || g.jid} ({g.size}){g.isAdmin ? "" : " · NU ești admin"}</option>)}
            </select>
            <select value={addTeam} onChange={(e) => setAddTeam(e.target.value)}>
              <option value="">— alege echipa —</option>
              {Object.entries(teams.reduce((acc, t) => { (acc[t.ministryGroup || "Alte"] = acc[t.ministryGroup || "Alte"] || []).push(t); return acc; }, {})).map(([grp, list]) => (
                <optgroup key={grp} label={grp}>{list.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
              ))}
            </select>
            <select value={addOffset} onChange={(e) => setAddOffset(Number(e.target.value))} disabled={!addTeam} title="A câta săptămână din viitor">
              {weeks.length === 0 ? <option value={0}>— săptămâna —</option> : weeks.map((w) => <option key={w.offset} value={w.offset}>{w.label}</option>)}
            </select>
            <select value={addMode} onChange={(e) => setAddMode(e.target.value)}>
              <option value="semi">Semi-auto (confirmi)</option>
              <option value="manual">Manual</option>
            </select>
            <button className="wa-btn" disabled={busy === "add"} onClick={addMapping}>Mapează</button>
          </div>
          <button className="wa-btn ghost sm" onClick={loadGroups}>↻ Reîncarcă grupurile</button>
        </section>
      )}

      {/* MAPĂRI existente */}
      <section className="wa-card">
        <div className="wa-ct">Lucrări mapate</div>
        {maps.length === 0 ? <div className="wa-muted">Nicio mapare încă.</div> : maps.map((m) => {
          const pv = preview[m._id]; const rs = result[m._id];
          return (
            <div key={m._id} className="wa-map">
              <div className="wa-maphead">
                <div className="wa-mapt"><b>{teamName(m.teamId)}</b> <span className="wa-dim">· săpt. {(m.weekOffset || 0) + 1}</span> <span className="wa-grp">→ {m.nameCached || m.jid}</span></div>
                <div className="wa-mapctrl">
                  <div className="wa-modes">
                    <button className={`wa-mode ${m.mode === "semi" ? "on" : ""}`} onClick={() => setMode(m._id, "semi")}>Semi-auto</button>
                    <button className={`wa-mode ${m.mode === "manual" ? "on" : ""}`} onClick={() => setMode(m._id, "manual")}>Manual</button>
                  </div>
                  <button className="wa-btn ghost sm" disabled={busy === "prev" + m._id} onClick={() => doPreview(m._id)}>Previzualizează</button>
                  <button className="wa-btn sm" disabled={!connected || busy === "sync" + m._id} onClick={() => doSync(m._id, m.nameCached || m.ministryGroup)}>{busy === "sync" + m._id ? "Se sincronizează…" : "Sincronizează acum"}</button>
                  <button className="wa-x" onClick={() => unmap(m._id)} title="Scoate maparea">×</button>
                </div>
              </div>
              {pv && (
                <div className="wa-prev">
                  <div className="wa-prevrow"><span className="wa-pl">Săptămâna</span> {pv.weekLabel || "—"}</div>
                  <div className="wa-prevrow"><span className="wa-pl">Nume nou grup</span> <b>{pv.plannedName || "—"}</b>{!pv.leaderName && <span className="wa-dim"> (fără lider găsit)</span>}</div>
                  <div className="wa-prevrow"><span className="wa-pl">Trebuie în grup</span> {pv.people?.length || 0} oameni</div>
                  {pv.liveError ? <div className="wa-prevrow err">{pv.liveError}</div> : (
                    <div className="wa-prevrow"><span className="wa-pl">Diff</span> +{pv.toAdd?.length || 0} de adăugat, −{pv.toRemove?.length || 0} de scos (acum {pv.currentCount} în grup)</div>
                  )}
                  {pv.missingPhone?.length > 0 && <div className="wa-prevrow warn">Fără număr: {pv.missingPhone.join(", ")}</div>}
                </div>
              )}
              {rs && (
                <div className="wa-res">
                  Rezultat: +{rs.added?.length || 0} adăugați · −{rs.removed?.length || 0} scoși
                  {rs.needInvite?.length > 0 && ` · ${rs.needInvite.length} au nevoie de link invitație (privacy)`}
                  {rs.failed?.length > 0 && ` · ${rs.failed.length} eșuate`}
                  {rs.renamed && <div>Redenumit: „{rs.renamed}"</div>}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <style jsx>{`
        .wa { padding-top: 16px; padding-bottom: 60px; }
        .wa-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
        .wa-back { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; height: 30px; padding: 0 12px; cursor: pointer; font-size: 13px; }
        .wa-back:hover { color: var(--text); }
        .wa-head h1 { font-size: 22px; font-weight: 600; margin: 0; }
        .wa-note { color: var(--text-faint); font-size: 12px; margin-left: auto; }
        .wa-flash { background: rgba(37,211,102,.14); border: 1px solid rgba(37,211,102,.4); color: #8fe0b4; border-radius: 8px; padding: 9px 13px; margin-bottom: 14px; font-size: 13px; }
        .wa-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; margin-bottom: 14px; }
        .wa-ct { color: var(--text-faint); font-size: 11px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 12px; }
        .wa-muted { color: var(--text-faint); font-size: 13px; }
        .wa-offline { color: #e6cb74; font-size: 13px; line-height: 1.6; }
        .wa-offline code { background: var(--surface-2); padding: 1px 6px; border-radius: 4px; color: var(--text); }
        .wa-conn { display: flex; align-items: center; gap: 11px; color: var(--text); font-size: 14px; }
        .wa-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--text-faint); flex: none; }
        .wa-dot.ok { background: #25d366; box-shadow: 0 0 0 3px rgba(37,211,102,.2); }
        .wa-qr { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
        .wa-qr img { border-radius: 10px; border: 4px solid #fff; background: #fff; }
        .wa-qrtext { color: var(--text-dim); font-size: 12.5px; }
        .wa-btn { background: #25d366; border: 1px solid #1fb457; color: #0a2e18; border-radius: 7px; height: 32px; padding: 0 14px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .wa-btn:hover { filter: brightness(1.05); } .wa-btn:disabled { opacity: .5; cursor: default; filter: none; }
        .wa-btn.ghost { background: var(--surface-2); border-color: var(--border-strong); color: var(--text-dim); }
        .wa-btn.ghost:hover { color: var(--text); }
        .wa-btn.sm { height: 28px; padding: 0 11px; font-size: 12px; }
        .wa-addrow { display: flex; flex-wrap: wrap; gap: 9px; align-items: center; margin-bottom: 10px; }
        .wa-addrow select { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 32px; padding: 0 10px; font-size: 13px; min-width: 180px; }
        .wa-map { border: 1px solid var(--border-strong); border-radius: 10px; padding: 12px 13px; margin-bottom: 10px; }
        .wa-maphead { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .wa-mapt { color: var(--text); font-size: 14px; } .wa-grp { color: var(--text-dim); font-size: 13px; }
        .wa-mapctrl { display: flex; align-items: center; gap: 8px; }
        .wa-modes { display: inline-flex; background: var(--bg); border: 1px solid var(--border-strong); border-radius: 7px; padding: 2px; gap: 2px; }
        .wa-mode { background: transparent; border: none; color: var(--text-faint); font-size: 12px; padding: 4px 9px; border-radius: 5px; cursor: pointer; }
        .wa-mode.on { background: #25d366; color: #0a2e18; font-weight: 700; }
        .wa-x { background: transparent; border: none; color: var(--text-faint); font-size: 19px; cursor: pointer; line-height: 1; padding: 0 3px; } .wa-x:hover { color: var(--danger); }
        .wa-prev { margin-top: 11px; padding-top: 11px; border-top: 1px dashed var(--border); display: flex; flex-direction: column; gap: 5px; }
        .wa-prevrow { color: var(--text-dim); font-size: 12.5px; }
        .wa-prevrow .wa-pl { color: var(--text-faint); display: inline-block; min-width: 118px; }
        .wa-prevrow.err { color: var(--danger); } .wa-prevrow.warn { color: #e6cb74; }
        .wa-dim { color: var(--text-faint); }
        .wa-res { margin-top: 10px; padding: 8px 11px; background: rgba(37,211,102,.1); border: 1px solid rgba(37,211,102,.3); border-radius: 8px; color: #8fe0b4; font-size: 12.5px; }
      `}</style>
    </div>
  );
}
