"use client";
/**
 * Editor MEDLEY în drawer — snippet-urile de cântec, în ordine, cu săgeți jos. Fiecare snippet:
 * titlu + gamă + timp + sequence (părțile cântate) + notă + reorder/remove. „+ Cântec" adaugă un snippet,
 * „Chart combinat" deschide vederea combinată. Salvează via plansApi.updateMedley.
 */
import { useState } from "react";
import { plansApi } from "@/lib/api/client";
import SongPickerModal from "./SongPickerModal";
import CombinedChartView from "./CombinedChartView";

const splitLen = (s) => ({ m: Math.floor((s || 0) / 60), s: (s || 0) % 60 });

export default function MedleyEditor({ planId, itemId, title, initial = [], canEdit = false, onChanged, flash }) {
  const [list, setList] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [chart, setChart] = useState(false);

  function save(next) {
    setList(next);
    plansApi.updateMedley(planId, itemId, { medley: next.map((c) => ({ songId: c.songId, arrangementId: c.arrangementId, keyId: c.keyId, keyName: c.keyName, title: c.title, sequence: c.sequence, lengthSec: c.lengthSec, note: c.note })) })
      .then(() => onChanged?.()).catch((e) => flash?.(e?.message || "Eroare."));
  }
  const edit = (i, patch) => save(list.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i, dir) => { const j = i + dir; if (j < 0 || j >= list.length) return; const a = [...list]; [a[i], a[j]] = [a[j], a[i]]; save(a); };
  const remove = (i) => save(list.filter((_, j) => j !== i));
  function addSongs(songs) { setAdding(false); save([...list, ...songs.map((s) => ({ songId: s.id, arrangementId: null, keyId: null, keyName: "", title: s.title, sequence: [], lengthSec: 0, note: "" }))]); }

  return (
    <div className="me">
      <div className="me-top">
        <span className="me-h">Cântece în medley</span>
        <button className="me-chart" onClick={() => setChart(true)}>Chart combinat</button>
      </div>

      {list.map((c, i) => {
        const L = splitLen(c.lengthSec);
        return (
          <div key={i} className="snip">
            <div className="sn-head">
              <span className="sn-n">{i + 1}</span>
              <input className="sn-title" value={c.title} disabled={!canEdit} onChange={(e) => edit(i, { title: e.target.value })} placeholder="Titlu" />
              <input className="sn-key" value={c.keyName} disabled={!canEdit} onChange={(e) => edit(i, { keyName: e.target.value })} placeholder="Gamă" />
              {canEdit && (
                <span className="sn-ctl">
                  <button onClick={() => move(i, -1)} disabled={i === 0} title="Sus">↑</button>
                  <button onClick={() => move(i, 1)} disabled={i === list.length - 1} title="Jos">↓</button>
                  <button onClick={() => remove(i)} title="Scoate" className="rm">✕</button>
                </span>
              )}
            </div>
            <div className="sn-row2">
              <span className="sn-time">
                <input type="number" min="0" value={L.m} disabled={!canEdit} onChange={(e) => edit(i, { lengthSec: (Number(e.target.value) || 0) * 60 + L.s })} /> :
                <input type="number" min="0" max="59" value={L.s} disabled={!canEdit} onChange={(e) => edit(i, { lengthSec: L.m * 60 + (Number(e.target.value) || 0) })} />
              </span>
              <input className="sn-seq" value={(c.sequence || []).join(", ")} disabled={!canEdit} onChange={(e) => edit(i, { sequence: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} placeholder="Părți cântate (ex: Bridge, Coda)" />
            </div>
            <input className="sn-note" value={c.note || ""} disabled={!canEdit} onChange={(e) => edit(i, { note: e.target.value })} placeholder="Notă (opțional)" />
            {i < list.length - 1 && <div className="sn-arrow">↓</div>}
          </div>
        );
      })}

      {!list.length && <div className="me-none">Niciun cântec în medley.</div>}
      {canEdit && <button className="me-add" onClick={() => setAdding(true)}>+ Cântec</button>}

      {adding && <SongPickerModal onClose={() => setAdding(false)} onPick={addSongs} />}
      {chart && <CombinedChartView children={list} title={title} onClose={() => setChart(false)} />}

      <style jsx>{`
        .me-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .me-h { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; }
        .me-chart { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; font-size: 11.5px; padding: 4px 9px; cursor: pointer; }
        .me-chart:hover { color: var(--primary); border-color: var(--primary); }
        .snip { background: var(--surface-2); border: 1px solid var(--border); border-radius: 9px; padding: 9px 10px; margin-bottom: 8px; position: relative; }
        .sn-head { display: flex; align-items: center; gap: 7px; }
        .sn-n { width: 18px; height: 18px; border-radius: 50%; background: var(--surface-3); color: var(--text-dim); font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex: none; }
        .sn-title { flex: 1; min-width: 0; background: transparent; border: none; border-bottom: 1px solid var(--border-strong); color: var(--text); font-size: 13px; padding: 2px 2px; font-family: inherit; }
        .sn-key { width: 52px; flex: none; background: transparent; border: none; border-bottom: 1px solid var(--border-strong); color: var(--product); font-weight: 600; font-size: 12px; text-align: center; font-family: inherit; }
        .sn-ctl { display: inline-flex; gap: 2px; flex: none; }
        .sn-ctl button { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 12px; padding: 0 3px; }
        .sn-ctl button:hover:not(:disabled) { color: var(--text); } .sn-ctl .rm:hover { color: var(--danger); }
        .sn-ctl button:disabled { opacity: .3; cursor: default; }
        .sn-row2 { display: flex; align-items: center; gap: 8px; margin-top: 7px; }
        .sn-time { color: var(--text-dim); font-size: 12px; flex: none; }
        .sn-time input { width: 32px; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 4px; color: var(--text); font-size: 12px; text-align: center; font-family: inherit; }
        .sn-seq { flex: 1; min-width: 0; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 5px; color: var(--text); font-size: 12px; padding: 4px 7px; font-family: inherit; }
        .sn-note { width: 100%; margin-top: 7px; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 5px; color: var(--text-dim); font-size: 12px; padding: 4px 7px; font-family: inherit; }
        .sn-arrow { text-align: center; color: var(--primary); font-size: 16px; margin: 6px 0 -2px; }
        .me-none { color: var(--text-faint); font-size: 12.5px; padding: 8px 0; }
        .me-add { background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 7px; padding: 7px 12px; font-size: 12.5px; cursor: pointer; width: 100%; }
        .me-add:hover { color: var(--primary); border-color: var(--primary); }
      `}</style>
    </div>
  );
}
