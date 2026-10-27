"use client";
/**
 * TeamsManagerModal — management echipe + poziții la nivel de service type (#9), stil PCO premium.
 * Două panouri: STÂNGA = lista de echipe (drag-reorder, adaugă, selectează);
 * DREAPTA = detaliul echipei selectate (nume, grup de slujire, flags, poziții cu
 * drag-reorder/redenumire/ștergere, + „Opțiuni avansate" cu defaults de planificare).
 *
 * Totul e optimist + reconciliat; ștergerile au confirmare inline (gate anti-greșeli) și
 * arată câți oameni sunt afectați. Aditiv & compatibil cu importul PCO. ZERO email — doar DB.
 */
import { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { teamsApi } from "@/lib/api/client";

/* comutator mic, identic cu ServiceTypeSettingsModal */
function Toggle({ on, onChange, label, hint }) {
  return (
    <button type="button" className={`tg ${on ? "on" : ""}`} onClick={() => onChange(!on)}>
      <span className="tg-sw"><span className="tg-dot" /></span>
      <span className="tg-tx"><span className="tg-l">{label}</span>{hint ? <span className="tg-h">{hint}</span> : null}</span>
      <style jsx>{`
        .tg { display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; background: transparent; border: none; cursor: pointer; padding: 5px 0; }
        .tg-sw { width: 34px; height: 20px; flex: none; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 20px; position: relative; transition: background .16s, border-color .16s; }
        .tg-dot { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--text-faint); transition: transform .16s, background .16s; }
        .tg.on .tg-sw { background: rgba(47,129,247,.25); border-color: var(--primary); }
        .tg.on .tg-dot { transform: translateX(14px); background: var(--primary); }
        .tg-tx { display: flex; flex-direction: column; }
        .tg-l { color: var(--text); font-size: 13px; }
        .tg-h { color: var(--text-faint); font-size: 11px; margin-top: 1px; }
      `}</style>
    </button>
  );
}

const Grip = () => (
  <svg className="grip" width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden><circle cx="3" cy="2.5" r="1.1" /><circle cx="9" cy="2.5" r="1.1" /><circle cx="3" cy="6" r="1.1" /><circle cx="9" cy="6" r="1.1" /><circle cx="3" cy="9.5" r="1.1" /><circle cx="9" cy="9.5" r="1.1" /></svg>
);
const Trash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
);

const ADVANCED = {
  repliesToMode: { label: "Răspunsurile merg la", opts: [["currentScheduler", "Planificatorul curent"], ["allLeaders", "Toți liderii echipei"], ["person", "Persoana care a programat"]] },
  onDecline: { label: "Când cineva refuză", opts: [["manual", "Reprogramez manual"], ["doNotReschedule", "Nu reprograma"], ["replacement", "Cere înlocuitor"], ["autoSchedule", "Programează automat"], ["signup", "Deschide pentru înscriere"]] },
  scheduledViewerAccess: { label: "Ce vede cel programat", opts: [["myScheduleOnly", "Doar programul lui"], ["fullPlan", "Tot planul"]] },
  defaultStatus: { label: "Status implicit la asignare", opts: [["unconfirmed", "Neconfirmat"], ["confirmed", "Confirmat"]] },
};

export default function TeamsManagerModal({ serviceTypeId, onClose, onChanged, initialData = null }) {
  const [loading, setLoading] = useState(!initialData);
  const [err, setErr] = useState("");
  const [stName, setStName] = useState("");
  const [groups, setGroups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selId, setSelId] = useState(null);
  const [newTeam, setNewTeam] = useState("");
  const [newPos, setNewPos] = useState("");
  const [advOpen, setAdvOpen] = useState(false);
  const [confirmTeam, setConfirmTeam] = useState(null);  // teamId în așteptare de confirmare ștergere
  const [confirmPos, setConfirmPos] = useState(null);    // positionId în așteptare
  const [editName, setEditName] = useState("");          // redenumire echipă (dreapta)
  const dirty = useRef(false);                            // am schimbat ceva → anunț matrix la close
  const dragTeam = useRef(null);
  const dragPos = useRef(null);

  const sel = teams.find((t) => String(t.id) === String(selId)) || null;

  useEffect(() => {
    if (initialData) { // preview/harness: date preseed-uite (ca ServiceTypeSettingsModal.initialData)
      setStName(initialData.serviceTypeName || ""); setGroups(initialData.ministryGroups || []);
      setTeams(initialData.teams || []); setSelId(initialData.teams?.[0]?.id || null); return;
    }
    let alive = true;
    teamsApi.manage(serviceTypeId)
      .then((r) => { if (!alive) return; setStName(r.serviceTypeName || ""); setGroups(r.ministryGroups || []); setTeams(r.teams || []); setSelId(r.teams?.[0]?.id || null); })
      .catch((e) => alive && setErr(e?.message || "Eroare la încărcare."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [serviceTypeId]);

  useEffect(() => { setEditName(sel?.name || ""); setConfirmPos(null); setConfirmTeam(null); setAdvOpen(false); }, [selId]); // eslint-disable-line

  const patchTeam = (id, patch) => setTeams((ts) => ts.map((t) => (String(t.id) === String(id) ? { ...t, ...patch } : t)));
  const touch = () => { dirty.current = true; };
  const close = () => { if (dirty.current) onChanged?.(); onClose?.(); };

  /* ── echipe ── */
  async function addTeam() {
    const name = newTeam.trim();
    if (!name) return;
    setNewTeam("");
    try {
      const t = await teamsApi.create({ name, serviceTypeId });
      setTeams((ts) => [...ts, t]); setSelId(t.id); touch();
    } catch (e) { setErr(e?.message || "Nu am putut crea echipa."); }
  }
  async function saveTeamName() {
    const name = editName.trim();
    if (!sel || !name || name === sel.name) { setEditName(sel?.name || ""); return; }
    patchTeam(sel.id, { name }); touch();
    try { await teamsApi.update(sel.id, { name }); } catch (e) { setErr(e?.message || "Eroare la redenumire."); }
  }
  async function setField(patch) {
    if (!sel) return;
    patchTeam(sel.id, patch); touch();
    try { await teamsApi.update(sel.id, patch); } catch (e) { setErr(e?.message || "Eroare la salvare."); }
  }
  async function removeTeam(id) {
    const victim = teams.find((t) => String(t.id) === String(id));
    setTeams((ts) => ts.filter((t) => String(t.id) !== String(id)));
    if (String(selId) === String(id)) setSelId((teams.find((t) => String(t.id) !== String(id)) || {}).id || null);
    setConfirmTeam(null); touch();
    try { await teamsApi.remove(id); } catch (e) { setErr(e?.message || "Eroare la ștergere."); if (victim) setTeams((ts) => [...ts, victim]); }
  }
  function dropTeam(overId) {
    const from = dragTeam.current; dragTeam.current = null;
    if (!from || String(from) === String(overId)) return;
    setTeams((ts) => {
      const arr = [...ts];
      const fi = arr.findIndex((t) => String(t.id) === String(from));
      const ti = arr.findIndex((t) => String(t.id) === String(overId));
      if (fi < 0 || ti < 0) return ts;
      const [m] = arr.splice(fi, 1); arr.splice(ti, 0, m);
      teamsApi.reorder(arr.map((t) => t.id)).catch(() => {});
      return arr;
    });
    touch();
  }

  /* ── poziții ── */
  async function addPos() {
    const name = newPos.trim();
    if (!name || !sel) return;
    setNewPos("");
    try {
      const p = await teamsApi.addPosition(sel.id, name);
      patchTeam(sel.id, { positions: [...(sel.positions || []), p] }); touch();
    } catch (e) { setErr(e?.message || "Nu am putut adăuga poziția."); }
  }
  async function renamePos(posId, name) {
    const nm = name.trim();
    const cur = sel?.positions?.find((p) => String(p.id) === String(posId));
    if (!sel || !nm || !cur || nm === cur.name) return;
    patchTeam(sel.id, { positions: sel.positions.map((p) => (String(p.id) === String(posId) ? { ...p, name: nm } : p)) }); touch();
    try { await teamsApi.renamePosition(sel.id, posId, nm); } catch (e) { setErr(e?.message || "Eroare la redenumire."); }
  }
  async function removePos(posId) {
    if (!sel) return;
    const victim = sel.positions.find((p) => String(p.id) === String(posId));
    patchTeam(sel.id, { positions: sel.positions.filter((p) => String(p.id) !== String(posId)) });
    setConfirmPos(null); touch();
    try { await teamsApi.removePosition(sel.id, posId); } catch (e) { setErr(e?.message || "Eroare la ștergere."); if (victim) patchTeam(sel.id, { positions: [...sel.positions] }); }
  }
  function dropPos(overId) {
    const from = dragPos.current; dragPos.current = null;
    if (!from || !sel || String(from) === String(overId)) return;
    const arr = [...sel.positions];
    const fi = arr.findIndex((p) => String(p.id) === String(from));
    const ti = arr.findIndex((p) => String(p.id) === String(overId));
    if (fi < 0 || ti < 0) return;
    const [m] = arr.splice(fi, 1); arr.splice(ti, 0, m);
    patchTeam(sel.id, { positions: arr }); touch();
    teamsApi.reorderPositions(sel.id, arr.map((p) => p.id)).catch(() => {});
  }

  return (
    <Modal title={`Echipe · ${stName || "Service type"}`} onClose={close} width={780}>
      {err && <div className="tm-err" onClick={() => setErr("")}>{err}</div>}
      {loading ? (
        <div className="tm-load">Se încarcă echipele…</div>
      ) : (
        <div className="tm">
          {/* STÂNGA — lista echipelor */}
          <div className="tm-rail">
            <div className="tm-rh">Echipe <span className="tm-ct">{teams.length}</span></div>
            <div className="tm-tlist">
              {teams.map((t) => (
                <div key={t.id} draggable
                  onDragStart={() => (dragTeam.current = t.id)}
                  onDragOver={(e) => dragTeam.current && e.preventDefault()}
                  onDrop={() => dropTeam(t.id)}
                  className={`tm-trow ${String(selId) === String(t.id) ? "on" : ""}`}
                  onClick={() => setSelId(t.id)}>
                  <span className="tm-grip"><Grip /></span>
                  <span className="tm-tn">{t.name}</span>
                  <span className="tm-tmeta">{(t.positions || []).length} poz.</span>
                </div>
              ))}
              {teams.length === 0 && <div className="tm-empty">Nicio echipă încă.</div>}
            </div>
            <div className="tm-add">
              <input value={newTeam} placeholder="Echipă nouă…" onChange={(e) => setNewTeam(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTeam()} />
              <button onClick={addTeam} disabled={!newTeam.trim()} title="Adaugă echipă">+</button>
            </div>
          </div>

          {/* DREAPTA — detaliul echipei */}
          <div className="tm-detail">
            {!sel ? (
              <div className="tm-none">Selectează sau adaugă o echipă.</div>
            ) : (
              <>
                <input className="tm-name" value={editName} onChange={(e) => setEditName(e.target.value)}
                  onBlur={saveTeamName} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} placeholder="Nume echipă" />

                <div className="tm-row2">
                  <label className="tm-field">
                    <span className="tm-fl">Grup de slujire</span>
                    <select value={sel.ministryGroup || ""} onChange={(e) => setField({ ministryGroup: e.target.value })}>
                      <option value="">— Fără grup —</option>
                      {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </label>
                  <div className="tm-flags">
                    <Toggle on={sel.flags?.rehearsal} onChange={(v) => setField({ flags: { rehearsal: v } })} label="Repetiție" hint="echipă de repetiție" />
                    <Toggle on={sel.flags?.split} onChange={(v) => setField({ flags: { split: v } })} label="Split pe oră" hint="Needed per oră de serviciu" />
                    <Toggle on={sel.flags?.secure} onChange={(v) => setField({ flags: { secure: v } })} label="Securizat" hint="date sensibile" />
                  </div>
                </div>

                {/* poziții */}
                <div className="tm-sec">
                  <div className="tm-sh">Poziții <span className="tm-ct">{(sel.positions || []).length}</span></div>
                  <div className="tm-plist">
                    {(sel.positions || []).map((p) => (
                      <div key={p.id} draggable
                        onDragStart={() => (dragPos.current = p.id)}
                        onDragOver={(e) => dragPos.current && e.preventDefault()}
                        onDrop={() => dropPos(p.id)}
                        className="tm-prow">
                        <span className="tm-grip"><Grip /></span>
                        <input className="tm-pn" defaultValue={p.name}
                          onBlur={(e) => renamePos(p.id, e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
                        {p.assignedCount > 0 && <span className="tm-pc" title="Oameni asignați (în toate planurile)">{p.assignedCount}</span>}
                        {confirmPos === p.id ? (
                          <span className="tm-cfm">
                            <span className="tm-cfx">{p.assignedCount > 0 ? `Scot ${p.assignedCount} asignări?` : "Sigur?"}</span>
                            <button className="tm-yes" onClick={() => removePos(p.id)}>Șterge</button>
                            <button className="tm-no" onClick={() => setConfirmPos(null)}>Nu</button>
                          </span>
                        ) : (
                          <button className="tm-del" title="Șterge poziția" onClick={() => setConfirmPos(p.id)}><Trash /></button>
                        )}
                      </div>
                    ))}
                    {(sel.positions || []).length === 0 && <div className="tm-empty">Nicio poziție încă.</div>}
                  </div>
                  <div className="tm-add">
                    <input value={newPos} placeholder="Poziție nouă…" onChange={(e) => setNewPos(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addPos()} />
                    <button onClick={addPos} disabled={!newPos.trim()} title="Adaugă poziție">+</button>
                  </div>
                </div>

                {/* avansat */}
                <button className={`tm-advt ${advOpen ? "on" : ""}`} onClick={() => setAdvOpen((v) => !v)}>
                  <span className="tm-caret">▾</span> Opțiuni avansate (planificare)
                </button>
                {advOpen && (
                  <div className="tm-adv">
                    {Object.entries(ADVANCED).map(([key, cfg]) => (
                      <label key={key} className="tm-field">
                        <span className="tm-fl">{cfg.label}</span>
                        <select value={sel[key] || cfg.opts[0][0]} onChange={(e) => setField({ [key]: e.target.value })}>
                          {cfg.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </label>
                    ))}
                    <div className="tm-prep"><Toggle on={sel.defaultPrepared} onChange={(v) => setField({ defaultPrepared: v })} label="Marchează „pregătit” implicit" hint="la asignare" /></div>
                  </div>
                )}

                {/* ștergere echipă */}
                <div className="tm-danger">
                  {confirmTeam === sel.id ? (
                    <span className="tm-cfm">
                      <span className="tm-cfx">Ștergi „{sel.name}"{sel.assignedCount > 0 ? ` + ${sel.assignedCount} asignări` : ""}?</span>
                      <button className="tm-yes" onClick={() => removeTeam(sel.id)}>Da, șterge</button>
                      <button className="tm-no" onClick={() => setConfirmTeam(null)}>Anulează</button>
                    </span>
                  ) : (
                    <button className="tm-delteam" onClick={() => setConfirmTeam(sel.id)}><Trash /> Șterge echipa</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .tm-err { background: rgba(248,81,73,.12); border: 1px solid rgba(248,81,73,.4); color: var(--danger); font-size: 12.5px; padding: 8px 11px; border-radius: 7px; margin-bottom: 12px; cursor: pointer; }
        .tm-load, .tm-none, .tm-empty { color: var(--text-faint); font-size: 13px; }
        .tm-load { padding: 28px 0; text-align: center; }
        .tm { display: grid; grid-template-columns: 240px 1fr; gap: 16px; min-height: 420px; }
        /* rail */
        .tm-rail { border-right: 1px solid var(--border); padding-right: 15px; display: flex; flex-direction: column; }
        .tm-rh, .tm-sh { display: flex; align-items: center; gap: 7px; color: var(--text-faint); font-size: 10.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 8px; }
        .tm-ct { background: var(--surface-2); color: var(--text-dim); border-radius: 20px; padding: 0 8px; font-size: 10.5px; font-weight: 600; letter-spacing: 0; }
        .tm-tlist { flex: 1; overflow: auto; display: flex; flex-direction: column; gap: 3px; min-height: 60px; }
        .tm-trow { display: flex; align-items: center; gap: 7px; padding: 8px 9px; border-radius: 7px; cursor: pointer; border: 1px solid transparent; transition: background .13s, border-color .13s; }
        .tm-trow:hover { background: var(--surface-2); }
        .tm-trow.on { background: rgba(47,129,247,.12); border-color: rgba(47,129,247,.4); }
        .tm-tn { flex: 1; color: var(--text); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tm-tmeta { color: var(--text-faint); font-size: 10.5px; flex: none; }
        .tm-empty { padding: 10px 2px; }
        .tm-add { display: flex; gap: 6px; margin-top: 10px; }
        .tm-add input { flex: 1; min-width: 0; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px; height: 32px; padding: 0 10px; color: var(--text); font-size: 12.5px; outline: none; }
        .tm-add input:focus { border-color: var(--primary); }
        .tm-add button { width: 32px; flex: none; background: var(--primary); border: 1px solid var(--primary); color: #fff; border-radius: 6px; font-size: 17px; line-height: 1; cursor: pointer; }
        .tm-add button:disabled { opacity: .45; cursor: default; }
        /* detail */
        .tm-detail { overflow: auto; display: flex; flex-direction: column; }
        .tm-none { padding: 40px 0; text-align: center; }
        .tm-name { background: transparent; border: none; border-bottom: 1px solid transparent; color: var(--text); font-size: 18px; font-weight: 600; padding: 2px 2px 6px; outline: none; margin-bottom: 14px; transition: border-color .13s; }
        .tm-name:hover { border-bottom-color: var(--border); }
        .tm-name:focus { border-bottom-color: var(--primary); }
        .tm-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; margin-bottom: 16px; align-items: start; }
        .tm-field { display: flex; flex-direction: column; gap: 5px; }
        .tm-fl { color: var(--text-faint); font-size: 10.5px; letter-spacing: .4px; text-transform: uppercase; }
        .tm-field select { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px; height: 34px; padding: 0 9px; color: var(--text); font-size: 13px; outline: none; cursor: pointer; }
        .tm-field select:focus { border-color: var(--primary); }
        .tm-flags { display: flex; flex-direction: column; gap: 1px; }
        .tm-sec { border-top: 1px solid var(--border); padding-top: 13px; margin-bottom: 4px; }
        .tm-plist { display: flex; flex-direction: column; gap: 3px; margin-bottom: 9px; }
        .tm-prow { display: flex; align-items: center; gap: 8px; padding: 3px 4px; border-radius: 7px; border: 1px solid transparent; }
        .tm-prow:hover { background: var(--surface-2); }
        .tm-pn { flex: 1; min-width: 0; background: transparent; border: 1px solid transparent; border-radius: 6px; height: 30px; padding: 0 8px; color: var(--text); font-size: 13px; outline: none; transition: border-color .12s, background .12s; }
        .tm-pn:hover { border-color: var(--border); }
        .tm-pn:focus { border-color: var(--primary); background: var(--surface); }
        .tm-pc { flex: none; background: var(--surface-3); color: var(--text-dim); border-radius: 20px; padding: 1px 8px; font-size: 10.5px; }
        .tm-del, .tm-delteam { background: transparent; border: none; color: var(--text-faint); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .tm-del { padding: 5px; border-radius: 6px; flex: none; }
        .tm-del:hover { color: var(--danger); background: rgba(248,81,73,.1); }
        .tm-grip { color: var(--text-faint); cursor: grab; display: inline-flex; flex: none; opacity: .55; }
        .tm-grip:active { cursor: grabbing; }
        .tm-prow:hover .tm-grip, .tm-trow:hover .tm-grip { opacity: 1; }
        /* confirmare inline */
        .tm-cfm { display: inline-flex; align-items: center; gap: 7px; animation: cfmIn .14s ease; }
        @keyframes cfmIn { from { opacity: 0; transform: translateX(6px); } to { opacity: 1; transform: none; } }
        .tm-cfx { color: var(--text-dim); font-size: 11.5px; }
        .tm-yes { background: var(--danger); border: 1px solid var(--danger); color: #fff; border-radius: 6px; padding: 4px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; }
        .tm-no { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; padding: 4px 10px; font-size: 11.5px; cursor: pointer; }
        /* avansat */
        .tm-advt { display: flex; align-items: center; gap: 7px; background: transparent; border: none; color: var(--text-dim); font-size: 12.5px; cursor: pointer; padding: 11px 0 4px; }
        .tm-advt:hover { color: var(--text); }
        .tm-caret { display: inline-block; transition: transform .14s; font-size: 10px; color: var(--text-faint); }
        .tm-advt.on .tm-caret { transform: rotate(180deg); }
        .tm-adv { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; padding: 10px 0 4px; animation: cfmIn .16s ease; }
        .tm-prep { grid-column: 1 / -1; }
        .tm-danger { border-top: 1px solid var(--border); margin-top: 14px; padding-top: 12px; }
        .tm-delteam { color: var(--danger); font-size: 12.5px; padding: 6px 0; }
        .tm-delteam:hover { opacity: .8; }
      `}</style>
    </Modal>
  );
}
