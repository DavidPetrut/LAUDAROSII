"use client";
/**
 * Editor de LUMINI — partajat între tipul „Tranziție" și „+ Lumini" de pe orice item.
 *  - toggle RGBA/HEX (default RGBA); fiecare culoare are swatch + valoarea editabilă + „✕" (scoate-o).
 *  - aranjamente salvate/reutilizabile (pc_lightArrangements): dropdown + „Salvează ca aranjament".
 *  - timing OPȚIONAL (before/after) — informativ: when "after"(default) lumina apare sub item; "before" = row vizual deasupra.
 * `value` = [{color,label}]; `onChange(lights)`. Timing prin `timing`/`onTiming` + `showTiming`.
 */
import { useEffect, useState } from "react";
import { lightArrangementsApi } from "@/lib/api/client";

const SWATCHES = ["#e5534b", "#e2a03f", "#f0d94d", "#57b98a", "#2f81f7", "#9b6cf0", "#ff7ab6", "#ffffff"];

// Culori: parse + conversie HEX ⇄ RGBA (suportă #rgb, #rrggbb, #rrggbbaa, rgb(), rgba()).
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

export default function LightsEditor({ value = [], canEdit = false, onChange, timing, onTiming, showTiming = false }) {
  const lights = value || [];
  const [fmt, setFmt] = useState("rgba");
  const [arrs, setArrs] = useState([]);
  const [arrOpen, setArrOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  useEffect(() => { lightArrangementsApi.list().then((r) => setArrs(r.arrangements || [])).catch(() => {}); }, []);

  const addLight = (color) => onChange([...lights, { color: color || fmtColor(SWATCHES[4], fmt), label: "" }]);
  const setLight = (i, nextColor) => onChange(lights.map((l, idx) => (idx === i ? { ...l, color: nextColor } : l)));
  const delLight = (i) => onChange(lights.filter((_, idx) => idx !== i));
  const applyArrangement = (a) => { setArrOpen(false); onChange((a.colors || []).map((c) => ({ color: c, label: "" }))); };

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
    <div className="le">
      <div className="le-top">
        {showTiming && (
          <div className="when">
            <span className="when-l">Când:</span>
            <span className="when-seg">
              <button className={`when-b ${timing === "before" ? "on" : ""}`} onClick={() => onTiming?.("before")} disabled={!canEdit}>Before</button>
              <button className={`when-b ${timing !== "before" ? "on" : ""}`} onClick={() => onTiming?.("after")} disabled={!canEdit}>After</button>
            </span>
          </div>
        )}
        <span className="fmt-seg">
          <button className={`fmt-b ${fmt === "rgba" ? "on" : ""}`} onClick={() => setFmt("rgba")}>RGBA</button>
          <button className={`fmt-b ${fmt === "hex" ? "on" : ""}`} onClick={() => setFmt("hex")}>HEX</button>
        </span>
      </div>

      {/* Aranjamente */}
      <div className="arr-row">
        <div className="arr-sel">
          <button className="arr-btn" onClick={() => setArrOpen((v) => !v)}>
            <span className="arr-lbl">{arrs.length ? "Aranjament…" : "Niciun aranjament salvat"}</span>
            <span className="arr-caret">▾</span>
          </button>
          {arrOpen && (<>
            <div className="le-back" onClick={() => setArrOpen(false)} />
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

      <style jsx>{`
        .le { position: relative; display: flex; flex-direction: column; gap: 9px; }
        .le-back { position: fixed; inset: 0; z-index: 6; }
        .le-top { display: flex; align-items: center; gap: 10px; }
        .when { display: flex; align-items: center; gap: 7px; }
        .when-l { color: var(--text-faint); font-size: 11px; }
        .when-seg, .fmt-seg { display: inline-flex; border: 1px solid var(--border-strong); border-radius: 7px; overflow: hidden; }
        .fmt-seg { margin-left: auto; }
        .when-b, .fmt-b { background: transparent; border: none; color: var(--text-faint); font-size: 10.5px; font-weight: 700; letter-spacing: .3px; padding: 3px 10px; cursor: pointer; }
        .when-b:hover, .fmt-b:hover { color: var(--text); }
        .when-b.on, .fmt-b.on { background: var(--primary); color: #fff; }
        .arr-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
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
        .light { display: flex; align-items: center; gap: 8px; }
        .l-sw { position: relative; width: 34px; height: 30px; border: 1px solid var(--border-strong); border-radius: 6px; cursor: pointer; flex: none; overflow: hidden; }
        .l-sw input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
        .l-val { flex: 1; min-width: 0; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); padding: 7px 9px; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .2px; }
        .l-val:focus { outline: none; border-color: var(--primary); }
        .l-del { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 12px; flex: none; }
        .l-del:hover { color: var(--danger); }
        .l-sws { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 2px; }
        .l-pre { width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border-strong); cursor: pointer; padding: 0; }
        .l-pre:hover { transform: scale(1.12); }
        .l-add { background: transparent; border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 7px; padding: 4px 10px; font-size: 11.5px; cursor: pointer; margin-left: 4px; }
        .l-add:hover { color: var(--primary); border-color: var(--primary); }
      `}</style>
    </div>
  );
}
