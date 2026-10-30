"use client";
/**
 * Pagina Reports — analiză peste /api/pc/v1/reports (date REALE). 4 secțiuni:
 *   Overview (KPI + status breakdown donut + top slujitori) · Persoană (cerința-stea:
 *   slujiri/accept/decline/decline-după-accept + blockouts pe lună) · Songs (usage/CCLI)
 *   · Blockouts (pe persoană). Presets de interval (Luna/Anul/90z/12 luni) + custom.
 *
 * AI GLOBAL (§10): pagina își înregistrează o „suprafață" (useAiSurface) — AI-ul vede ce
 * secțiune/interval/persoană e activă și poate acționa prin ACELEAȘI funcții ca un click
 * uman (schimbă secțiunea, intervalul, alege o persoană). Nicio logică AI hardcodată;
 * doar poarta — gata să primească funcționalitate reală când/dacă o adăugăm.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reportsApi, peopleApi } from "@/lib/api/client";
import Skeleton from "@/components/ui/Skeleton";
import { useAiSurface } from "@/lib/ai/useAiSurface";
import { StatCard, Donut, Legend, ColumnChart, BarList } from "@/components/reports/Charts";
import BlockedPeopleModal from "@/components/people/BlockedPeopleModal";

const MONTHS_SHORT = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"];
const monthLabel = (ym) => { const [y, m] = String(ym).split("-"); return `${MONTHS_SHORT[(+m || 1) - 1]} '${String(y).slice(2)}`; };
const iso = (d) => d.toISOString().slice(0, 10);

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "person", label: "Persoană" },
  { id: "songs", label: "Cântece" },
  { id: "blockouts", label: "Blockouts" },
];
const PRESETS = [
  { id: "month", label: "Luna" },
  { id: "year", label: "Anul" },
  { id: "90d", label: "90 zile" },
  { id: "12m", label: "12 luni" },
];

function presetRange(preset) {
  const to = new Date();
  const from = new Date();
  if (preset === "month") from.setDate(1);
  else if (preset === "year") { from.setMonth(0); from.setDate(1); }
  else if (preset === "90d") from.setDate(from.getDate() - 90);
  else { from.setFullYear(from.getFullYear() - 1); } // 12m
  return { from: iso(from), to: iso(to) };
}

export default function ReportsPage() {
  const [tab, setTab] = useState("overview");
  const [preset, setPreset] = useState("12m");
  const { from, to } = useMemo(() => presetRange(preset), [preset]);

  const [overview, setOverview] = useState(null);
  const [songs, setSongs] = useState(null);
  const [blockouts, setBlockouts] = useState(null);
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [blockedCount, setBlockedCount] = useState(null); // null = fără drept/necunoscut → ascuns
  const [blockedOpen, setBlockedOpen] = useState(false);

  // person picker
  const [pq, setPq] = useState("");
  const [pres, setPres] = useState([]);
  const [pbusy, setPbusy] = useState(false);
  const pdebounce = useRef(null);

  const loadTab = useCallback(async () => {
    setErr(""); setLoading(true);
    try {
      if (tab === "overview") setOverview(await reportsApi.overview({ from, to }));
      else if (tab === "songs") setSongs(await reportsApi.songs({ from, to }));
      else if (tab === "blockouts") setBlockouts(await reportsApi.blockouts({ from, to }));
      else if (tab === "person" && person?.person?.id) setPerson(await reportsApi.person(person.person.id, { from, to }));
    } catch (e) { setErr(e?.message || "Eroare la raport."); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, from, to]);

  useEffect(() => { loadTab(); }, [loadTab]);

  // „Blocați acum" — doar dacă ai dreptul (scheduler); altfel rămâne ascuns.
  const loadBlocked = useCallback(() => { peopleApi.blocked().then((r) => setBlockedCount(r.total || 0)).catch(() => setBlockedCount(null)); }, []);
  useEffect(() => { loadBlocked(); }, [loadBlocked]);

  // căutare persoane (debounce)
  useEffect(() => {
    if (tab !== "person") return;
    if (pdebounce.current) clearTimeout(pdebounce.current);
    if (!pq.trim()) { setPres([]); return; }
    pdebounce.current = setTimeout(async () => {
      setPbusy(true);
      try { const r = await peopleApi.list({ search: pq.trim(), limit: 8 }); setPres(r.results || []); }
      catch { setPres([]); }
      finally { setPbusy(false); }
    }, 280);
    return () => pdebounce.current && clearTimeout(pdebounce.current);
  }, [pq, tab]);

  const selectPersonById = useCallback(async (id) => {
    setErr(""); setLoading(true); setPres([]); setPq("");
    try { setPerson(await reportsApi.person(id, { from, to })); }
    catch (e) { setErr(e?.message || "Eroare la raport."); }
    finally { setLoading(false); }
  }, [from, to]);

  // ─── AI surface (global §10): ce vede AI aici + ce poate face (aceleași funcții ca un click) ───
  useAiSurface({
    id: "reports",
    label: "Rapoarte",
    scope: "page",
    getContext: () => ({
      tab, range: { preset, from, to },
      selectedPerson: person?.person?.name || null,
      overview: overview && { plans: overview.plansCount, assignments: overview.assignmentsCount, topServed: (overview.topServed || []).slice(0, 3).map((t) => `${t.name} (${t.count})`) },
      songsTop: (songs?.songs || []).slice(0, 3).map((s) => `${s.title} (${s.plans})`),
    }),
    actions: [
      { id: "setTab", label: "Schimbă secțiunea", description: "overview | person | songs | blockouts", params: { tab: "string" }, run: ({ tab: t }) => TABS.some((x) => x.id === t) && setTab(t) },
      { id: "setRange", label: "Schimbă intervalul", description: "month | year | 90d | 12m", params: { preset: "string" }, run: ({ preset: p }) => PRESETS.some((x) => x.id === p) && setPreset(p) },
      { id: "selectPerson", label: "Analizează o persoană", description: "caută după nume și deschide raportul ei", params: { name: "string" },
        run: async ({ name }) => { const r = await peopleApi.list({ search: String(name || "").trim(), limit: 1 }); const hit = (r.results || [])[0]; if (hit) { setTab("person"); await selectPersonById(hit.id); return { ok: true, picked: hit.id }; } return { ok: false, message: "Nicio persoană găsită." }; } },
    ],
  }, [tab, preset, from, to, person, overview, songs]);

  return (
    <div className="rep pc-pad">
      <div className="rep-head">
        <h1>Rapoarte</h1>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.id} className={`chip ${preset === p.id ? "on" : ""}`} onClick={() => setPreset(p.id)}>{p.label}</button>
          ))}
        </div>
        {blockedCount != null && (
          <button className="rep-blocked" onClick={() => setBlockedOpen(true)} title="Oameni blocați acum">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            Blocați{blockedCount ? <span className="rb-n">{blockedCount}</span> : null}
          </button>
        )}
      </div>
      <div className="range-note">{from} → {to}</div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>

      {err ? <div className="err">{err}</div> : null}
      {loading ? <Skeleton lines={6} /> : (
        <>
          {tab === "overview" && overview && <OverviewView d={overview} />}
          {tab === "songs" && songs && <SongsView d={songs} />}
          {tab === "blockouts" && blockouts && <BlockoutsView d={blockouts} />}
          {tab === "person" && (
            <PersonView d={person} pq={pq} setPq={setPq} pres={pres} pbusy={pbusy} onPick={selectPersonById} />
          )}
        </>
      )}

      {blockedOpen && <BlockedPeopleModal onClose={() => setBlockedOpen(false)} onChanged={loadBlocked} />}

      <style jsx>{`
        .rep { padding-top: 18px; padding-bottom: 60px; }
        .rep-head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        h1 { font-size: var(--fs-h1); margin: 0; font-weight: 700; }
        .presets { display: flex; gap: 6px; margin-left: auto; }
        .chip { height: 30px; padding: 0 13px; border-radius: 15px; border: 1px solid var(--border-strong);
          background: var(--surface-2); color: var(--text-dim); font-size: 12.5px; cursor: pointer; }
        .chip:hover { color: var(--text); }
        .chip.on { background: var(--primary); border-color: var(--primary); color: var(--primary-ink); font-weight: 600; }
        .rep-blocked { display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 13px; border-radius: 6px;
          background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); font-size: 12.5px; cursor: pointer; transition: color .12s, border-color .12s; }
        .rep-blocked:hover { color: var(--text); border-color: var(--product); }
        .rb-n { background: rgba(229,83,75,.16); color: #f0a7a2; border-radius: 10px; padding: 0 7px; font-size: 11px; font-weight: 600; }
        .range-note { color: var(--text-faint); font-size: 12px; margin-top: 6px; }
        .tabs { display: flex; gap: 4px; margin: 16px 0 20px; border-bottom: 1px solid var(--border); }
        .tab { background: transparent; border: none; color: var(--text-dim); font-size: 13.5px; padding: 10px 16px; cursor: pointer;
          border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .tab:hover { color: var(--text); }
        .tab.on { color: var(--text); border-bottom-color: var(--primary); font-weight: 600; }
        .err { background: rgba(229,83,75,.12); border: 1px solid var(--danger); color: #f0a9a4; padding: 10px 14px; border-radius: var(--radius); margin-bottom: 14px; }
        .muted { color: var(--text-faint); font-size: 14px; padding: 30px 0; }
      `}</style>
    </div>
  );
}

/* ───────── Overview ───────── */
function OverviewView({ d }) {
  const sb = d.statusBreakdown || {};
  const segs = [
    { label: "Confirmate", value: sb.confirmed || 0, color: "var(--st-confirmed)" },
    { label: "În așteptare", value: sb.unconfirmed || 0, color: "var(--st-unconfirmed)" },
    { label: "Refuzate", value: sb.declined || 0, color: "var(--st-declined)" },
  ];
  const top = (d.topServed || []).map((t) => ({ label: t.name, value: t.count }));
  return (
    <div className="ov">
      <div className="kpis">
        <StatCard label="Planuri" value={d.plansCount} color="var(--text)" />
        <StatCard label="Asignări" value={d.assignmentsCount} color="var(--primary)" />
        <StatCard label="Cântece folosite" value={d.songsUsed} color="var(--product)" />
        <StatCard label="Blockouts active" value={d.blockoutsCount} color="var(--st-declined)" />
      </div>
      <div className="grid2">
        <section className="panel">
          <h3>Status asignări</h3>
          <div className="donut-row">
            <Donut segments={segs} centerLabel="Total" />
            <Legend items={segs.map((s) => ({ label: s.label, color: s.color, value: s.value }))} />
          </div>
        </section>
        <section className="panel">
          <h3>Top slujitori (confirmate)</h3>
          <BarList rows={top} color="var(--product)" />
        </section>
      </div>
      <style jsx>{`
        .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
        .panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; }
        .panel h3 { margin: 0 0 14px; font-size: 14px; font-weight: 600; }
        .donut-row { display: flex; align-items: center; gap: 24px; }
        @media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, 1fr); } .grid2 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

/* ───────── Songs ───────── */
function SongsView({ d }) {
  const rows = (d.songs || []).map((s) => ({ label: s.title || "—", value: s.plans, sub: [s.author, s.ccli ? `CCLI ${s.ccli}` : ""].filter(Boolean).join(" · ") }));
  return (
    <section className="panel">
      <h3>Utilizare cântece — {d.total} titluri (bază copy CCLI)</h3>
      <BarList rows={rows} color="var(--primary)" valueSuffix=" pl." />
      <style jsx>{`
        .panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; }
        .panel h3 { margin: 0 0 14px; font-size: 14px; font-weight: 600; }
      `}</style>
    </section>
  );
}

/* ───────── Blockouts ───────── */
function BlockoutsView({ d }) {
  const people = d.people || [];
  return (
    <section className="panel">
      <h3>Blockouts pe persoană — {people.length} persoane</h3>
      {people.length === 0 ? <div className="muted">Niciun blockout în interval.</div> : (
        <div className="bo-list">
          {people.map((p) => (
            <div key={p.personId} className="bo-row">
              <div className="bo-head"><span className="bo-name">{p.name}</span><span className="bo-count">{p.items.length}</span></div>
              <div className="bo-items">
                {p.items.map((it, i) => (
                  <span key={i} className="bo-chip" title={it.reason || ""}>{it.startDate}{it.endDate !== it.startDate ? ` → ${it.endDate}` : ""}{it.repeat && it.repeat !== "none" ? ` (${it.repeat})` : ""}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <style jsx>{`
        .panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; }
        .panel h3 { margin: 0 0 14px; font-size: 14px; font-weight: 600; }
        .muted { color: var(--text-faint); font-size: 13px; }
        .bo-list { display: flex; flex-direction: column; gap: 14px; }
        .bo-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .bo-name { font-size: 13.5px; font-weight: 600; }
        .bo-count { background: var(--surface-3); color: var(--text-dim); font-size: 11px; padding: 1px 8px; border-radius: 10px; }
        .bo-items { display: flex; flex-wrap: wrap; gap: 6px; }
        .bo-chip { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); font-size: 11.5px; padding: 3px 9px; border-radius: 12px; }
      `}</style>
    </section>
  );
}

/* ───────── Persoană (cerința-stea) ───────── */
function PersonView({ d, pq, setPq, pres, pbusy, onPick }) {
  const t = d?.totals;
  const monthBars = d ? Object.entries(d.servedByMonth || {}).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => ({ label: monthLabel(k), value: v })) : [];
  return (
    <div className="pv">
      <div className="picker">
        <input className="input" placeholder="Caută o persoană după nume…" value={pq} onChange={(e) => setPq(e.target.value)} />
        {pbusy ? <span className="p-busy">…</span> : null}
        {pres.length > 0 && (
          <ul className="p-results">
            {pres.map((p) => (
              <li key={p.id}><button onClick={() => onPick(p.id)}>{[p.firstName, p.lastName].filter(Boolean).join(" ")}{p.email ? <span className="p-mail"> · {p.email}</span> : null}</button></li>
            ))}
          </ul>
        )}
      </div>

      {!d ? <div className="muted">Caută și alege o persoană ca să vezi analiza ei.</div> : (
        <>
          <div className="pv-name">{d.person.name}{d.person.email ? <span className="pv-mail"> · {d.person.email}</span> : null}</div>
          <div className="kpis">
            <StatCard label="Programări" value={t.scheduled} />
            <StatCard label="Slujite" value={t.served} color="var(--st-confirmed)" />
            <StatCard label="În așteptare" value={t.pending} color="var(--st-unconfirmed)" />
            <StatCard label="Refuzate" value={t.declinedPlain} color="var(--st-declined)" />
            <StatCard label="Refuz după accept" value={t.declinedAfterConfirm} color="var(--danger)" hint="a acceptat apoi a refuzat" />
            <StatCard label="Blockouts" value={t.blockouts} color="var(--text-dim)" />
          </div>
          <div className="grid2">
            <section className="panel">
              <h3>Slujiri pe lună</h3>
              <ColumnChart bars={monthBars} color="var(--product)" />
            </section>
            <section className="panel">
              <h3>Ultimele programări</h3>
              <ul className="recent">
                {(d.recent || []).length === 0 ? <li className="muted">—</li> : d.recent.map((r, i) => (
                  <li key={i}>
                    <span className={`pill ${r.status}`} />
                    <span className="r-date">{r.dateLabel}</span>
                    <span className="r-pos">{r.positionName}</span>
                    <span className="r-st">{r.serviceTypeName}</span>
                    {r.declinedAfterConfirm ? <span className="r-flag">refuz după accept</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}

      <style jsx>{`
        .picker { position: relative; max-width: 460px; margin-bottom: 18px; }
        .p-busy { position: absolute; right: 10px; top: 8px; color: var(--text-faint); }
        .p-results { list-style: none; margin: 4px 0 0; padding: 4px; position: absolute; z-index: 5; left: 0; right: 0;
          background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: var(--radius); box-shadow: 0 12px 32px rgba(0,0,0,.4); }
        .p-results li button { width: 100%; text-align: left; background: transparent; border: none; color: var(--text); padding: 8px 10px; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; }
        .p-results li button:hover { background: var(--surface-2); }
        .p-mail { color: var(--text-faint); font-size: 12px; }
        .muted { color: var(--text-faint); font-size: 14px; padding: 20px 0; }
        .pv-name { font-size: 17px; font-weight: 700; margin-bottom: 14px; }
        .pv-mail { color: var(--text-faint); font-size: 13px; font-weight: 400; }
        .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
        .panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; }
        .panel h3 { margin: 0 0 14px; font-size: 14px; font-weight: 600; }
        .recent { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; max-height: 260px; overflow: auto; }
        .recent li { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--text-dim); }
        .pill { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--text-faint); }
        .pill.confirmed { background: var(--st-confirmed); }
        .pill.unconfirmed { background: var(--st-unconfirmed); }
        .pill.declined { background: var(--st-declined); }
        .r-date { color: var(--text); min-width: 96px; }
        .r-pos { color: var(--text); }
        .r-st { color: var(--text-faint); margin-left: auto; }
        .r-flag { color: var(--danger); font-size: 11px; }
        @media (max-width: 1100px) { .kpis { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px) { .grid2 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
