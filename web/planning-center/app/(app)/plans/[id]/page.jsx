"use client";
/**
 * Detaliu plan — ecranul „Plan" din PCO (portat de pe mobil). /api/pc/v1/plans/:id.
 * Header (titlu + dată + prev/next + asignările mele) + tab-uri Order / Teams / Times / Notes / Files.
 * Date REALE. Vizual apropiat de PCO; îl aducem pixel-identic pe iterații.
 */
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { plansApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";

const TABS = ["Order", "Teams", "Times", "Notes", "Files"];
const STATUS_COLOR = { confirmed: "#57b98a", unconfirmed: "#c9a227", declined: "#e5534b" };

function Avatar({ p }) {
  if (!p) return null;
  return p.avatar
    ? <img src={p.avatar} alt="" className="av" />
    : <span className="av ini">{p.initials || "?"}</span>;
}

export default function PlanDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [tab, setTab] = useState("Teams");
  const [head, setHead] = useState(null);
  const [data, setData] = useState({});       // per-tab cache
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const loadHead = useCallback(async () => {
    try { setHead(await plansApi.get(id)); }
    catch (e) { setErr(e?.message || "Eroare la plan."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { loadHead(); }, [loadHead]);

  // încarcă conținutul tab-ului curent (o singură dată per tab)
  useEffect(() => {
    if (data[tab]) return;
    const fn = { Order: plansApi.order, Teams: plansApi.teams, Times: plansApi.times, Notes: plansApi.notes, Files: plansApi.files }[tab];
    if (!fn) return;
    fn(id).then((r) => setData((d) => ({ ...d, [tab]: r }))).catch((e) => setErr(e?.message || "Eroare."));
  }, [tab, id, data]);

  useAiSurface({
    id: "plans.detail",
    label: "Detaliu plan",
    scope: "page",
    getContext: () => ({ planId: id, title: head?.title, tab }),
    actions: [
      { id: "tab", label: "Schimbă tab", params: { name: "string" }, run: ({ name }) => TABS.includes(name) && setTab(name) },
      { id: "matrix", label: "Matrix", run: () => head && router.push(`/plans/matrix/${head.serviceTypeId || ""}`) },
    ],
  }, [id, head, tab]);

  const cur = data[tab];

  return (
    <div className="pd">
      <div className="top">
        <button className="back" onClick={() => router.push("/plans")} title="Înapoi">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M10 3L5 8l5 5" /></svg>
        </button>
        <div className="titles">
          <div className="st">{head?.serviceTypeName}</div>
          <h1 className="title">{head?.title || "Plan"}</h1>
        </div>
        <div className="datenav">
          <button disabled={!head?.prevId} onClick={() => head?.prevId && router.push(`/plans/${head.prevId}`)}>‹</button>
          <span className="date">{head?.dateLabel}</span>
          <button disabled={!head?.nextId} onClick={() => head?.nextId && router.push(`/plans/${head.nextId}`)}>›</button>
        </div>
      </div>

      {head?.myAssignments?.length > 0 && (
        <div className="mine">
          {head.myAssignments.map((a) => (
            <span key={a.assignmentId} className={`chip ${a.confirmed ? "ok" : a.declined ? "no" : ""}`}>
              {a.label}{a.team ? ` · ${a.team}` : ""}
            </span>
          ))}
        </div>
      )}

      <div className="tabs">
        {TABS.map((t) => <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {err && <div className="err">{err}</div>}
      {loading ? <div className="empty">Se încarcă…</div> : (
        <div className="body">
          {tab === "Order" && <OrderTab data={cur} />}
          {tab === "Teams" && <TeamsTab data={cur} />}
          {tab === "Times" && <TimesTab data={cur} />}
          {tab === "Notes" && <NotesTab data={cur} />}
          {tab === "Files" && <FilesTab data={cur} />}
        </div>
      )}

      <style jsx>{`
        .pd { padding: 18px 0 80px; }
        .top { display: flex; align-items: flex-start; gap: 10px; }
        .back { background: transparent; border: none; color: var(--text-dim); cursor: pointer; padding: 6px; margin-top: 4px; }
        .back:hover { color: var(--text); }
        .titles { flex: 1; }
        .st { color: var(--text-faint); font-size: 12px; }
        .title { font-size: 22px; font-weight: 600; margin: 2px 0 0; }
        .datenav { display: flex; align-items: center; gap: 8px; }
        .datenav button { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); width: 30px; height: 30px; border-radius: 6px; cursor: pointer; }
        .datenav button:disabled { opacity: .4; }
        .date { color: var(--text); font-size: 14px; min-width: 90px; text-align: center; }
        .mine { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 4px; }
        .chip { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 20px; padding: 4px 12px; font-size: 12.5px; color: var(--text-dim); }
        .chip.ok { border-color: var(--product); color: var(--product); }
        .chip.no { border-color: var(--danger); color: var(--danger); }
        .tabs { display: flex; gap: 8px; margin: 16px 0; border-bottom: 1px solid var(--border); }
        .tab { background: transparent; border: none; color: var(--text-dim); padding: 9px 4px; margin-right: 10px; cursor: pointer; font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .tab:hover { color: var(--text); }
        .tab.active { color: var(--text); border-bottom-color: var(--primary); font-weight: 600; }
        .empty { padding: 30px 4px; color: var(--text-faint); }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; }
      `}</style>
      <style jsx global>{`
        .pd .av { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; flex: none; }
        .pd .av.ini { background: #3a4552; color: #fff; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; }
        .pd .muted { padding: 24px 4px; color: var(--text-faint); font-size: 13.5px; }
      `}</style>
    </div>
  );
}

/* ── Order ── */
function OrderTab({ data }) {
  if (!data) return <div className="muted">Se încarcă…</div>;
  const items = data.items || [];
  if (!items.length) return <div className="muted">Niciun item în ordinea serviciului.</div>;
  return (
    <div className="order">
      {items.map((it) => (
        <div key={it.id} className={`item ${it.type === "header" ? "hdr" : ""}`} style={{ borderLeftColor: it.rowColor || "transparent" }}>
          <div className="it-main">
            <span className="it-title">{it.title}</span>
            {it.keyName ? <span className="it-key">{it.keyName}</span> : null}
          </div>
          <div className="it-right">
            {(it.leaders || []).map((l, i) => (
              <span key={i} className="it-leader">{l.name || l.positionName}{l.needed ? " (needed)" : ""}</span>
            ))}
            {it.lengthLabel ? <span className="it-len">{it.lengthLabel}</span> : null}
          </div>
          <style jsx>{`
            .item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 14px; border-left: 3px solid transparent; border-bottom: 1px solid var(--border-soft); }
            .item.hdr { background: var(--surface-2); }
            .it-title { color: var(--text); font-size: 14px; }
            .item.hdr .it-title { font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: .5px; }
            .it-key { margin-left: 8px; color: var(--product); font-size: 12px; border: 1px solid var(--product); border-radius: 4px; padding: 0 6px; }
            .it-right { display: flex; align-items: center; gap: 12px; color: var(--text-faint); font-size: 12px; }
            .it-leader { color: var(--text-dim); }
            .it-len { color: var(--text-faint); }
          `}</style>
        </div>
      ))}
    </div>
  );
}

/* ── Teams ── */
function TeamCol({ t }) {
  return (
    <div className="tcol">
      <div className="tc-head">
        <span className="tc-name">{t.name}</span>
        <span className="tc-counts">
          <span className="ok">●{t.counts?.confirmed || 0}</span>
          <span className="no">●{t.counts?.declined || 0}</span>
          <span className="un">●{t.counts?.unconfirmed || 0}</span>
        </span>
      </div>
      {(t.groups || []).map((g, gi) => (
        <div key={gi} className="pos">
          <div className="pos-name">{g.positionName || "—"}</div>
          {(g.people || []).map((p, pi) => p.needed
            ? <div key={pi} className="need">Needed</div>
            : <div key={pi} className="pers"><Avatar p={p} /><span className="pn">{p.name}</span><span className="dot" style={{ background: STATUS_COLOR[p.status] || "#6b7580" }} /></div>
          )}
        </div>
      ))}
      {(!t.groups || !t.groups.length) && <div className="pos-empty">Nicio poziție acoperită.</div>}
      <style jsx>{`
        .tcol { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; min-width: 230px; flex: 1; }
        .tc-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .tc-name { color: var(--text); font-weight: 600; font-size: 14px; }
        .tc-counts { display: flex; gap: 8px; font-size: 11px; }
        .tc-counts .ok { color: var(--product); } .tc-counts .no { color: var(--danger); } .tc-counts .un { color: #c9a227; }
        .pos { margin-bottom: 12px; }
        .pos-name { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 6px; }
        .pers { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
        .pn { color: var(--text); font-size: 13px; flex: 1; }
        .dot { width: 7px; height: 7px; border-radius: 50%; }
        .need { color: var(--primary); font-size: 12px; border: 1px dashed var(--primary); border-radius: 6px; padding: 3px 8px; display: inline-block; margin: 2px 0; }
        .pos-empty { color: var(--text-faint); font-size: 12px; }
      `}</style>
    </div>
  );
}
function TeamsTab({ data }) {
  if (!data) return <div className="muted">Se încarcă…</div>;
  const my = data.myTeams || [], other = data.otherTeams || [];
  if (!my.length && !other.length) return <div className="muted">Nicio echipă pe acest plan.</div>;
  return (
    <div className="teams">
      {my.length > 0 && <><div className="grp-label">MY TEAMS</div><div className="cols">{my.map((t) => <TeamCol key={t.teamId} t={t} />)}</div></>}
      {other.length > 0 && <><div className="grp-label">OTHER TEAMS</div><div className="cols">{other.map((t) => <TeamCol key={t.teamId} t={t} />)}</div></>}
      <style jsx>{`
        .grp-label { color: var(--text-faint); font-size: 11px; letter-spacing: .5px; margin: 6px 0 10px; }
        .cols { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; align-items: flex-start; }
      `}</style>
    </div>
  );
}

/* ── Times ── */
function TimesTab({ data }) {
  if (!data) return <div className="muted">Se încarcă…</div>;
  const blocks = [["Service", data.service], ["Rehearsal", data.rehearsal], ["Other", data.other]].filter(([, v]) => v && v.length);
  if (!blocks.length) return <div className="muted">Nicio oră setată.</div>;
  return (
    <div className="times">
      {blocks.map(([label, list]) => (
        <div key={label} className="tblock">
          <div className="tb-label">{label}</div>
          {list.map((t) => (
            <div key={t.id} className="trow"><span className="tw">{t.weekday}</span><span className="tr">{t.range}</span><span className="td">{t.date}</span>{t.name ? <span className="tn">{t.name}</span> : null}</div>
          ))}
        </div>
      ))}
      <style jsx>{`
        .tblock { margin-bottom: 18px; }
        .tb-label { color: var(--text-faint); font-size: 11px; letter-spacing: .5px; margin-bottom: 8px; text-transform: uppercase; }
        .trow { display: flex; align-items: center; gap: 14px; padding: 8px 0; border-bottom: 1px solid var(--border-soft); font-size: 13.5px; }
        .tw { color: var(--product); font-weight: 600; width: 40px; } .tr { color: var(--text); } .td { color: var(--text-dim); } .tn { color: var(--text-faint); }
      `}</style>
    </div>
  );
}

/* ── Notes ── */
function NotesTab({ data }) {
  if (!data) return <div className="muted">Se încarcă…</div>;
  const notes = data.notes || [];
  if (!notes.length) return <div className="muted">Nicio notă.</div>;
  return (
    <div className="notes">
      {notes.map((n) => (
        <div key={n.id} className="note">
          <div className="n-cat">{n.category || "General"}</div>
          <div className="n-body">{n.content}</div>
        </div>
      ))}
      <style jsx>{`
        .note { margin-bottom: 16px; }
        .n-cat { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
        .n-body { color: var(--text); font-size: 14px; line-height: 1.6; white-space: pre-wrap; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }
      `}</style>
    </div>
  );
}

/* ── Files ── */
function FilesTab({ data }) {
  if (!data) return <div className="muted">Se încarcă…</div>;
  const groups = data.groups || [];
  if (!groups.length) return <div className="muted">Niciun fișier.</div>;
  return (
    <div className="files">
      {groups.map((g, gi) => (
        <div key={gi} className="fgroup">
          <div className="fg-label">{g.label}</div>
          {(g.files || []).map((f) => (
            f.url
              ? <a key={f.id} className="file" href={f.url} target="_blank" rel="noreferrer">{f.name}</a>
              : <span key={f.id} className="file nolink">{f.name}</span>
          ))}
        </div>
      ))}
      <style jsx>{`
        .fgroup { margin-bottom: 16px; }
        .fg-label { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
        .file { display: block; color: var(--text-link); font-size: 13.5px; padding: 7px 0; border-bottom: 1px solid var(--border-soft); text-decoration: none; }
        .file:hover { text-decoration: underline; }
        .file.nolink { color: var(--text-faint); }
      `}</style>
    </div>
  );
}
