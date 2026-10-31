"use client";
/**
 * Editor pentru tipul „Tranziție". Ordine: Tranziție (rugăciune/cuvânt) → Description → Gamă → Lumini.
 * Fiecare container e COLLAPSIBLE (click pe header) și se poate SCOATE cu „✕". Lumini = componenta partajată LightsEditor.
 * `value` = { kind, key, autoKey, keySource, lights:[{color,label}], prayer }; `onChange` emite { kind, key, autoKey, lights, prayerPersonId }.
 * Description e randat AICI (textarea propriu, stilizat local) ca să stea imediat sub „Tranziție".
 */
import { useState } from "react";
import PersonAvatar from "@/components/plans/PersonAvatar";
import { keyToRo } from "@/lib/keyName";
import LightsEditor from "./LightsEditor";

function Chevron({ open }) {
  return <svg className={`chev ${open ? "o" : ""}`} width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>;
}

export default function TransitionEditor({ value = {}, week = [], canEdit = false, onChange, desc = "", onDescChange, onDescBlur }) {
  const kind = value.kind || "";
  const key = value.key || "";
  const autoKey = !!value.autoKey;
  const keySource = value.keySource || "";
  const lights = value.lights || [];
  const prayer = value.prayer || null;

  const [added, setAdded] = useState({ key: false, lights: false });
  const [open, setOpen] = useState({ trans: false, key: false, lights: false }); // expand/collapse (collapsed by default pt. date existente)
  const hasKey = key || autoKey || added.key;
  const hasLights = lights.length || added.lights;

  const [prayerOpen, setPrayerOpen] = useState(false);
  const [q, setQ] = useState("");
  const [typeMenu, setTypeMenu] = useState(false);

  const emit = (patch) => onChange({ kind, key, autoKey, lights, prayerPersonId: prayer ? (prayer.id || prayer.personId) : null, ...patch });
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  // ── Tranziție (rugăciune / cuvânt) ──
  const chooseWord = () => { setTypeMenu(false); setPrayerOpen(false); setOpen((o) => ({ ...o, trans: true })); emit({ kind: "word", prayerPersonId: null }); };
  const choosePrayer = () => { setTypeMenu(false); setOpen((o) => ({ ...o, trans: true })); emit({ kind: "prayer" }); setPrayerOpen(true); setQ(""); };
  const pickPrayer = (p) => { setPrayerOpen(false); emit({ kind: "prayer", prayerPersonId: p.personId }); };
  const removeTrans = () => { setPrayerOpen(false); emit({ kind: "", prayerPersonId: null }); };

  // ── Gamă ──
  const setKey = (k) => emit({ key: k });
  const setAuto = (v) => emit({ autoKey: v });
  const removeKey = () => { setAdded((a) => ({ ...a, key: false })); setOpen((o) => ({ ...o, key: false })); emit({ key: "", autoKey: false }); };
  const addKeyBox = () => { setAdded((a) => ({ ...a, key: true })); setOpen((o) => ({ ...o, key: true })); };

  // ── Lumini ──
  const setLights = (next) => emit({ lights: next });
  const removeLights = () => { setAdded((a) => ({ ...a, lights: false })); setOpen((o) => ({ ...o, lights: false })); emit({ lights: [] }); };
  const addLightsBox = () => { setAdded((a) => ({ ...a, lights: true })); setOpen((o) => ({ ...o, lights: true })); };

  const pool = () => { const s = q.trim().toLowerCase(); return s ? week.filter((p) => p.name.toLowerCase().includes(s)) : week; };

  return (
    <div className="te">
      {/* ── Tranziție (rugăciune / cuvânt) ── */}
      {kind ? (
        <section className="tbox">
          <header className="tb-head" onClick={() => toggle("trans")}>
            <span className="tb-ic">🔀</span><span className="tb-ttl">Tranziție</span>
            <span className="tb-sum">{kind === "word" ? "prin cuvânt" : (prayer ? prayer.name : "alege persoana")}</span>
            {canEdit && <button className="tb-x" onClick={(e) => { e.stopPropagation(); removeTrans(); }} title="Scoate">✕</button>}
            <Chevron open={open.trans} />
          </header>
          {open.trans && (
            <div className="tb-body">
              {kind === "word" ? (
                <span className="pr-chip pr-word">Tranziție prin cuvânt</span>
              ) : prayer ? (
                <div className="pr-row">
                  <span className="pr-chip"><PersonAvatar person={prayer} size={22} /><span className="pr-nm">Tranziție rugăciune: {prayer.name}</span></span>
                  {canEdit && <button className="pr-change" onClick={() => { setPrayerOpen(true); setQ(""); }} title="Schimbă persoana">✎</button>}
                </div>
              ) : canEdit && <button className="pr-pick" onClick={() => { setPrayerOpen(true); setQ(""); }}>Alege persoana…</button>}
            </div>
          )}
        </section>
      ) : canEdit && (
        <div className="te-addwrap">
          <button className="te-add" onClick={() => setTypeMenu((v) => !v)}>+ Tranziție</button>
          {typeMenu && (<>
            <div className="te-back" onClick={() => setTypeMenu(false)} />
            <div className="type-menu">
              <button className="type-it" onClick={choosePrayer}><span className="ti-l">Tranziție cu rugăciune</span><span className="ti-d">o persoană se roagă</span></button>
              <button className="type-it" onClick={chooseWord}><span className="ti-l">Tranziție verbală</span><span className="ti-d">punte prin cuvânt</span></button>
            </div>
          </>)}
        </div>
      )}

      {prayerOpen && canEdit && (
        <>
          <div className="te-back" onClick={() => setPrayerOpen(false)} />
          <div className="te-pop">
            <input className="te-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută persoană din Matrix…" />
            <div className="te-list">
              {pool().map((p) => (
                <button key={p.personId} className="te-item" onClick={() => pickPrayer(p)}>
                  <PersonAvatar person={p} size={22} /><span className="te-inm">{p.name}</span>
                </button>
              ))}
              {!pool().length && <div className="te-empty">Nimeni programat pe plan.</div>}
            </div>
          </div>
        </>
      )}

      {/* ── Description (imediat sub Tranziție) ── */}
      <div className="te-desc-wrap">
        <div className="te-dl">Description</div>
        <textarea className="te-desc" value={desc} disabled={!canEdit} onChange={(e) => onDescChange?.(e.target.value)} onBlur={onDescBlur}
          placeholder={"Note libere (versete, cue-uri)…"} rows={3} />
      </div>

      {/* ── Gamă ── */}
      {hasKey ? (
        <section className="tbox">
          <header className="tb-head" onClick={() => toggle("key")}>
            <span className="tb-ic">♪</span><span className="tb-ttl">Gamă</span>
            <span className="tb-sum">{key ? keyToRo(key) : (autoKey ? "auto" : "")}</span>
            {canEdit && <button className="tb-x" onClick={(e) => { e.stopPropagation(); removeKey(); }} title="Scoate">✕</button>}
            <Chevron open={open.key} />
          </header>
          {open.key && (
            <div className="tb-body">
              {canEdit && (
                <label className="tb-auto">
                  <input type="checkbox" checked={autoKey} onChange={(e) => setAuto(e.target.checked)} />
                  <span>Mapează la următorul cântec <em>— ia automat gama cântecului care urmează în Order</em></span>
                </label>
              )}
              {autoKey ? (
                <div className="tb-autoval">
                  {key ? (<><span className="tb-sym">{key}</span><span className="tb-ro">{keyToRo(key)}</span>{keySource && <span className="tb-src">din „{keySource}"</span>}</>)
                    : <span className="tb-none">Niciun cântec după tranziție (încă).</span>}
                </div>
              ) : (
                <>
                  <input className="tb-key" value={key} disabled={!canEdit} onChange={(e) => setKey(e.target.value)} placeholder="ex. C, Dm, G→A" />
                  {key && <div className="tb-roline">= <b>{keyToRo(key)}</b></div>}
                </>
              )}
              <div className="tb-hint">Apare ca badge pe rând și scris dedesubt pentru echipă.</div>
            </div>
          )}
        </section>
      ) : canEdit && <button className="te-add" onClick={addKeyBox}>+ Gamă</button>}

      {/* ── Lumini ── */}
      {hasLights ? (
        <section className="tbox">
          <header className="tb-head" onClick={() => toggle("lights")}>
            <span className="tb-ic">💡</span><span className="tb-ttl">Lumini</span>
            <span className="tb-dots">{lights.slice(0, 6).map((l, i) => <span key={i} className="tb-dot" style={{ background: l.color || "#888" }} />)}</span>
            {canEdit && <button className="tb-x" onClick={(e) => { e.stopPropagation(); removeLights(); }} title="Scoate">✕</button>}
            <Chevron open={open.lights} />
          </header>
          {open.lights && (
            <div className="tb-body">
              <LightsEditor value={lights} canEdit={canEdit} onChange={setLights} />
            </div>
          )}
        </section>
      ) : canEdit && <button className="te-add" onClick={addLightsBox}>+ Lumini</button>}

      <style jsx>{`
        .te { position: relative; display: flex; flex-direction: column; gap: 12px; }
        .tbox { background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .tb-head { display: flex; align-items: center; gap: 8px; padding: 11px 12px; cursor: pointer; user-select: none; }
        .tb-head:hover { background: var(--surface-3); }
        .tb-ic { font-size: 14px; display: inline-flex; align-items: center; }
        .tb-ttl { color: var(--text); font-size: 12.5px; font-weight: 600; }
        .tb-sum { color: var(--text-faint); font-size: 11.5px; margin-left: 2px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .tb-dots { display: inline-flex; gap: 3px; flex: 1; }
        .tb-dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border-strong); }
        .tb-x { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 12px; padding: 2px 4px; border-radius: 4px; flex: none; }
        .tb-x:hover { color: var(--danger); background: var(--surface); }
        .chev { color: var(--text-faint); transition: transform .14s ease; flex: none; }
        .chev.o { transform: rotate(180deg); }
        .tb-body { padding: 2px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
        .tb-key { width: 100%; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); padding: 8px 10px; font-size: 14px; font-weight: 600; font-family: inherit; }
        .tb-key:focus { outline: none; border-color: var(--primary); }
        .tb-hint { color: var(--text-faint); font-size: 11px; }
        .tb-auto { display: flex; align-items: flex-start; gap: 8px; color: var(--text-dim); font-size: 12.5px; cursor: pointer; }
        .tb-auto input { margin-top: 2px; accent-color: var(--primary); }
        .tb-auto em { color: var(--text-faint); font-style: normal; font-size: 11.5px; }
        .tb-autoval { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; background: var(--surface-3); border: 1px dashed var(--border-strong); border-radius: 7px; padding: 8px 10px; }
        .tb-sym { color: #fff; background: #6fa02e; font-size: 13px; font-weight: 700; border-radius: 999px; padding: 1px 9px; }
        .tb-ro { color: var(--text); font-size: 13px; font-weight: 600; }
        .tb-src { color: var(--text-faint); font-size: 11.5px; }
        .tb-none { color: var(--text-faint); font-size: 12px; }
        .tb-roline { color: var(--text-dim); font-size: 12px; }
        .tb-roline b { color: var(--text); }
        /* Description propriu */
        .te-desc-wrap { display: flex; flex-direction: column; gap: 6px; }
        .te-dl { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; }
        .te-desc { width: 100%; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 9px 11px; font-size: 13px; font-family: inherit; line-height: 1.5; resize: vertical; }
        .te-desc:focus { outline: none; border-color: var(--primary); }
        /* Tranziție (rugăciune/cuvânt) body */
        .pr-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .pr-chip { display: inline-flex; align-items: center; gap: 7px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 16px; padding: 3px 10px 3px 4px; font-size: 12.5px; color: var(--text); }
        .pr-chip.pr-word { padding: 4px 11px; }
        .pr-nm { min-width: 0; }
        .pr-change { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 12px; }
        .pr-change:hover { color: var(--text); }
        .pr-pick { background: transparent; border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 7px; padding: 6px 12px; font-size: 12.5px; cursor: pointer; }
        .pr-pick:hover { color: var(--primary); border-color: var(--primary); }
        .te-addwrap { position: relative; }
        .te-add { width: 100%; background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 8px; padding: 10px 12px; font-size: 12.5px; cursor: pointer; text-align: left; }
        .te-add:hover { color: var(--primary); border-color: var(--primary); }
        .type-menu { position: absolute; z-index: 8; top: 42px; left: 0; min-width: 236px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; box-shadow: 0 14px 40px rgba(0,0,0,.45); padding: 6px; display: flex; flex-direction: column; gap: 2px; }
        .type-it { display: flex; flex-direction: column; gap: 2px; text-align: left; background: transparent; border: none; color: var(--text); padding: 8px 10px; border-radius: 7px; cursor: pointer; }
        .type-it:hover { background: var(--surface-2); }
        .ti-l { font-size: 13px; font-weight: 600; } .ti-d { color: var(--text-faint); font-size: 11px; }
        .te-back { position: fixed; inset: 0; z-index: 6; }
        .te-pop { position: absolute; z-index: 7; left: 0; right: 0; top: 0; transform: translateY(44px); background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; box-shadow: 0 14px 40px rgba(0,0,0,.5); padding: 8px; }
        .te-search { width: 100%; height: 34px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); font-size: 12.5px; padding: 0 10px; outline: none; margin-bottom: 6px; }
        .te-search:focus { border-color: var(--primary); }
        .te-list { max-height: 240px; overflow: auto; display: flex; flex-direction: column; gap: 1px; }
        .te-item { display: flex; align-items: center; gap: 9px; background: transparent; border: none; color: var(--text); font-size: 13px; padding: 6px 8px; border-radius: 7px; cursor: pointer; text-align: left; }
        .te-item:hover { background: var(--surface-2); }
        .te-inm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .te-empty { color: var(--text-faint); font-size: 12px; padding: 8px; }
      `}</style>
    </div>
  );
}
