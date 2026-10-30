"use client";
/**
 * Editor pentru tipul „Tranziție" (punte între momente). 3 containere OPȚIONALE, adăugate cu „+":
 *  - Gamă     → text liber (ex. „C", „Dm"); apare ca badge pe rând + scris dedesubt pt. om.
 *  - Lumini   → una sau mai multe culori (swatch + etichetă); mai multe = tranziție de culoare.
 *  - Rugăciune → o persoană din Matrix-ul săptămânii (căutare); „Tranziție rugăciune: <nume>" cu avatar.
 * Totul se transpune în Rehearse + PDF. `value` = { key, lights:[{color,label}], prayer, prayerPersonId }.
 */
import { useState } from "react";
import PersonAvatar from "@/components/plans/PersonAvatar";

const SWATCHES = ["#e5534b", "#e2a03f", "#f0d94d", "#57b98a", "#2f81f7", "#9b6cf0", "#ff7ab6", "#ffffff"];

export default function TransitionEditor({ value = {}, week = [], canEdit = false, onChange }) {
  const key = value.key || "";
  const lights = value.lights || [];
  const prayer = value.prayer || null;

  // Containerele „active" = cele cu date SAU adăugate manual de user în sesiunea curentă.
  const [added, setAdded] = useState({ key: false, lights: false, prayer: false });
  const hasKey = key || added.key;
  const hasLights = lights.length || added.lights;
  const hasPrayer = prayer || added.prayer;

  const [prayerOpen, setPrayerOpen] = useState(false);
  const [q, setQ] = useState("");

  // Trimite întreaga stare (backend folosește dotted paths, deci nu se suprascriu între ele).
  const emit = (patch) => onChange({ key, lights, prayerPersonId: prayer ? prayer.id : null, ...patch });

  const setKey = (k) => emit({ key: k });
  const addLight = () => { setAdded((a) => ({ ...a, lights: true })); emit({ lights: [...lights, { color: SWATCHES[4], label: "" }] }); };
  const setLight = (i, next) => emit({ lights: lights.map((l, idx) => (idx === i ? { ...l, ...next } : l)) });
  const delLight = (i) => emit({ lights: lights.filter((_, idx) => idx !== i) });
  const pickPrayer = (p) => { emit({ prayerPersonId: p.personId }); setPrayerOpen(false); setQ(""); setAdded((a) => ({ ...a, prayer: true })); };
  const clearPrayer = () => { emit({ prayerPersonId: null }); setAdded((a) => ({ ...a, prayer: false })); };

  const pool = () => { const s = q.trim().toLowerCase(); return s ? week.filter((p) => p.name.toLowerCase().includes(s)) : week; };

  return (
    <div className="te">
      {/* ── Gamă ── */}
      {hasKey ? (
        <div className="tbox">
          <div className="tb-h"><span className="tb-ic">♪</span> Gamă</div>
          <input className="tb-key" value={key} disabled={!canEdit} onChange={(e) => setKey(e.target.value)}
            placeholder="ex. C, Dm, G→A" />
          <div className="tb-hint">Apare ca badge pe rând și scris dedesubt pentru echipă.</div>
        </div>
      ) : canEdit && <button className="te-add" onClick={() => setAdded((a) => ({ ...a, key: true }))}>+ Gamă</button>}

      {/* ── Lumini ── */}
      {hasLights ? (
        <div className="tbox">
          <div className="tb-h"><span className="tb-ic">💡</span> Lumini</div>
          {lights.map((l, i) => (
            <div key={i} className="light">
              <input type="color" className="l-sw" value={l.color || "#2f81f7"} disabled={!canEdit} onChange={(e) => setLight(i, { color: e.target.value })} />
              <input className="l-lbl" value={l.label || ""} disabled={!canEdit} onChange={(e) => setLight(i, { label: e.target.value })} placeholder={`Culoare ${i + 1} (etichetă opț.)`} />
              {canEdit && <button className="l-del" onClick={() => delLight(i)} title="Scoate culoarea">✕</button>}
            </div>
          ))}
          {canEdit && (
            <div className="l-sws">
              {SWATCHES.map((c) => <button key={c} className="l-pre" style={{ background: c }} title={c} onClick={() => { setAdded((a) => ({ ...a, lights: true })); emit({ lights: [...lights, { color: c, label: "" }] }); }} />)}
              <button className="l-add" onClick={addLight}>+ culoare</button>
            </div>
          )}
          {lights.length > 1 && <div className="tb-hint">Mai multe culori = tranziție de la una la alta.</div>}
        </div>
      ) : canEdit && <button className="te-add" onClick={addLight}>+ Lumini</button>}

      {/* ── Rugăciune ── */}
      {hasPrayer ? (
        <div className="tbox">
          <div className="tb-h"><span className="tb-ic">🙏</span> Rugăciune</div>
          {prayer ? (
            <div className="pr-row">
              <span className="pr-chip"><PersonAvatar person={prayer} size={22} /><span className="pr-nm">Tranziție rugăciune: {prayer.name}</span></span>
              {canEdit && <button className="pr-change" onClick={() => { setPrayerOpen(true); setQ(""); }} title="Schimbă">✎</button>}
              {canEdit && <button className="pr-del" onClick={clearPrayer} title="Scoate">✕</button>}
            </div>
          ) : canEdit && <button className="pr-pick" onClick={() => { setPrayerOpen(true); setQ(""); }}>Alege persoana…</button>}
        </div>
      ) : canEdit && <button className="te-add" onClick={() => { setAdded((a) => ({ ...a, prayer: true })); setPrayerOpen(true); }}>+ Rugăciune</button>}

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

      <style jsx>{`
        .te { position: relative; display: flex; flex-direction: column; gap: 8px; }
        .tbox { background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 12px; }
        .tb-h { display: flex; align-items: center; gap: 7px; color: var(--text); font-size: 12.5px; font-weight: 600; margin-bottom: 8px; }
        .tb-ic { font-size: 13px; }
        .tb-key { width: 100%; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); padding: 8px 10px; font-size: 14px; font-weight: 600; font-family: inherit; }
        .tb-key:focus { outline: none; border-color: var(--primary); }
        .tb-hint { color: var(--text-faint); font-size: 11px; margin-top: 6px; }
        .light { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .l-sw { width: 34px; height: 30px; padding: 0; border: 1px solid var(--border-strong); border-radius: 6px; background: transparent; cursor: pointer; flex: none; }
        .l-lbl { flex: 1; min-width: 0; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); padding: 7px 9px; font-size: 12.5px; font-family: inherit; }
        .l-lbl:focus { outline: none; border-color: var(--primary); }
        .l-del { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 12px; flex: none; }
        .l-del:hover { color: var(--danger); }
        .l-sws { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 4px; }
        .l-pre { width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border-strong); cursor: pointer; padding: 0; }
        .l-pre:hover { transform: scale(1.12); }
        .l-add { background: transparent; border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 7px; padding: 4px 10px; font-size: 11.5px; cursor: pointer; margin-left: 4px; }
        .l-add:hover { color: var(--primary); border-color: var(--primary); }
        .pr-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .pr-chip { display: inline-flex; align-items: center; gap: 7px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 16px; padding: 3px 10px 3px 4px; font-size: 12.5px; color: var(--text); }
        .pr-nm { min-width: 0; }
        .pr-change, .pr-del { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 12px; }
        .pr-change:hover { color: var(--text); } .pr-del:hover { color: var(--danger); }
        .pr-pick { background: transparent; border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 7px; padding: 6px 12px; font-size: 12.5px; cursor: pointer; }
        .pr-pick:hover { color: var(--primary); border-color: var(--primary); }
        .te-add { background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 8px; padding: 9px 12px; font-size: 12.5px; cursor: pointer; text-align: left; }
        .te-add:hover { color: var(--primary); border-color: var(--primary); }
        .te-back { position: fixed; inset: 0; z-index: 6; }
        .te-pop { position: absolute; z-index: 7; left: 0; right: 0; bottom: 0; transform: translateY(calc(100% + 6px)); background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; box-shadow: 0 14px 40px rgba(0,0,0,.5); padding: 8px; }
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
