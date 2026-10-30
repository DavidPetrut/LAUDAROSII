"use client";
/**
 * Planning Center Alert — pop-up OBLIGATORIU (ca un RO-Alert). Nu se poate închide până nu dai scroll
 * până jos ȘI apeși „Am înțeles" (→ confirmare pe server). Centrat pe web, cu overlay-shadow + max-width.
 * Montează-l o singură dată în shell-ul aplicației; el face polling la /alerts/pending.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { alertsApi } from "@/lib/api/client";
import PersonAvatar from "@/components/plans/PersonAvatar";

export default function AlertGate() {
  const [queue, setQueue] = useState([]);
  const [atEnd, setAtEnd] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);

  const poll = useCallback(() => { alertsApi.pending().then((r) => setQueue((q) => mergeQueue(q, r.alerts || []))).catch(() => {}); }, []);
  useEffect(() => { poll(); const t = setInterval(poll, 60000); return () => clearInterval(t); }, [poll]);

  const cur = queue[0] || null;

  // la fiecare alertă nouă: resetează „atEnd" + bifa; dacă nu e nevoie de scroll, dezvăluie direct bifa
  useEffect(() => {
    setAtEnd(false); setChecked(false);
    const el = bodyRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 4) setAtEnd(true);
  }, [cur?.id]);

  function onScroll(e) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 6) setAtEnd(true);
  }
  async function ack() {
    if (!cur || !atEnd || !checked || busy) return;
    setBusy(true);
    try { await alertsApi.ack(cur.id); setQueue((q) => q.filter((a) => String(a.id) !== String(cur.id))); }
    catch { /* rămâne în coadă, reîncearcă */ } finally { setBusy(false); }
  }

  if (!cur) return null;

  return (
    <div className="ag-ov">
      <div className="ag">
        <div className="ag-head">
          {cur.by ? <PersonAvatar person={{ avatar: cur.by.avatar, initials: cur.by.initials }} size={34} /> : <div className="ag-dot">!</div>}
          <div className="ag-by">
            <div className="ag-name">{cur.by?.name || "Planning Center"}</div>
            <div className="ag-tag">ALERTĂ · trebuie confirmată</div>
          </div>
        </div>
        <div className="ag-body" ref={bodyRef} onScroll={onScroll}>
          <h2 className="ag-title">{cur.title}</h2>
          {cur.body && <div className="ag-text">{cur.body}</div>}
          {(cur.attachments || []).length > 0 && (
            <div className="ag-att">
              <div className="ag-sl">Atașamente</div>
              {cur.attachments.map((a, i) => (
                a.kind === "image" && a.url ? <a key={i} className="ag-img" href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.name || ""} /></a>
                  : <a key={i} className="ag-file" href={a.url} target="_blank" rel="noreferrer">{a.kind === "video" ? "▶" : "▢"} {a.name || a.url}</a>
              ))}
            </div>
          )}
          {(cur.links || []).length > 0 && (
            <div className="ag-att">
              <div className="ag-sl">Linkuri</div>
              {cur.links.map((l, i) => <a key={i} className="ag-link" href={l.url} target="_blank" rel="noreferrer">{l.label || l.url}</a>)}
            </div>
          )}
        </div>
        <div className="ag-foot">
          {!atEnd ? <div className="ag-scrollhint">Derulează până jos ca să confirmi ▾</div> : (
            <label className="ag-check">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              <span className="ag-box" />
              <span className="ag-ctx">Am citit și am înțeles această alertă</span>
            </label>
          )}
          <button className="ag-ok" disabled={!atEnd || !checked || busy} onClick={ack}>{busy ? "…" : "Am înțeles"}</button>
        </div>
        {queue.length > 1 && <div className="ag-more">+{queue.length - 1} alte alerte</div>}
      </div>
      <style jsx>{`
        .ag-ov { position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,.72); display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(2px); }
        .ag { width: 520px; max-width: 100%; max-height: 86vh; background: var(--modal-bg); border: 1px solid var(--danger); border-radius: 14px; display: flex; flex-direction: column; box-shadow: 0 24px 80px rgba(0,0,0,.6); animation: agIn .18s ease; overflow: hidden; }
        @keyframes agIn { from { transform: scale(.96); opacity: .6; } to { transform: none; opacity: 1; } }
        .ag-head { display: flex; align-items: center; gap: 11px; padding: 15px 18px; border-bottom: 1px solid var(--border); }
        .ag-dot { width: 34px; height: 34px; border-radius: 50%; background: var(--danger); color: #fff; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
        .ag-name { color: var(--text); font-weight: 600; font-size: 14px; }
        .ag-tag { color: var(--danger); font-size: 10px; font-weight: 800; letter-spacing: .5px; margin-top: 1px; }
        .ag-body { overflow: auto; padding: 16px 18px; }
        .ag-title { margin: 0 0 10px; font-size: 20px; font-weight: 700; color: var(--text); }
        .ag-text { color: var(--text-dim); font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
        .ag-att { margin-top: 14px; }
        .ag-sl { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 6px; }
        .ag-img img { max-width: 100%; border-radius: 8px; display: block; }
        .ag-file, .ag-link { display: block; color: var(--text-link); font-size: 13px; padding: 5px 0; text-decoration: none; }
        .ag-file:hover, .ag-link:hover { text-decoration: underline; }
        .ag-foot { display: flex; flex-direction: column; align-items: stretch; gap: 8px; padding: 14px 18px; border-top: 1px solid var(--border); }
        .ag-scrollhint { color: var(--text-faint); font-size: 12px; text-align: center; animation: bob 1.1s ease-in-out infinite; }
        @keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
        .ag-check { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; padding: 2px 0; animation: agIn .18s ease; }
        .ag-check input { position: absolute; opacity: 0; width: 0; height: 0; }
        .ag-box { width: 20px; height: 20px; flex: none; border-radius: 6px; border: 2px solid var(--border-strong); background: var(--surface-2); position: relative; transition: all .14s ease; }
        .ag-check input:checked + .ag-box { background: var(--danger); border-color: var(--danger); }
        .ag-check input:checked + .ag-box::after { content: "✓"; position: absolute; inset: 0; color: #fff; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
        .ag-ctx { color: var(--text); font-size: 13px; }
        .ag-ok { background: var(--danger); border: none; color: #fff; border-radius: 9px; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer; }
        .ag-ok:disabled { opacity: .4; cursor: default; }
        .ag-more { text-align: center; color: var(--text-faint); font-size: 11.5px; padding: 0 0 10px; }
      `}</style>
    </div>
  );
}

// păstrează ordinea + nu pierde o alertă în curs; adaugă doar ce-i nou de la server
function mergeQueue(prev, next) {
  const nextIds = new Set(next.map((a) => String(a.id)));
  const kept = prev.filter((a) => nextIds.has(String(a.id)));
  const keptIds = new Set(kept.map((a) => String(a.id)));
  const added = next.filter((a) => !keptIds.has(String(a.id)));
  return [...kept, ...added];
}
