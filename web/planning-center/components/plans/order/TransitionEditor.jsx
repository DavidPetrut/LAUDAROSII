"use client";
/**
 * Editor pentru tipul „Tranziție" (punte între momente). Ordine: Tranziție (rugăciune/cuvânt) → Description → Gamă → Lumini.
 *  - Tranziție → rugăciune (persoană din Matrix) SAU „prin cuvânt" (verbal). Prima, deasupra lui gamă/lumini.
 *  - Gamă      → text liber (ex. „C", „Dm"); apare ca badge pe rând + convertit în română. Poate fi auto (din următorul cântec).
 *  - Lumini    → una sau mai multe culori (swatch + valoare RGBA/HEX editabilă) + aranjamente salvate/reutilizabile.
 * `value` = { kind, key, autoKey, keySource, lights:[{color,label}], prayer }.
 * `onChange` emite { kind, key, autoKey, lights, prayerPersonId }.
 */
import { useEffect, useState } from "react";
import PersonAvatar from "@/components/plans/PersonAvatar";
import { keyToRo } from "@/lib/keyName";
import { lightArrangementsApi } from "@/lib/api/client";

const SWATCHES = ["#e5534b", "#e2a03f", "#f0d94d", "#57b98a", "#2f81f7", "#9b6cf0", "#ff7ab6", "#ffffff"];

// ── Culori: parse + conversie HEX ⇄ RGBA (suportă #rgb, #rrggbb, #rrggbbaa, rgb(), rgba()) ──
function parseColor(s) {
  s = String(s || "").trim(); let m;
  if ((m = s.match(/^#([0-9a-f]{3})$/i))) { const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16)); return { r, g, b, a: 1 }; }
  if ((m = s.match(/^#([0-9a-f]{6})$/i))) { const n = m[1]; return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16), a: 1 }; }
  if ((m = s.match(/^#([0-9a-f]{8})$/i))) { const n = m[1]; return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16), a: Math.round(parseInt(n.slice(6, 8), 16) / 255 * 100) / 100 }; }
  if ((m = s.match(/^rgba?\(([^)]+)\)$/i))) { const p = m[1].split(",").map((x) => x.trim()); return { r: +p[0] || 0, g: +p[1] || 0, b: +p[2] || 0, a: p[3] !== undefined ? (+p[3] || 0) : 1 }; }
  return null;
}
const h2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
const toHex = (c) => { const base = "#" + h2(c.r) + h2(c.g) + h2(c.b); return c.a != null && c.a < 1 ? base + h2(Math.round(c.a * 255)) : base; };
const toRgba = (c) => { const a = c.a != null ? c.a : 1; return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${a})`; };
const toHex6 = (s) => { const c = parseColor(s); return c ? "#" + h2(c.r) + h2(c.g) + h2(c.b) : "#2f81f7"; };
const fmtColor = (s, mode) => { const c = parseColor(s); if (!c) return s; return mode === "hex" ? toHex(c) : toRgba(c); };

// Iconiță lumini (bec) — SVG curat, înlocuiește emoji-ul.
function BulbIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3z" />
    </svg>
  );
}

export default function TransitionEditor({ value = {}, week = [], canEdit = false, onChange, descriptionSlot = null }) {
  const kind = value.kind || "";
  const key = value.key || "";
  const autoKey = !!value.autoKey;
  const keySource = value.keySource || "";
  const lights = value.lights || [];
  const prayer = value.prayer || null;

  // Containerele „gamă/lumini" active = cele cu date SAU adăugate manual în sesiune.
  const [added, setAdded] = useState({ key: false, lights: false });
  const hasKey = key || autoKey || added.key;
  const hasLights = lights.length || added.lights;

  const [prayerOpen, setPrayerOpen] = useState(false);
  const [q, setQ] = useState("");
  const [typeMenu, setTypeMenu] = useState(false); // meniul „+ Tranziție"

  // Lumini: format afișat (RGBA default / HEX) + aranjamente salvate.
  const [fmt, setFmt] = useState("rgba");
  const [arrs, setArrs] = useState([]);
  const [arrOpen, setArrOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  useEffect(() => { lightArrangementsApi.list().then((r) => setArrs(r.arrangements || [])).catch(() => {}); }, []);

  // Trimite întreaga stare (backend folosește dotted paths, deci nu se suprascriu între ele).
  const emit = (patch) => onChange({ kind, key, autoKey, lights, prayerPersonId: prayer ? (prayer.id || prayer.personId) : null, ...patch });

  const setKey = (k) => emit({ key: k });
  const setAuto = (v) => emit({ autoKey: v });
  const addLight = (color) => { setAdded((a) => ({ ...a, lights: true })); emit({ lights: [...lights, { color: color || SWATCHES[4], label: "" }] }); };
  const setLight = (i, nextColor) => emit({ lights: lights.map((l, idx) => (idx === i ? { ...l, color: nextColor } : l)) });
  const delLight = (i) => emit({ lights: lights.filter((_, idx) => idx !== i) });

  // ── Tranziție (rugăciune / cuvânt) ──
  const chooseWord = () => { setTypeMenu(false); setPrayerOpen(false); emit({ kind: "word", prayerPersonId: null }); };
  const choosePrayer = () => { setTypeMenu(false); emit({ kind: "prayer" }); setPrayerOpen(true); setQ(""); };
  const pickPrayer = (p) => { setPrayerOpen(false); emit({ kind: "prayer", prayerPersonId: p.personId }); };
  const clearType = () => { setPrayerOpen(false); emit({ kind: "", prayerPersonId: null }); };

  const pool = () => { const s = q.trim().toLowerCase(); return s ? week.filter((p) => p.name.toLowerCase().includes(s)) : week; };

  // ── Aranjamente lumini ──
  const applyArrangement = (a) => { setArrOpen(false); setAdded((x) => ({ ...x, lights: true })); emit({ lights: (a.colors || []).map((c) => ({ color: c, label: "" })) }); };
  async function saveArrangement() {
    const name = saveName.trim(); if (!name) return;
    const colors = lights.map((l) => l.color).filter(Boolean);
    if (!colors.length) return;
    try { const r = await lightArrangementsApi.create({ name, colors }); setArrs((prev) => [...prev, { id: r.id, name: r.name, colors: r.colors }].sort((a, b) => a.name.localeCompare(b.name))); setSaveOpen(false); setSaveName(""); }
    catch (e) { /* silent */ }
  }
  async function delArrangement(id) {
    try { await lightArrangementsApi.remove(id); setArrs((prev) => prev.filter((a) => String(a.id) !== String(id))); }
    catch (e) { /* silent */ }
  }

  return (
    <div className="te">
      {/* ── Tranziție (rugăciune / cuvânt) — prima, deasupra lui gamă/lumini ── */}
      {kind ? (
        <div className="tbox">
          <div className="tb-h"><span className="tb-ic">🔀</span> Tranziție</div>
          {kind === "word" ? (
            <div className="pr-row">
              <span className="pr-chip pr-word">Tranziție prin cuvânt</span>
              {canEdit && <button className="pr-change" onClick={() => setTypeMenu(true)} title="Schimbă">✎</button>}
              {canEdit && <button className="pr-del" onClick={clearType} title="Scoate">✕</button>}
            </div>
          ) : prayer ? (
            <div className="pr-row">
              <span className="pr-chip"><PersonAvatar person={prayer} size={22} /><span className="pr-nm">Tranziție rugăciune: {prayer.name}</span></span>
              {canEdit && <button className="pr-change" onClick={() => { setPrayerOpen(true); setQ(""); }} title="Schimbă persoana">✎</button>}
              {canEdit && <button className="pr-del" onClick={clearType} title="Scoate">✕</button>}
            </div>
          ) : canEdit && (
            <div className="pr-row">
              <button className="pr-pick" onClick={() => { setPrayerOpen(true); setQ(""); }}>Alege persoana…</button>
              <button className="pr-del" onClick={clearType} title="Scoate">✕</button>
            </div>
          )}
        </div>
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
      {descriptionSlot}

      {/* ── Gamă ── */}
      {hasKey ? (
        <div className="tbox">
          <div className="tb-h"><span className="tb-ic">♪</span> Gamă</div>
          {canEdit && (
            <label className="tb-auto">
              <input type="checkbox" checked={autoKey} onChange={(e) => setAuto(e.target.checked)} />
              <span>Mapează la următorul cântec <em>— ia automat gama cântecului care urmează în Order</em></span>
            </label>
          )}
          {autoKey ? (
            <div className="tb-autoval">
              {key ? (
                <><span className="tb-sym">{key}</span><span className="tb-ro">{keyToRo(key)}</span>{keySource && <span className="tb-src">din „{keySource}"</span>}</>
              ) : <span className="tb-none">Niciun cântec după tranziție (încă).</span>}
            </div>
          ) : (
            <>
              <input className="tb-key" value={key} disabled={!canEdit} onChange={(e) => setKey(e.target.value)} placeholder="ex. C, Dm, G→A" />
              {key && <div className="tb-roline">= <b>{keyToRo(key)}</b></div>}
            </>
          )}
          <div className="tb-hint">Apare ca badge pe rând și scris dedesubt pentru echipă.</div>
        </div>
      ) : canEdit && <button className="te-add" onClick={() => setAdded((a) => ({ ...a, key: true }))}>+ Gamă</button>}

      {/* ── Lumini ── */}
      {hasLights ? (
        <div className="tbox">
          <div className="tb-h lh">
            <span className="tb-ic"><BulbIcon /></span> Lumini
            <span className="fmt-seg">
              <button className={`fmt-b ${fmt === "rgba" ? "on" : ""}`} onClick={() => setFmt("rgba")}>RGBA</button>
              <button className={`fmt-b ${fmt === "hex" ? "on" : ""}`} onClick={() => setFmt("hex")}>HEX</button>
            </span>
          </div>

          {/* Aranjamente salvate */}
          <div className="arr-row">
            <div className="arr-sel">
              <button className="arr-btn" onClick={() => setArrOpen((v) => !v)}>
                <span className="arr-lbl">{arrs.length ? "Aranjament…" : "Niciun aranjament salvat"}</span>
                <span className="arr-caret">▾</span>
              </button>
              {arrOpen && (<>
                <div className="te-back" onClick={() => setArrOpen(false)} />
                <div className="arr-menu">
                  {arrs.map((a) => (
                    <div key={a.id} className="arr-it">
                      <button className="arr-apply" onClick={() => applyArrangement(a)}>
                        <span className="arr-name">{a.name}</span>
                        <span className="arr-dots">{(a.colors || []).map((c, i) => <span key={i} className="arr-dot" style={{ background: c }} />)}</span>
                      </button>
                      {canEdit && <button className="arr-del" onClick={() => delArrangement(a.id)} title="Șterge aranjamentul">✕</button>}
                    </div>
                  ))}
                  {!arrs.length && <div className="arr-none">Salvează unul din culorile de jos.</div>}
                </div>
              </>)}
            </div>
            {canEdit && lights.length > 0 && (
              saveOpen ? (
                <div className="arr-save">
                  <input className="arr-in" autoFocus value={saveName} onChange={(e) => setSaveName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveArrangement()} placeholder="Nume aranjament" />
                  <button className="arr-sv" onClick={saveArrangement}>✓</button>
                  <button className="arr-cx" onClick={() => { setSaveOpen(false); setSaveName(""); }}>✕</button>
                </div>
              ) : <button className="arr-saveb" onClick={() => { setSaveName(""); setSaveOpen(true); }}>Salvează ca aranjament</button>
            )}
          </div>

          {lights.map((l, i) => (
            <div key={i} className="light">
              <label className="l-sw" style={{ background: l.color || "#2f81f7" }}>
                <input type="color" value={toHex6(l.color)} disabled={!canEdit} onChange={(e) => setLight(i, fmtColor(e.target.value, fmt))} />
              </label>
              <input className="l-val" value={fmtColor(l.color || "", fmt)} disabled={!canEdit} onChange={(e) => setLight(i, e.target.value)}
                onBlur={(e) => setLight(i, fmtColor(e.target.value, fmt))} placeholder={fmt === "hex" ? "#RRGGBB" : "rgba(r, g, b, a)"} spellCheck={false} />
              {canEdit && <button className="l-del" onClick={() => delLight(i)} title="Scoate culoarea">✕</button>}
            </div>
          ))}
          {canEdit && (
            <div className="l-sws">
              {SWATCHES.map((c) => <button key={c} className="l-pre" style={{ background: c }} title={c} onClick={() => addLight(fmtColor(c, fmt))} />)}
              <button className="l-add" onClick={() => addLight()}>+ culoare</button>
            </div>
          )}
        </div>
      ) : canEdit && <button className="te-add" onClick={() => setAdded((a) => ({ ...a, lights: true }))}>+ Lumini</button>}

      <style jsx>{`
        .te { position: relative; display: flex; flex-direction: column; gap: 8px; }
        .tbox { background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 12px; }
        .tb-h { display: flex; align-items: center; gap: 7px; color: var(--text); font-size: 12.5px; font-weight: 600; margin-bottom: 8px; }
        .tb-h.lh { justify-content: flex-start; }
        .tb-ic { font-size: 13px; display: inline-flex; align-items: center; }
        .tb-key { width: 100%; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); padding: 8px 10px; font-size: 14px; font-weight: 600; font-family: inherit; }
        .tb-key:focus { outline: none; border-color: var(--primary); }
        .tb-hint { color: var(--text-faint); font-size: 11px; margin-top: 6px; }
        .tb-auto { display: flex; align-items: flex-start; gap: 8px; color: var(--text-dim); font-size: 12.5px; cursor: pointer; margin-bottom: 9px; }
        .tb-auto input { margin-top: 2px; accent-color: var(--primary); }
        .tb-auto em { color: var(--text-faint); font-style: normal; font-size: 11.5px; }
        .tb-autoval { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; background: var(--surface-3); border: 1px dashed var(--border-strong); border-radius: 7px; padding: 8px 10px; }
        .tb-sym { color: #fff; background: #6fa02e; font-size: 13px; font-weight: 700; border-radius: 999px; padding: 1px 9px; }
        .tb-ro { color: var(--text); font-size: 13px; font-weight: 600; }
        .tb-src { color: var(--text-faint); font-size: 11.5px; }
        .tb-none { color: var(--text-faint); font-size: 12px; }
        .tb-roline { color: var(--text-dim); font-size: 12px; margin-top: 6px; }
        .tb-roline b { color: var(--text); }
        /* Lumini: toggle format RGBA/HEX */
        .fmt-seg { margin-left: auto; display: inline-flex; border: 1px solid var(--border-strong); border-radius: 7px; overflow: hidden; }
        .fmt-b { background: transparent; border: none; color: var(--text-faint); font-size: 10.5px; font-weight: 700; letter-spacing: .3px; padding: 3px 9px; cursor: pointer; }
        .fmt-b:hover { color: var(--text); }
        .fmt-b.on { background: var(--primary); color: #fff; }
        /* Aranjamente */
        .arr-row { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; flex-wrap: wrap; }
        .arr-sel { position: relative; flex: 1; min-width: 150px; }
        .arr-btn { width: 100%; display: flex; align-items: center; gap: 8px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text-dim); padding: 7px 10px; font-size: 12px; cursor: pointer; }
        .arr-lbl { flex: 1; text-align: left; }
        .arr-caret { color: var(--text-faint); }
        .arr-menu { position: absolute; z-index: 8; top: 36px; left: 0; right: 0; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 9px; box-shadow: 0 12px 34px rgba(0,0,0,.45); padding: 6px; max-height: 220px; overflow: auto; }
        .arr-it { display: flex; align-items: center; gap: 4px; }
        .arr-apply { flex: 1; display: flex; align-items: center; gap: 8px; background: transparent; border: none; color: var(--text); padding: 7px 8px; border-radius: 6px; cursor: pointer; }
        .arr-apply:hover { background: var(--surface-2); }
        .arr-name { flex: 1; text-align: left; font-size: 12.5px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .arr-dots { display: inline-flex; gap: 3px; flex: none; }
        .arr-dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border-strong); }
        .arr-del { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 11px; }
        .arr-del:hover { color: var(--danger); }
        .arr-none { color: var(--text-faint); font-size: 12px; padding: 8px; }
        .arr-saveb { background: transparent; border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 7px; padding: 7px 11px; font-size: 11.5px; cursor: pointer; flex: none; }
        .arr-saveb:hover { color: var(--primary); border-color: var(--primary); }
        .arr-save { display: flex; align-items: center; gap: 5px; }
        .arr-in { width: 130px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); font-size: 12px; padding: 6px 9px; outline: none; }
        .arr-in:focus { border-color: var(--primary); }
        .arr-sv, .arr-cx { background: transparent; border: 1px solid var(--border-strong); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; font-size: 12px; }
        .arr-sv { color: var(--product); } .arr-cx { color: var(--text-faint); }
        .light { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .l-sw { position: relative; width: 34px; height: 30px; border: 1px solid var(--border-strong); border-radius: 6px; cursor: pointer; flex: none; overflow: hidden; }
        .l-sw input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
        .l-val { flex: 1; min-width: 0; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); padding: 7px 9px; font-size: 12px; font-family: var(--mono, ui-monospace, monospace); letter-spacing: .2px; }
        .l-val:focus { outline: none; border-color: var(--primary); }
        .l-del { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 12px; flex: none; }
        .l-del:hover { color: var(--danger); }
        .l-sws { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 4px; }
        .l-pre { width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border-strong); cursor: pointer; padding: 0; }
        .l-pre:hover { transform: scale(1.12); }
        .l-add { background: transparent; border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 7px; padding: 4px 10px; font-size: 11.5px; cursor: pointer; margin-left: 4px; }
        .l-add:hover { color: var(--primary); border-color: var(--primary); }
        /* Tranziție (rugăciune/cuvânt) */
        .pr-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .pr-chip { display: inline-flex; align-items: center; gap: 7px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 16px; padding: 3px 10px 3px 4px; font-size: 12.5px; color: var(--text); }
        .pr-chip.pr-word { padding: 4px 11px; }
        .pr-nm { min-width: 0; }
        .pr-change, .pr-del { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 12px; }
        .pr-change:hover { color: var(--text); } .pr-del:hover { color: var(--danger); }
        .pr-pick { background: transparent; border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 7px; padding: 6px 12px; font-size: 12.5px; cursor: pointer; }
        .pr-pick:hover { color: var(--primary); border-color: var(--primary); }
        .te-addwrap { position: relative; }
        .te-add { width: 100%; background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 8px; padding: 9px 12px; font-size: 12.5px; cursor: pointer; text-align: left; }
        .te-add:hover { color: var(--primary); border-color: var(--primary); }
        .type-menu { position: absolute; z-index: 8; top: 40px; left: 0; min-width: 236px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; box-shadow: 0 14px 40px rgba(0,0,0,.45); padding: 6px; display: flex; flex-direction: column; gap: 2px; }
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
