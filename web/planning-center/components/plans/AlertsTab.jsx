"use client";
/**
 * Tab „Alerts" (doar pt. cine are editOrder) — Planning Center Alerts.
 * Stânga: formular (titlu + descriere + ECHIPE-țintă obligatorii + atașamente + linkuri + Trimite / Programează).
 * Dreapta: lista alertelor (status, echipe, câți au citit, view/edit/delete). Doar echipele alese primesc alerta.
 */
import { useCallback, useEffect, useState } from "react";
import { plansApi } from "@/lib/api/client";

const KINDS = [["file", "Fișier"], ["image", "Imagine"], ["video", "Video"]];
const blank = () => ({ title: "", body: "", teamIds: [], attachments: [], links: [], scheduledAt: "" });

export default function AlertsTab({ planId, flash }) {
  const [teams, setTeams] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [f, setF] = useState(blank());
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);
  // intrări temporare pt. atașament/link
  const [att, setAtt] = useState({ name: "", url: "", kind: "file" });
  const [lnk, setLnk] = useState({ label: "", url: "" });

  const loadAlerts = useCallback(() => { plansApi.alerts(planId).then((r) => setAlerts(r.alerts || [])).catch(() => {}); }, [planId]);
  useEffect(() => {
    plansApi.teams(planId).then((r) => setTeams([...(r.myTeams || []), ...(r.otherTeams || [])].map((t) => ({ id: String(t.teamId), name: t.name })))).catch(() => {});
    loadAlerts();
  }, [planId, loadAlerts]);

  const toggleTeam = (id) => setF((x) => ({ ...x, teamIds: x.teamIds.includes(id) ? x.teamIds.filter((t) => t !== id) : [...x.teamIds, id] }));
  const addAtt = () => { if (!att.url.trim()) return; setF((x) => ({ ...x, attachments: [...x.attachments, { ...att, name: att.name.trim() || att.url.trim() }] })); setAtt({ name: "", url: "", kind: "file" }); };
  const addLnk = () => { if (!lnk.url.trim()) return; setF((x) => ({ ...x, links: [...x.links, { ...lnk, label: lnk.label.trim() || lnk.url.trim() }] })); setLnk({ label: "", url: "" }); };
  async function upload(file) { try { const r = await plansApi.uploadFile(file); if (r?.url) setF((x) => ({ ...x, attachments: [...x.attachments, { name: file.name, url: r.url, kind: /\.(png|jpe?g|gif|webp)$/i.test(file.name) ? "image" : "file" }] })); } catch (e) { flash?.(e?.message || "Eroare upload."); } }

  function reset() { setF(blank()); setEditId(null); }
  async function submit(schedule) {
    if (!f.title.trim()) return flash?.("Scrie un titlu.");
    if (!f.teamIds.length) return flash?.("Alege cel puțin o echipă.");
    const payload = { title: f.title, body: f.body, teamIds: f.teamIds, attachments: f.attachments, links: f.links, scheduledAt: schedule ? (f.scheduledAt || null) : null };
    if (schedule && !f.scheduledAt) return flash?.("Alege data/ora pt. programare.");
    setBusy(true);
    try {
      if (editId) await plansApi.updateAlert(planId, editId, payload);
      else await plansApi.createAlert(planId, payload);
      flash?.(schedule ? "Alertă programată." : "Alertă trimisă.");
      reset(); loadAlerts();
    } catch (e) { flash?.(e?.message || "Eroare."); } finally { setBusy(false); }
  }
  function editAlert(a) { setEditId(a.id); setF({ title: a.title, body: a.body, teamIds: a.teamIds || [], attachments: a.attachments || [], links: a.links || [], scheduledAt: a.scheduledAt ? new Date(a.scheduledAt).toISOString().slice(0, 16) : "" }); }
  async function del(a) { if (!confirm("Ștergi alerta?")) return; try { await plansApi.deleteAlert(planId, a.id); loadAlerts(); if (editId === a.id) reset(); } catch (e) { flash?.(e?.message || "Eroare."); } }

  return (
    <div className="al">
      <div className="al-form">
        <div className="af-h">{editId ? "Editează alerta" : "Alertă nouă"}</div>
        <input className="input big" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Titlu alertă" />
        <textarea className="input" rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Descriere…" />

        <div className="lbl">Trimite către echipele (obligatoriu)</div>
        <div className="teams">
          {teams.map((t) => <label key={t.id} className={`tchip ${f.teamIds.includes(t.id) ? "on" : ""}`}><input type="checkbox" checked={f.teamIds.includes(t.id)} onChange={() => toggleTeam(t.id)} />{t.name}</label>)}
          {!teams.length && <span className="muted">Nicio echipă pe acest plan.</span>}
        </div>

        <div className="lbl">Atașamente</div>
        {f.attachments.map((a, i) => <div key={i} className="chipline">{a.kind === "video" ? "▶" : a.kind === "image" ? "🖼" : "▢"} {a.name}<button onClick={() => setF((x) => ({ ...x, attachments: x.attachments.filter((_, j) => j !== i) }))}>✕</button></div>)}
        <div className="addrow">
          <input className="input" placeholder="Nume" value={att.name} onChange={(e) => setAtt({ ...att, name: e.target.value })} />
          <input className="input" placeholder="URL" value={att.url} onChange={(e) => setAtt({ ...att, url: e.target.value })} />
          <select className="input" value={att.kind} onChange={(e) => setAtt({ ...att, kind: e.target.value })}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <button className="btn btn-ghost" onClick={addAtt}>+</button>
        </div>
        <label className="upl">Încarcă fișier<input type="file" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>

        <div className="lbl">Linkuri</div>
        {f.links.map((l, i) => <div key={i} className="chipline">🔗 {l.label}<button onClick={() => setF((x) => ({ ...x, links: x.links.filter((_, j) => j !== i) }))}>✕</button></div>)}
        <div className="addrow">
          <input className="input" placeholder="Etichetă" value={lnk.label} onChange={(e) => setLnk({ ...lnk, label: e.target.value })} />
          <input className="input" placeholder="https://…" value={lnk.url} onChange={(e) => setLnk({ ...lnk, url: e.target.value })} />
          <button className="btn btn-ghost" onClick={addLnk}>+</button>
        </div>

        <div className="sched">
          <input className="input" type="datetime-local" value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} />
        </div>
        <div className="actions">
          {editId && <button className="btn btn-ghost" onClick={reset}>Anulează</button>}
          <button className="btn btn-ghost" disabled={busy} onClick={() => submit(true)}>Programează</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => submit(false)}>{editId ? "Salvează + trimite" : "Trimite acum"}</button>
        </div>
      </div>

      <div className="al-list">
        <div className="al-lh">Alerte · {alerts.length}</div>
        {!alerts.length ? <div className="muted">Nicio alertă încă.</div> : alerts.map((a) => (
          <div key={a.id} className="acard">
            <div className="ac-top">
              <span className={`ac-st ${a.status}`}>{a.status === "scheduled" ? "Programată" : "Trimisă"}</span>
              <span className="ac-read">{a.ackCount}/{a.recipientCount} au citit</span>
            </div>
            <div className="ac-title">{a.title}</div>
            {a.body && <div className="ac-body">{a.body}</div>}
            <div className="ac-teams">{(a.teamNames || []).map((n, i) => <span key={i} className="ac-team">{n}</span>)}</div>
            {a.status === "scheduled" && a.scheduledAt && <div className="ac-when">⏰ {new Date(a.scheduledAt).toLocaleString("ro-RO")}</div>}
            <div className="ac-act"><button onClick={() => editAlert(a)}>Editează</button><button className="del" onClick={() => del(a)}>Șterge</button></div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .al { display: grid; grid-template-columns: 440px 1fr; gap: 22px; align-items: start; }
        .al-form { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
        .af-h { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
        .input.big { font-size: 15px; font-weight: 600; }
        .lbl { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; margin-top: 8px; }
        .teams { display: flex; flex-wrap: wrap; gap: 6px; }
        .tchip { display: inline-flex; align-items: center; gap: 6px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 16px; padding: 4px 11px; font-size: 12.5px; cursor: pointer; color: var(--text-dim); }
        .tchip.on { border-color: var(--primary); color: var(--text); background: rgba(47,129,247,.1); }
        .chipline { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: var(--surface-2); border-radius: 7px; padding: 6px 10px; font-size: 12.5px; color: var(--text); }
        .chipline button { background: transparent; border: none; color: var(--text-faint); cursor: pointer; }
        .addrow { display: grid; grid-template-columns: 1fr 1.3fr auto auto; gap: 6px; }
        .addrow .input { font-size: 12.5px; padding: 6px 8px; }
        .upl { align-self: flex-start; color: var(--text-link); font-size: 12.5px; cursor: pointer; }
        .sched { margin-top: 10px; } .sched .input { color-scheme: dark; }
        .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
        .al-list { display: flex; flex-direction: column; gap: 10px; }
        .al-lh { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
        .muted { color: var(--text-faint); font-size: 13px; }
        .acard { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 13px 15px; }
        .ac-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .ac-st { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; border-radius: 10px; padding: 2px 8px; }
        .ac-st.sent { color: var(--product); border: 1px solid var(--product); } .ac-st.scheduled { color: var(--st-unconfirmed); border: 1px solid var(--st-unconfirmed); }
        .ac-read { color: var(--text-faint); font-size: 12px; }
        .ac-title { color: var(--text); font-weight: 600; font-size: 14.5px; }
        .ac-body { color: var(--text-dim); font-size: 12.5px; margin-top: 3px; white-space: pre-wrap; max-height: 60px; overflow: hidden; }
        .ac-teams { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
        .ac-team { color: var(--text-faint); font-size: 11px; border: 1px solid var(--border-strong); border-radius: 10px; padding: 1px 8px; }
        .ac-when { color: var(--st-unconfirmed); font-size: 12px; margin-top: 6px; }
        .ac-act { display: flex; gap: 14px; margin-top: 10px; }
        .ac-act button { background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 12.5px; }
        .ac-act button:hover { color: var(--text); } .ac-act .del:hover { color: var(--danger); }
        @media (max-width: 900px) { .al { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
