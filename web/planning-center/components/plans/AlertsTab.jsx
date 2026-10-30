"use client";
/**
 * Tab „Alerts" — vizibil TUTUROR userilor.
 *  • view-only (fără editOrder): cardurile cu alertele primite (alertsApi.mine) → click = vizualizare completă.
 *  • view-and-edit (editOrder): formular modern (titlu + descriere mare + ECHIPE-țintă + atașamente drag-drop +
 *    linkuri cu titlu auto YouTube + Programează/Trimite) + lista alertelor ca CARDURI (seen/not-seen, CRUD).
 * Doar echipele alese primesc alerta. Push-ul la oameni pleacă DOAR cu flagul de server (zero autonom).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { plansApi, alertsApi } from "@/lib/api/client";
import Modal from "@/components/ui/Modal";
import PersonAvatar from "@/components/plans/PersonAvatar";

const AUD = /\.(mp3|m4a|aac|wav|ogg|flac|opus|aiff?)$/i;
const IMG = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
const VID = /\.(mp4|mov|webm|mkv|avi|m4v)$/i;
const DOC = /\.(pdf|docx?|pptx?|xlsx?|txt|csv|zip|rar)$/i;
const blank = () => ({ title: "", body: "", teamIds: [], attachments: [], links: [], scheduledAt: "" });
const attIcon = (k) => (k === "image" ? "🖼" : k === "video" ? "▶" : k === "audio" ? "♪" : "▢");
const fmtDT = (d) => { try { return new Date(d).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return ""; } };

export default function AlertsTab({ planId, flash, canEdit }) {
  if (!canEdit) return <AlertsViewOnly planId={planId} />;
  return <AlertsManage planId={planId} flash={flash} />;
}

/* ══════════ VIEW-ONLY (toți userii) ══════════ */
function AlertsViewOnly({ planId }) {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => { alertsApi.mine().then((r) => setList(r.alerts || [])).catch(() => setList([])); }, [planId]);
  if (list === null) return <div className="vo-muted">Se încarcă…</div>;
  return (
    <div className="vo">
      {!list.length ? <div className="vo-muted">Nu ai nicio alertă.</div> : (
        <div className="vo-grid">
          {list.map((a) => (
            <button key={a.id} className="vo-card" onClick={() => setOpen(a)}>
              <div className="vo-head">
                {a.by ? <PersonAvatar person={{ avatar: a.by.avatar, initials: a.by.initials }} size={30} /> : <div className="vo-dot">!</div>}
                <div className="vo-by"><div className="vo-name">{a.by?.name || "Alertă"}</div><div className="vo-at">{fmtDT(a.at)}</div></div>
                {a.acked ? <span className="vo-ack">✓ citit</span> : <span className="vo-new">NOU</span>}
              </div>
              <div className="vo-title">{a.title}</div>
              {a.body && <div className="vo-body">{a.body}</div>}
              {((a.attachments || []).length > 0 || (a.links || []).length > 0) && (
                <div className="vo-meta">{(a.attachments || []).length > 0 && <span>📎 {a.attachments.length}</span>}{(a.links || []).length > 0 && <span>🔗 {a.links.length}</span>}</div>
              )}
            </button>
          ))}
        </div>
      )}
      {open && <AlertViewModal alert={open} onClose={() => setOpen(null)} />}
      <style jsx>{`
        .vo-muted { color: var(--text-faint); font-size: 13px; padding: 24px 0; }
        .vo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 360px)); gap: 14px; }
        .vo-card { text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px; cursor: pointer; transition: border-color .14s, transform .14s; display: flex; flex-direction: column; gap: 7px; }
        .vo-card:hover { border-color: var(--border-strong); transform: translateY(-2px); }
        .vo-head { display: flex; align-items: center; gap: 9px; }
        .vo-dot { width: 30px; height: 30px; border-radius: 50%; background: var(--danger); color: #fff; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
        .vo-by { flex: 1; min-width: 0; }
        .vo-name { color: var(--text); font-size: 12.5px; font-weight: 600; }
        .vo-at { color: var(--text-faint); font-size: 11px; }
        .vo-ack { color: var(--product); font-size: 10.5px; font-weight: 700; }
        .vo-new { color: #fff; background: var(--danger); font-size: 9.5px; font-weight: 800; letter-spacing: .4px; border-radius: 6px; padding: 2px 6px; }
        .vo-title { color: var(--text); font-size: 15px; font-weight: 700; }
        .vo-body { color: var(--text-dim); font-size: 13px; line-height: 1.5; max-height: 60px; overflow: hidden; white-space: pre-wrap; }
        .vo-meta { display: flex; gap: 12px; color: var(--text-faint); font-size: 11.5px; margin-top: 2px; }
      `}</style>
    </div>
  );
}

/* ══════════ VIEW + EDIT (editOrder) ══════════ */
function AlertsManage({ planId, flash }) {
  const [teams, setTeams] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [f, setF] = useState(blank());
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [lnk, setLnk] = useState({ label: "", url: "" });
  const [lnkBusy, setLnkBusy] = useState(false);
  const [schedOpen, setSchedOpen] = useState(false);
  const [seenFor, setSeenFor] = useState(null);
  const fileRef = useRef(null);

  const loadAlerts = useCallback(() => { plansApi.alerts(planId).then((r) => setAlerts(r.alerts || [])).catch(() => {}); }, [planId]);
  useEffect(() => {
    plansApi.teams(planId).then((r) => setTeams([...(r.myTeams || []), ...(r.otherTeams || [])].map((t) => ({ id: String(t.teamId), name: t.name })))).catch(() => {});
    loadAlerts();
  }, [planId, loadAlerts]);

  const toggleTeam = (id) => setF((x) => ({ ...x, teamIds: x.teamIds.includes(id) ? x.teamIds.filter((t) => t !== id) : [...x.teamIds, id] }));

  async function uploadOne(file) {
    const raw = DOC.test(file.name);
    const r = raw ? await plansApi.uploadFileRt(file, "raw") : await plansApi.uploadFile(file);
    const rt = r?.resourceType || "";
    let kind = "file";
    if (IMG.test(file.name) || rt === "image") kind = "image";
    else if (AUD.test(file.name)) kind = "audio";
    else if (VID.test(file.name) || rt === "video") kind = "video";
    return { name: r?.name || file.name, url: r?.url, kind, resourceType: rt, bytes: r?.bytes };
  }
  async function handleFiles(files) {
    const arr = [...(files || [])];
    for (const file of arr) {
      try { const a = await uploadOne(file); if (a.url) setF((x) => ({ ...x, attachments: [...x.attachments, a] })); }
      catch (e) { flash?.(e?.message || "Eroare upload."); }
    }
  }
  async function addLink() {
    const url = lnk.url.trim(); if (!url) return;
    let label = lnk.label.trim();
    if (!label) { setLnkBusy(true); try { const m = await plansApi.linkMeta(planId, url); label = m?.title || url; } catch { label = url; } finally { setLnkBusy(false); } }
    setF((x) => ({ ...x, links: [...x.links, { label, url }] })); setLnk({ label: "", url: "" });
  }

  function reset() { setF(blank()); setEditId(null); }
  async function submit(scheduledAt) {
    if (!f.title.trim()) return flash?.("Scrie un titlu.");
    if (!f.teamIds.length) return flash?.("Alege cel puțin o echipă.");
    const payload = { title: f.title, body: f.body, teamIds: f.teamIds, attachments: f.attachments, links: f.links, scheduledAt: scheduledAt || null };
    setBusy(true);
    try {
      if (editId) await plansApi.updateAlert(planId, editId, payload);
      else await plansApi.createAlert(planId, payload);
      flash?.(scheduledAt ? "Alertă programată." : "Alertă trimisă.");
      reset(); loadAlerts();
    } catch (e) { flash?.(e?.message || "Eroare."); } finally { setBusy(false); }
  }
  function editAlert(a) { setEditId(a.id); setF({ title: a.title, body: a.body, teamIds: a.teamIds || [], attachments: a.attachments || [], links: a.links || [], scheduledAt: a.scheduledAt ? new Date(a.scheduledAt).toISOString().slice(0, 16) : "" }); window.scrollTo?.({ top: 0, behavior: "smooth" }); }
  async function del(a) { if (!confirm("Ștergi alerta?")) return; try { await plansApi.deleteAlert(planId, a.id); loadAlerts(); if (editId === a.id) reset(); } catch (e) { flash?.(e?.message || "Eroare."); } }
  async function sendNow(a) { try { await plansApi.updateAlert(planId, a.id, { scheduledAt: null }); flash?.("Trimisă acum."); loadAlerts(); } catch (e) { flash?.(e?.message || "Eroare."); } }

  return (
    <div className="al">
      {/* ── Formular ── */}
      <div className="al-form">
        <div className="af-h">{editId ? "Editează alerta" : "Alertă nouă"}</div>
        <input className="input big" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Titlu alertă" />
        <textarea className="input ta" rows={6} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Descriere…" />

        <div className="lbl">Trimite către echipele (obligatoriu)</div>
        <div className="teams">
          {teams.map((t) => <button key={t.id} type="button" className={`tchip ${f.teamIds.includes(t.id) ? "on" : ""}`} onClick={() => toggleTeam(t.id)}>{t.name}</button>)}
          {!teams.length && <span className="muted">Nicio echipă pe acest plan.</span>}
        </div>

        <div className="lbl">Atașamente</div>
        {f.attachments.map((a, i) => (
          <div key={i} className="chipline"><span className="cl-l">{attIcon(a.kind)} {a.name}</span><button onClick={() => setF((x) => ({ ...x, attachments: x.attachments.filter((_, j) => j !== i) }))}>✕</button></div>
        ))}
        <div className={`drop ${drag ? "on" : ""}`} onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}>
          <input ref={fileRef} type="file" hidden multiple onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
          <span className="drop-plus">＋</span>
          <span className="drop-tx">Trage fișiere aici sau click pentru a adăuga</span>
          <span className="drop-sub">imagini, video, audio, PDF — orice</span>
        </div>

        <div className="lbl">Linkuri</div>
        {f.links.map((l, i) => (
          <div key={i} className="chipline"><span className="cl-l">🔗 {l.label}</span><button onClick={() => setF((x) => ({ ...x, links: x.links.filter((_, j) => j !== i) }))}>✕</button></div>
        ))}
        <div className="linkbox">
          <input className="input" placeholder="Etichetă (auto din YouTube)" value={lnk.label} onChange={(e) => setLnk({ ...lnk, label: e.target.value })} />
          <div className="linkrow">
            <input className="input" placeholder="https://…" value={lnk.url} onChange={(e) => setLnk({ ...lnk, url: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addLink()} />
            <button className="lk-add" onClick={addLink} disabled={lnkBusy || !lnk.url.trim()}>{lnkBusy ? "…" : "Adaugă"}</button>
          </div>
        </div>

        <div className="actions">
          {editId && <button className="btn btn-ghost" onClick={reset}>Anulează</button>}
          <button className="btn btn-ghost sched-btn" disabled={busy} onClick={() => setSchedOpen(true)}>⏰ Programează</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => submit(null)}>{busy ? "…" : "Trimite acum"}</button>
        </div>
      </div>

      {/* ── Lista (carduri) ── */}
      <div className="al-list">
        <div className="al-lh">Alerte · {alerts.length}</div>
        {!alerts.length ? <div className="muted">Nicio alertă încă.</div> : alerts.map((a) => (
          <div key={a.id} className="acard">
            <div className="ac-top">
              <span className={`ac-st ${a.status}`}>{a.status === "scheduled" ? "Programată" : "Trimisă"}</span>
              <button className="ac-read" onClick={() => setSeenFor(a)} title="Cine a văzut">
                <span className="ac-seen">✓ {a.ackCount}</span><span className="ac-dot">·</span><span className="ac-unseen">○ {Math.max(0, a.recipientCount - a.ackCount)}</span>
              </button>
            </div>
            <div className="ac-title">{a.title}</div>
            {a.body && <div className="ac-body">{a.body}</div>}
            <div className="ac-teams">{(a.teamNames || []).map((n, i) => <span key={i} className="ac-team">{n}</span>)}</div>
            {a.status === "scheduled" && a.scheduledAt && <div className="ac-when">⏰ {fmtDT(a.scheduledAt)}</div>}
            <div className="ac-act">
              {a.status === "scheduled" && <button className="snd" onClick={() => sendNow(a)}>Trimite acum</button>}
              <button onClick={() => editAlert(a)}>Editează</button>
              <button className="del" onClick={() => del(a)}>Șterge</button>
            </div>
          </div>
        ))}
      </div>

      {schedOpen && <ScheduleModal initial={f.scheduledAt} onClose={() => setSchedOpen(false)} onConfirm={(iso) => { setSchedOpen(false); submit(iso); }} />}
      {seenFor && <SeenModal alert={seenFor} onClose={() => setSeenFor(null)} />}

      <style jsx>{`
        .al { display: grid; grid-template-columns: 460px 1fr; gap: 24px; align-items: start; }
        .al-form { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 8px; }
        .af-h { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
        .input.big { font-size: 15px; font-weight: 600; }
        .ta { resize: vertical; min-height: 120px; max-height: 320px; overflow-y: auto; line-height: 1.5; font-family: inherit; }
        .lbl { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; margin-top: 10px; }
        .teams { display: flex; flex-wrap: wrap; gap: 6px; }
        .tchip { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 16px; padding: 5px 12px; font-size: 12.5px; cursor: pointer; color: var(--text-dim); transition: all .12s ease; }
        .tchip:hover { color: var(--text); }
        .tchip.on { border-color: var(--primary); color: #fff; background: var(--primary); font-weight: 600; }
        .chipline { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; padding: 7px 11px; font-size: 12.5px; color: var(--text); }
        .cl-l { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .chipline button { background: transparent; border: none; color: var(--text-faint); cursor: pointer; flex: none; }
        .chipline button:hover { color: var(--danger); }
        .drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-align: center; border: 1.5px dashed var(--border-strong); border-radius: 10px; padding: 18px 14px; cursor: pointer; transition: all .14s ease; background: var(--surface-2); }
        .drop:hover, .drop.on { border-color: var(--primary); background: rgba(47,129,247,.06); }
        .drop-plus { font-size: 22px; color: var(--primary); line-height: 1; }
        .drop-tx { color: var(--text-dim); font-size: 13px; margin-top: 4px; }
        .drop-sub { color: var(--text-faint); font-size: 11px; }
        .linkbox { display: flex; flex-direction: column; gap: 6px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
        .linkrow { display: flex; gap: 6px; }
        .linkrow .input { flex: 1; }
        .lk-add { flex: none; background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 7px; padding: 0 14px; font-size: 12.5px; cursor: pointer; }
        .lk-add:hover:not(:disabled) { color: var(--primary); border-color: var(--primary); }
        .lk-add:disabled { opacity: .5; cursor: default; }
        .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }
        .al-list { display: flex; flex-direction: column; gap: 12px; max-width: 560px; }
        .al-lh { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
        .muted { color: var(--text-faint); font-size: 13px; }
        .acard { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; }
        .ac-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
        .ac-st { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; border-radius: 10px; padding: 2px 9px; }
        .ac-st.sent { color: var(--product); border: 1px solid var(--product); } .ac-st.scheduled { color: var(--st-unconfirmed); border: 1px solid var(--st-unconfirmed); }
        .ac-read { display: inline-flex; align-items: center; gap: 5px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 10px; padding: 3px 9px; cursor: pointer; font-size: 11.5px; }
        .ac-read:hover { border-color: var(--primary); }
        .ac-seen { color: var(--product); font-weight: 700; } .ac-unseen { color: var(--text-faint); font-weight: 700; } .ac-dot { color: var(--text-faint); }
        .ac-title { color: var(--text); font-weight: 700; font-size: 15px; }
        .ac-body { color: var(--text-dim); font-size: 13px; margin-top: 3px; white-space: pre-wrap; max-height: 60px; overflow: hidden; }
        .ac-teams { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
        .ac-team { color: var(--text-faint); font-size: 11px; border: 1px solid var(--border-strong); border-radius: 10px; padding: 1px 8px; }
        .ac-when { color: var(--st-unconfirmed); font-size: 12px; margin-top: 7px; }
        .ac-act { display: flex; gap: 14px; margin-top: 11px; }
        .ac-act button { background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 12.5px; }
        .ac-act button:hover { color: var(--text); } .ac-act .del:hover { color: var(--danger); } .ac-act .snd { color: var(--primary); font-weight: 600; }
        @media (max-width: 960px) { .al { grid-template-columns: 1fr; } .al-list { max-width: none; } }
      `}</style>
    </div>
  );
}

/* ── Pop-up „Programează" ── */
function ScheduleModal({ initial, onClose, onConfirm }) {
  const def = initial || (() => { const d = new Date(Date.now() + 60 * 60 * 1000); d.setSeconds(0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })();
  const [val, setVal] = useState(def);
  const [err, setErr] = useState("");
  function confirm() {
    if (!val) return setErr("Alege data și ora.");
    if (new Date(val) <= new Date()) return setErr("Alege un moment din viitor.");
    onConfirm(new Date(val).toISOString());
  }
  return (
    <Modal title="Programează alerta" width={400} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Anulează</button><button className="btn btn-primary" onClick={confirm}>Finalizează</button></>}>
      <div className="sm">
        <div className="sm-l">Când pleacă alerta</div>
        <input className="input" type="datetime-local" value={val} onChange={(e) => setVal(e.target.value)} />
        {err && <div className="sm-err">{err}</div>}
        <div className="sm-note">La acel moment devine activă și (dacă push-ul e pornit pe server) pleacă notificarea.</div>
      </div>
      <style jsx>{`
        .sm { display: flex; flex-direction: column; gap: 8px; }
        .sm-l { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .4px; }
        :global(.sm .input[type="datetime-local"]) { color-scheme: dark; }
        .sm-err { background: rgba(229,83,75,.12); border: 1px solid var(--danger); color: #f0a9a4; padding: 7px 10px; border-radius: 6px; font-size: 12px; }
        .sm-note { color: var(--text-faint); font-size: 11.5px; line-height: 1.45; }
      `}</style>
    </Modal>
  );
}

/* ── Seen / not-seen ── */
function SeenModal({ alert, onClose }) {
  const seen = alert.ackedPeople || [], notSeen = alert.pendingPeople || [];
  const Row = ({ p, ok }) => (
    <div className="sr"><PersonAvatar person={{ avatar: p.avatar, initials: p.initials }} size={28} /><span className="sr-n">{p.name}</span><span className={`sr-b ${ok ? "ok" : "no"}`}>{ok ? "✓ a văzut" : "○ n-a văzut"}</span></div>
  );
  return (
    <Modal title={`Citit · ${seen.length}/${seen.length + notSeen.length}`} width={420} onClose={onClose}
      footer={<button className="btn btn-primary" onClick={onClose}>Închide</button>}>
      <div className="seen">
        {notSeen.length > 0 && <><div className="seen-h">N-au văzut ({notSeen.length})</div>{notSeen.map((p) => <Row key={p.id} p={p} ok={false} />)}</>}
        {seen.length > 0 && <><div className="seen-h">Au văzut ({seen.length})</div>{seen.map((p) => <Row key={p.id} p={p} ok />)}</>}
        {!seen.length && !notSeen.length && <div className="seen-m">Niciun destinatar (nimeni programat în echipele-țintă).</div>}
      </div>
      <style jsx>{`
        .seen { display: flex; flex-direction: column; gap: 3px; max-height: 60vh; overflow: auto; }
        .seen-h { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; margin: 12px 0 5px; }
        .seen-h:first-child { margin-top: 2px; }
        .seen-m { color: var(--text-faint); font-size: 13px; padding: 10px 0; }
        .sr { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
        .sr-n { color: var(--text); font-size: 13.5px; flex: 1; }
        .sr-b { font-size: 11px; font-weight: 700; } .sr-b.ok { color: var(--product); } .sr-b.no { color: var(--text-faint); }
      `}</style>
    </Modal>
  );
}

/* ── Vizualizare completă (view-only) ── */
function AlertViewModal({ alert, onClose }) {
  return (
    <Modal title="Alertă" width={520} onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>Închide</button>}>
      <div className="av">
        <div className="av-head">
          {alert.by ? <PersonAvatar person={{ avatar: alert.by.avatar, initials: alert.by.initials }} size={34} /> : <div className="av-dot">!</div>}
          <div><div className="av-name">{alert.by?.name || "Alertă"}</div><div className="av-at">{fmtDT(alert.at)}</div></div>
        </div>
        <h2 className="av-title">{alert.title}</h2>
        {alert.body && <div className="av-body">{alert.body}</div>}
        {(alert.attachments || []).length > 0 && (
          <div className="av-sec"><div className="av-sl">Atașamente</div>{alert.attachments.map((a, i) => (
            a.kind === "image" && a.url ? <a key={i} className="av-img" href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.name || ""} /></a>
              : <a key={i} className="av-file" href={a.url} target="_blank" rel="noreferrer">{attIcon(a.kind)} {a.name || a.url}</a>
          ))}</div>
        )}
        {(alert.links || []).length > 0 && (
          <div className="av-sec"><div className="av-sl">Linkuri</div>{alert.links.map((l, i) => <a key={i} className="av-link" href={l.url} target="_blank" rel="noreferrer">🔗 {l.label || l.url}</a>)}</div>
        )}
      </div>
      <style jsx>{`
        .av { display: flex; flex-direction: column; }
        .av-head { display: flex; align-items: center; gap: 11px; margin-bottom: 12px; }
        .av-dot { width: 34px; height: 34px; border-radius: 50%; background: var(--danger); color: #fff; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
        .av-name { color: var(--text); font-weight: 600; font-size: 14px; } .av-at { color: var(--text-faint); font-size: 11.5px; }
        .av-title { margin: 0 0 10px; font-size: 21px; font-weight: 700; color: var(--text); }
        .av-body { color: var(--text-dim); font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
        .av-sec { margin-top: 16px; }
        .av-sl { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 7px; }
        .av-img img { max-width: 100%; border-radius: 8px; display: block; margin-bottom: 6px; }
        .av-file, .av-link { display: block; color: var(--text-link); font-size: 13.5px; padding: 5px 0; text-decoration: none; }
        .av-file:hover, .av-link:hover { text-decoration: underline; }
      `}</style>
    </Modal>
  );
}
