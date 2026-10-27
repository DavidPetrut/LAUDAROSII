"use client";
/**
 * Profil persoană — ecranul „Person" din PCO (screenshot). /api/pc/v1/people/:id (+ /teams /schedule /blockouts /messages).
 * Header (avatar+nume+email+rol) + tab-uri Scheduling / Communication / Details.
 * Scheduling: rezumat status + program viitor (blockouts roșu) + panou Teams (tag-uri poziții).
 */
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { peopleApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }) : "");

export default function PersonPage() {
  const router = useRouter();
  const { id } = useParams();
  const [tab, setTab] = useState("Scheduling");
  const [p, setP] = useState(null);
  const [teams, setTeams] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [blockouts, setBlockouts] = useState([]);
  const [onBreak, setOnBreak] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [cb, setCb] = useState({ start: "", end: "", reason: "" });
  const [cbBusy, setCbBusy] = useState(false);
  const [msgs, setMsgs] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [canSched, setCanSched] = useState(false); // doar schedulerii văd/administrează blocajele

  const load = useCallback(async () => {
    try {
      const [prof, t, s, b] = await Promise.all([peopleApi.get(id), peopleApi.teams(id), peopleApi.schedule(id), peopleApi.blockouts(id)]);
      setP(prof); setTeams(t.teams || []); setSchedule(s.schedule || []); setBlockouts(b.blockouts || []); setOnBreak(!!b.onBreak);
    } catch (e) { setErr(e?.message || "Eroare."); }
    finally { setLoading(false); }
  }, [id]);

  async function saveGender(g) {
    setP((prev) => ({ ...prev, gender: g })); // optimist
    try { await peopleApi.update(id, { gender: g }); } catch (e) { setErr(e?.message || "Eroare la gen."); }
  }
  async function saveStatus(s) {
    const prev = p?.schedulingStatus;
    setP((x) => ({ ...x, schedulingStatus: s })); // optimist
    setStatusBusy(true);
    try { await peopleApi.update(id, { schedulingStatus: s }); }
    catch (e) { setP((x) => ({ ...x, schedulingStatus: prev })); setErr(e?.message || "Eroare la status."); }
    finally { setStatusBusy(false); }
  }
  async function addChurchBlock() {
    setCbBusy(true);
    try {
      await peopleApi.setChurchBlock(id, { startDate: cb.start || undefined, endDate: cb.end || undefined, reason: cb.reason });
      setCb({ start: "", end: "", reason: "" }); await load();
    } catch (e) { setErr(e?.message || "Eroare la blocaj."); }
    finally { setCbBusy(false); }
  }
  async function liftChurchBlock() {
    setCbBusy(true);
    try { await peopleApi.clearChurchBlock(id); await load(); }
    catch (e) { setErr(e?.message || "Eroare la ridicare."); }
    finally { setCbBusy(false); }
  }
  function presetEnd(months) {
    const today = new Date().toISOString().slice(0, 10);
    if (!months) { setCb((s) => ({ ...s, start: s.start || today, end: "" })); return; } // nelimitat
    const d = new Date(); d.setMonth(d.getMonth() + months);
    setCb((s) => ({ ...s, start: s.start || today, end: d.toISOString().slice(0, 10) }));
  }
  useEffect(() => { load(); }, [load]);
  useEffect(() => { peopleApi.me().then((r) => setCanSched(!!r?.capabilities?.schedule)).catch(() => {}); }, []);
  useEffect(() => { if (tab === "Communication" && !msgs) peopleApi.messages(id).then(setMsgs).catch(() => {}); }, [tab, id, msgs]);

  const confirmed = schedule.filter((s) => s.status === "confirmed").length;
  const unconfirmed = schedule.filter((s) => s.status === "unconfirmed").length;

  // rânduri program: programări + blockouts, sortate pe dată
  const blockoutRows = blockouts.map((b) => ({ type: "blockout", kind: b.type || "personal", dateLabel: b.label, sortDate: b.startDate, reason: b.reason }));
  const schedRows = schedule.map((s) => ({ type: "sched", ...s }));
  const rows = [...schedRows, ...blockoutRows].sort((a, b) => new Date(a.sortDate || a.startDate || 0) - new Date(b.sortDate || b.startDate || 0));

  const schedStatus = p?.schedulingStatus || "available";
  const churchBlocks = blockouts.filter((b) => b.type === "churchBlock");
  const STATUS_LABEL = { onBreak: "Pauză", suspended: "Suspendat" };

  useAiSurface({
    id: "people.profile", label: "Profil persoană", scope: "page",
    getContext: () => ({ id, name: p?.fullName, tab, confirmed, unconfirmed, teams: teams.length }),
    actions: [{ id: "tab", label: "Schimbă tab", params: { name: "string" }, run: ({ name }) => setTab(name) }],
  }, [id, p, tab, confirmed, unconfirmed, teams]);

  if (loading) return <div className="wrap"><div className="muted">Se încarcă…</div></div>;
  if (err) return <div className="wrap"><div className="err">{err}</div></div>;

  return (
    <div className="wrap pc-full pc-pad">
      <div className="head">
        <button className="back" onClick={() => router.push("/people")}>‹</button>
        {p?.avatar ? <img src={p.avatar} className="av" alt="" /> : <span className="av ini">{p?.initials}</span>}
        <div className="htext">
          <h1>{p?.fullName}</h1>
          <div className="email">{p?.email}</div>
        </div>
        {canSched && schedStatus !== "available" && <span className={`statusbadge ${schedStatus}`} title="Ascuns din listele de planificare">{STATUS_LABEL[schedStatus]}</span>}
        {canSched && onBreak && <span className="breakbadge" title="Nu apare în listele de planificare">Blocat de biserică</span>}
        <span className="role">{p?.permission || "Viewer"}</span>
      </div>

      <div className="tabs">{["Scheduling", "Communication", "Details"].map((t) => <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</div>

      {tab === "Scheduling" && (
        <div className="cols">
          <div className="colmain">
            <div className="card">
              <div className="card-h">Schedule</div>
              <div className="status">
                <div className="donut" style={{ ["--p"]: `${schedule.length ? Math.round(confirmed / schedule.length * 100) : 0}` }}><span>Status</span></div>
                <div className="stnums">
                  <div><b className="ok">{confirmed}</b> CONFIRMED</div>
                  <div><b className="un">{unconfirmed}</b> UNCONFIRMED</div>
                  <div><b className="no">0</b> DECLINED</div>
                </div>
              </div>
              <div className="sl-label">PROGRAM VIITOR</div>
              {rows.length === 0 && <div className="muted">Nimic programat.</div>}
              {rows.map((r, i) => (
                <div key={i} className={`srow ${r.type === "blockout" ? (r.kind === "churchBlock" ? "church" : "blk") : ""}`} onClick={() => r.planId && router.push(`/plans/${r.planId}`)}>
                  <span className="sr-ic">{r.type === "blockout" ? (r.kind === "churchBlock" ? "🔵" : "⛔") : (r.status === "confirmed" ? "✅" : "❔")}</span>
                  <span className="sr-date">{r.dateLabel}</span>
                  <span className="sr-main">{r.type === "blockout" ? (r.kind === "churchBlock" ? `Blocaj biserică${r.reason ? " · " + r.reason : ""}` : `Blockout${r.reason ? " · " + r.reason : ""}`) : r.serviceTypeName}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="colside">
            {canSched && (
              <div className="card">
                <div className="card-h">Disponibilitate</div>
                <div className="av-sec">
                  <div className="av-l">Status de planificare</div>
                  <div className="seg">
                    {[["available", "Disponibil"], ["onBreak", "Pauză"], ["suspended", "Suspendat"]].map(([v, l]) => (
                      <button key={v} className={`seg-b ${schedStatus === v ? `on ${v}` : ""}`} disabled={statusBusy} onClick={() => saveStatus(v)}>{l}</button>
                    ))}
                  </div>
                  {schedStatus !== "available" && <div className="av-note">Ascuns din toate listele de planificare.</div>}
                </div>
                <div className="av-div" />
                <div className="av-sec">
                  <div className="av-l">Blocaj de biserică</div>
                  {churchBlocks.length > 0 ? (
                    <div className="cb-active">
                      {churchBlocks.map((b) => (
                        <div key={b.id} className="cb-item"><span className="cb-dot" />{b.label}{b.reason ? ` · ${b.reason}` : ""}</div>
                      ))}
                      <button className="brk-b on" disabled={cbBusy} onClick={liftChurchBlock}>{cbBusy ? "…" : "Ridică blocajul"}</button>
                    </div>
                  ) : (
                    <div className="cb-form">
                      <div className="cb-presets">
                        {[["1 lună", 1], ["3 luni", 3], ["6 luni", 6], ["Nelimitat", 0]].map(([l, m]) => (
                          <button key={l} type="button" className="cb-preset" onClick={() => presetEnd(m)}>{l}</button>
                        ))}
                      </div>
                      <div className="cb-row">
                        <label>De la<input type="date" value={cb.start} onChange={(e) => setCb((s) => ({ ...s, start: e.target.value }))} /></label>
                        <label>Până la<input type="date" value={cb.end} onChange={(e) => setCb((s) => ({ ...s, end: e.target.value }))} /></label>
                      </div>
                      <input className="cb-reason" placeholder="Motiv (opțional)" value={cb.reason} onChange={(e) => setCb((s) => ({ ...s, reason: e.target.value }))} />
                      <button className="brk-b" disabled={cbBusy} onClick={addChurchBlock}>{cbBusy ? "…" : "Blochează"}</button>
                      <div className="av-note">Fără „Până la" = nelimitat. Se deblochează automat la expirare.</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="card">
              <div className="card-h">Teams</div>
              {teams.length === 0 && <div className="muted">Nicio echipă.</div>}
              {teams.map((t, i) => (
                <div key={i} className="team">
                  <div className="tname">{t.teamName}{t.isLeader ? <span className="leader">lider</span> : null}</div>
                  <div className="tst">{t.serviceTypeName}</div>
                  <div className="tags">{(t.positions || []).map((pos, pi) => <span key={pi} className="tag">{pos}</span>)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Communication" && (
        <div className="card">
          <div className="card-h">Mesaje</div>
          {!msgs ? <div className="muted">Se încarcă…</div> : (msgs.received || []).length === 0 ? <div className="muted">Niciun mesaj.</div> :
            (msgs.received || []).map((m) => (
              <div key={m.id} className={`msg ${m.read ? "" : "unread"}`}>
                <div className="m-sub">{m.subject}</div>
                <div className="m-body">{m.body}</div>
                <div className="m-date">{m.dateLabel}</div>
              </div>
            ))}
        </div>
      )}

      {tab === "Details" && (
        <div className="card">
          <div className="card-h">Detalii</div>
          <dl className="details">
            <dt>Email</dt><dd>{(p?.emails || []).map((e) => e.address).join(", ") || "—"}</dd>
            <dt>Telefon</dt><dd>{(p?.phones || []).map((e) => e.number).join(", ") || "—"}</dd>
            <dt>Gen</dt><dd>
              <select className="gsel" value={p?.gender || ""} onChange={(e) => saveGender(e.target.value)}>
                <option value="">— nesetat —</option>
                <option value="M">Masculin</option>
                <option value="F">Feminin</option>
              </select>
            </dd>
            <dt>Data nașterii</dt><dd>{fmt(p?.birthdate) || "—"}</dd>
            <dt>Status</dt><dd>{p?.status}</dd>
            <dt>Echipe</dt><dd>{p?.teamsCount ?? 0}</dd>
          </dl>
        </div>
      )}

      <style jsx>{`
        .wrap { padding: 20px 20px 60px; }
        .head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
        .back { background: transparent; border: none; color: var(--text-dim); font-size: 22px; cursor: pointer; }
        .av { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
        .av.ini { background: #3a4552; color: #fff; font-size: 22px; display: inline-flex; align-items: center; justify-content: center; }
        .htext { flex: 1; } .htext h1 { margin: 0; font-size: 22px; } .email { color: var(--text-dim); font-size: 13px; }
        .role { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; padding: 5px 12px; font-size: 12.5px; }
        .breakbadge { background: rgba(47,129,247,.14); border: 1px solid var(--primary); color: #9cc4f5; border-radius: 20px; padding: 5px 12px; font-size: 12px; font-weight: 600; }
        .brk { display: flex; flex-direction: column; gap: 10px; }
        .brk-t { color: var(--text-dim); font-size: 12.5px; line-height: 1.4; }
        .brk-b { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 13px; }
        .brk-b:hover { border-color: var(--primary); }
        .brk-b.on { border-color: var(--primary); color: #9cc4f5; background: rgba(47,129,247,.1); }
        .brk-b:disabled { opacity: .6; cursor: default; }
        .statusbadge { border-radius: 20px; padding: 5px 12px; font-size: 12px; font-weight: 600; border: 1px solid; }
        .statusbadge.onBreak { background: rgba(201,162,39,.14); border-color: #c9a227; color: #e0c977; }
        .statusbadge.suspended { background: rgba(229,83,75,.14); border-color: var(--danger); color: #f0a7a2; }
        .av-sec { display: flex; flex-direction: column; gap: 8px; }
        .av-l { color: var(--text-faint); font-size: 10.5px; letter-spacing: .4px; text-transform: uppercase; }
        .av-note { color: var(--text-faint); font-size: 11.5px; line-height: 1.4; }
        .av-div { height: 1px; background: var(--border); margin: 14px 0; }
        .seg { display: flex; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 8px; padding: 2px; gap: 2px; }
        .seg-b { flex: 1; background: transparent; border: none; color: var(--text-dim); font-size: 12.5px; padding: 7px 0; border-radius: 6px; cursor: pointer; transition: background .13s, color .13s; }
        .seg-b:hover { color: var(--text); }
        .seg-b.on { color: #fff; font-weight: 600; }
        .seg-b.on.available { background: var(--product); }
        .seg-b.on.onBreak { background: #c9a227; }
        .seg-b.on.suspended { background: var(--danger); }
        .seg-b:disabled { cursor: default; }
        .cb-active { display: flex; flex-direction: column; gap: 8px; }
        .cb-item { display: flex; align-items: center; gap: 8px; color: #9cc4f5; font-size: 12.5px; }
        .cb-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--primary); flex: none; }
        .cb-form { display: flex; flex-direction: column; gap: 9px; }
        .cb-presets { display: flex; gap: 6px; flex-wrap: wrap; }
        .cb-preset { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 14px; padding: 4px 11px; font-size: 12px; cursor: pointer; transition: color .12s, border-color .12s; }
        .cb-preset:hover { color: var(--text); border-color: var(--primary); }
        .cb-row { display: flex; gap: 10px; }
        .cb-row label { flex: 1; display: flex; flex-direction: column; gap: 4px; color: var(--text-faint); font-size: 11px; }
        .cb-row input, .cb-reason { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 32px; padding: 0 9px; font-size: 12.5px; outline: none; font-family: inherit; }
        .cb-row input:focus, .cb-reason:focus { border-color: var(--primary); }
        .tabs { display: flex; gap: 20px; border-bottom: 1px solid var(--border); margin-bottom: 18px; }
        .tab { background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; padding: 9px 2px; color: var(--text-dim); cursor: pointer; font-size: 14px; }
        .tab.active { color: var(--text); border-bottom-color: var(--primary); font-weight: 600; }
        .cols { display: grid; grid-template-columns: 1fr 360px; gap: 18px; align-items: start; }
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .card-h { font-size: 15px; font-weight: 600; margin-bottom: 14px; }
        .status { display: flex; align-items: center; gap: 22px; margin-bottom: 18px; }
        .donut { width: 92px; height: 92px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: conic-gradient(var(--product) calc(var(--p) * 1%), var(--surface-2) 0); }
        .donut span { width: 70px; height: 70px; border-radius: 50%; background: var(--surface); display: flex; align-items: center; justify-content: center; color: var(--text-dim); font-size: 12px; }
        .stnums div { font-size: 12.5px; color: var(--text-faint); margin: 3px 0; }
        .stnums b { font-size: 15px; margin-right: 6px; } .stnums .ok { color: var(--product); } .stnums .un { color: #c9a227; } .stnums .no { color: var(--danger); }
        .sl-label { color: var(--text-faint); font-size: 11px; letter-spacing: .5px; margin: 10px 0 6px; }
        .srow { display: flex; align-items: center; gap: 12px; padding: 9px 4px; border-bottom: 1px solid var(--border-soft); cursor: pointer; font-size: 13.5px; }
        .srow:hover { background: var(--row-hover); } .srow.blk { color: var(--danger); } .srow.church { color: #9cc4f5; }
        .sr-date { width: 100px; color: var(--text-dim); } .sr-main { color: var(--text); }
        .team { padding: 10px 0; border-bottom: 1px solid var(--border-soft); }
        .tname { color: var(--text); font-weight: 600; font-size: 13.5px; } .leader { margin-left: 8px; font-size: 10px; color: var(--product); border: 1px solid var(--product); border-radius: 4px; padding: 0 5px; }
        .tst { color: var(--text-faint); font-size: 11.5px; margin: 2px 0 7px; }
        .tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .tag { background: var(--surface-2); border: 1px solid var(--border); border-radius: 4px; padding: 2px 8px; font-size: 11.5px; color: var(--text-dim); }
        .msg { padding: 10px 0; border-bottom: 1px solid var(--border-soft); } .msg.unread .m-sub { font-weight: 700; }
        .m-sub { color: var(--text); font-size: 13.5px; } .m-body { color: var(--text-dim); font-size: 12.5px; margin: 3px 0; } .m-date { color: var(--text-faint); font-size: 11px; }
        .details { display: grid; grid-template-columns: 140px 1fr; gap: 10px 14px; margin: 0; }
        .details dt { color: var(--text-faint); font-size: 12.5px; } .details dd { color: var(--text); font-size: 13.5px; margin: 0; }
        .gsel { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 30px; padding: 0 8px; font-size: 13px; }
        .muted { color: var(--text-faint); font-size: 13px; padding: 8px 0; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; }
        @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
