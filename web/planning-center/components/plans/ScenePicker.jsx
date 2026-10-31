"use client";
/**
 * ScenePicker — „Lumini propuse": alegi o SCENĂ (din pc_lightScenes) + fixtures (Par/LED/Tobe/Laterale/Coroană)
 * + când (înainte/după, default înainte). Folosit în Order (ItemDrawer) — același sistem ca în Rehearse.
 * Biblioteca de scene e COMUNĂ (productionScenesApi), dar SELECȚIA e separată per context (fără sync).
 * `onChange({ sceneId, fixtures })`; timing prin `timing`/`onTiming` (când `showTiming`).
 */
import { useEffect, useState } from "react";
import { productionScenesApi } from "@/lib/api/client";

const FIXTURE_ORDER = ["par", "led", "tobe", "laterale", "coroana"];
const FIXTURE_LBL = { par: "Par", led: "LED", tobe: "Tobe", laterale: "Laterale", coroana: "Coroană" };

export default function ScenePicker({ sceneId = null, fixtures = [], timing = "before", canEdit = false, onChange, onTiming, showTiming = true }) {
  const [scenes, setScenes] = useState([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => { productionScenesApi.list().then((r) => setScenes(r.scenes || [])).catch(() => {}); }, []);

  const fx = fixtures || [];
  const colorOf = (key) => (fx.find((f) => f.fixture === key) || {}).color || "";
  const setFixture = (key, color) => {
    const next = fx.filter((f) => f.fixture !== key);
    if (color) next.push({ fixture: key, color });
    next.sort((a, b) => FIXTURE_ORDER.indexOf(a.fixture) - FIXTURE_ORDER.indexOf(b.fixture));
    onChange?.({ sceneId, fixtures: next });
  };
  const applyScene = (s) => onChange?.({ sceneId: s.id, fixtures: (s.fixtures || []).map((f) => ({ fixture: f.fixture, color: f.color })) });
  const clearScene = () => onChange?.({ sceneId: null, fixtures: [] });
  const t = timing === "after" ? "after" : "before";
  const doSave = async () => {
    const nm = name.trim(); if (!nm || !fx.length) return;
    try { const s = await productionScenesApi.create({ name: nm, fixtures: fx.map((f) => ({ fixture: f.fixture, color: f.color })) }); setScenes((p) => [...p, s]); onChange?.({ sceneId: s.id, fixtures: fx }); } catch (e) { /* silent */ }
    setSaveOpen(false); setName("");
  };

  return (
    <div className="sp">
      <div className="sp-row">
        <select className="sp-sel" value={sceneId ? String(sceneId) : ""} disabled={!canEdit}
          onChange={(e) => { const v = e.target.value; if (!v) clearScene(); else { const s = scenes.find((x) => String(x.id) === v); if (s) applyScene(s); } }}>
          <option value="">Fără scenă</option>
          {scenes.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
        </select>
        {showTiming && (
          <span className="sp-tim" title="Când se fac luminile față de moment (default: înainte)">
            <button type="button" className={`sp-tb ${t === "before" ? "on" : ""}`} disabled={!canEdit} onClick={() => onTiming?.("before")}>⬆ înainte</button>
            <button type="button" className={`sp-tb ${t === "after" ? "on" : ""}`} disabled={!canEdit} onClick={() => onTiming?.("after")}>după ⬇</button>
          </span>
        )}
        {canEdit && (saveOpen ? (
          <span className="sp-save">
            <input className="sp-in" autoFocus value={name} placeholder="nume scenă" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSave()} />
            <button className="sp-ok" onClick={doSave} title="Salvează">✓</button>
            <button className="sp-cx" onClick={() => setSaveOpen(false)} title="Renunță">✕</button>
          </span>
        ) : <button className="sp-saveb" disabled={!fx.length} onClick={() => { setName(""); setSaveOpen(true); }} title="Salvează culorile curente ca scenă nouă">💾 Salvează scenă</button>)}
      </div>
      <div className="sp-fx">
        {FIXTURE_ORDER.map((key) => { const c = colorOf(key); return (
          <label key={key} className={`fx ${c ? "set" : ""}`} title={FIXTURE_LBL[key]}>
            <span className="fx-sw" style={{ background: c || "transparent" }}><input type="color" value={c || "#2f81f7"} disabled={!canEdit} onChange={(e) => setFixture(key, e.target.value)} /></span>
            <span className="fx-nm">{FIXTURE_LBL[key]}</span>
            {c && canEdit && <span className="fx-x" onClick={(e) => { e.preventDefault(); setFixture(key, ""); }}>✕</span>}
          </label>
        ); })}
      </div>
      <style jsx>{`
        .sp { display: flex; flex-direction: column; gap: 10px; }
        .sp-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .sp-sel { flex: 1; min-width: 150px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); font-size: 12.5px; padding: 7px 10px; outline: none; cursor: pointer; }
        .sp-sel:focus { border-color: var(--primary); }
        .sp-tim { display: inline-flex; border: 1px solid var(--border-strong); border-radius: 7px; overflow: hidden; flex: none; }
        .sp-tb { background: var(--surface-3); border: none; color: var(--text-dim); font-size: 11.5px; font-weight: 600; padding: 7px 10px; cursor: pointer; }
        .sp-tb + .sp-tb { border-left: 1px solid var(--border-strong); }
        .sp-tb.on { background: rgba(47,129,247,.18); color: var(--text); }
        .sp-tb:disabled { cursor: default; }
        .sp-saveb { flex: none; background: transparent; border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 7px; padding: 6px 10px; font-size: 11.5px; cursor: pointer; }
        .sp-saveb:hover:not(:disabled) { color: #f0d94d; border-color: #f0d94d; }
        .sp-saveb:disabled { opacity: .45; cursor: default; }
        .sp-save { display: inline-flex; align-items: center; gap: 5px; }
        .sp-in { width: 130px; background: var(--surface-3); border: 1px solid var(--primary); border-radius: 7px; color: var(--text); font-size: 12.5px; padding: 6px 9px; outline: none; }
        .sp-ok, .sp-cx { width: 30px; height: 30px; background: transparent; border: 1px solid var(--border-strong); border-radius: 6px; cursor: pointer; font-size: 13px; }
        .sp-ok { color: var(--product); } .sp-cx { color: var(--text-faint); }
        .sp-fx { display: flex; flex-wrap: wrap; gap: 8px; }
        .fx { position: relative; display: inline-flex; align-items: center; gap: 6px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 8px; padding: 4px 8px 4px 5px; cursor: pointer; }
        .fx-sw { position: relative; width: 22px; height: 22px; border-radius: 5px; border: 1px solid var(--border-strong); overflow: hidden; flex: none; }
        .fx-sw input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
        .fx-nm { color: var(--text-dim); font-size: 12.5px; font-weight: 600; }
        .fx.set .fx-nm { color: var(--text); }
        .fx-x { color: var(--text-faint); font-size: 11px; cursor: pointer; }
        .fx-x:hover { color: var(--danger); }
      `}</style>
    </div>
  );
}
