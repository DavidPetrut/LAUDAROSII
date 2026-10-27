"use client";
/**
 * Pagina People — tab-ul „People" din PCO Services.
 * Nivel 1 = taburi „părinte" (breadcrumb animat), nivel 2 = lucrările reale, nivel 3 = poziții → roster.
 * „Toate" = tabelul plat; acțiunile (slujire/profil) apar la HOVER în stânga; „Filtre" = alegi coloanele
 * vizibile (SIM, Sex opționale). Click pe rând = profil. Date REALE din /api/pc/v1/people.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { peopleApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";
import BlockedPeopleModal from "@/components/people/BlockedPeopleModal";
import MinistryBoard from "@/components/people/MinistryBoard";
import QuickAssignModal from "@/components/people/QuickAssignModal";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

// coloane opționale (cele de bază apar mereu); ordinea din tabel e fixă
const OPT_COLS = [
  { key: "sim", label: "SIM (1 / 2)" },
  { key: "sex", label: "Sex (F / M)" },
];

export default function PeoplePage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [sortBy, setSortBy] = useState("firstName");
  const [dir, setDir] = useState("asc");
  const [parent, setParent] = useState("");
  const [group, setGroup] = useState("");
  const [ministries, setMinistries] = useState([]);
  const [parents, setParents] = useState([]);
  const [quickFor, setQuickFor] = useState(null);
  const [canBlock, setCanBlock] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [blockedIds, setBlockedIds] = useState(() => new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cols, setCols] = useState(() => {
    try { const s = JSON.parse(sessionStorage.getItem("pc.pcols")); return new Set(Array.isArray(s) ? s : ["sim"]); } catch { return new Set(["sim"]); }
  });
  const limit = 40;
  const tRef = useRef(null);

  const showSim = cols.has("sim"), showSex = cols.has("sex");
  const gridCols = `44px 150px 150px 230px 140px ${showSim ? "84px " : ""}110px 120px ${showSex ? "64px " : ""}1fr`;
  const toggleCol = (k) => setCols((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); try { sessionStorage.setItem("pc.pcols", JSON.stringify([...n])); } catch {} return n; });

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const r = await peopleApi.list({ q: query, page: p, limit, sortBy, dir });
      setRows(r.results || []); setTotal(r.total || 0); setHasMore(!!r.hasMore); setErr("");
    } catch (e) { setErr(e?.message || "Eroare la încărcare."); }
    finally { setLoading(false); }
  }, [query, page, sortBy, dir]);
  useEffect(() => { if (parent === "") load(page); /* eslint-disable-line */ }, [page, sortBy, dir, parent]);

  const loadMinistries = useCallback(() => {
    peopleApi.ministries().then((r) => { setMinistries(r.ministries || []); setParents(r.groups || []); }).catch(() => {});
  }, []);
  useEffect(() => { loadMinistries(); }, [loadMinistries]);

  const childMinistries = useMemo(() => (parent ? ministries.filter((m) => m.group === parent) : []), [ministries, parent]);
  const activeMinistry = useMemo(() => ministries.find((m) => m.name === group) || null, [ministries, group]);

  useEffect(() => {
    if (parent === "") { setGroup(""); return; }
    const kids = ministries.filter((m) => m.group === parent);
    if (kids.length && !kids.some((m) => m.name === group)) setGroup(kids[0].name);
    // eslint-disable-next-line
  }, [parent, ministries]);

  const loadBlockedCount = useCallback(() => {
    peopleApi.blocked().then((r) => { setBlockedCount(r.total || 0); setBlockedIds(new Set((r.blocked || []).map((x) => String(x.id)))); }).catch(() => {});
  }, []);
  useEffect(() => {
    peopleApi.me().then((r) => { if (r?.capabilities?.manageBlocks) { setCanBlock(true); loadBlockedCount(); } }).catch(() => {});
  }, [loadBlockedCount]);

  useEffect(() => {
    if (parent !== "") return;
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => { setPage(1); load(1); }, 300);
    return () => clearTimeout(tRef.current);
    // eslint-disable-next-line
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const sort = (field) => { if (sortBy === field) setDir(dir === "asc" ? "desc" : "asc"); else { setSortBy(field); setDir("asc"); } setPage(1); };

  useAiSurface({
    id: "people.list",
    label: "People — lista de oameni",
    scope: "page",
    getContext: () => ({ query, total, page, afișate: rows.length, parent, group }),
    actions: [
      { id: "search", label: "Caută persoană", params: { q: "string" }, run: ({ q }) => { setParent(""); setQuery(q || ""); } },
      { id: "open", label: "Deschide profil", params: { id: "string" }, run: ({ id }) => router.push(`/people/${id}`) },
    ],
  }, [query, total, page, rows, parent, group]);

  const openProfile = (id) => router.push(`/people/${id}`);

  return (
    <div className="people pc-full pc-pad">
      <div className="ctl">
        <div className="srch">
          <svg className="si" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input className="search" placeholder="Caută persoană…" value={query}
            onChange={(e) => { if (parent !== "") setParent(""); setQuery(e.target.value); }} />
          {query && <button className="sx" title="Șterge" onClick={() => setQuery("")}>×</button>}
        </div>

        <div className="nav">
          <button className={`crumb ${parent === "" ? "cur" : ""}`} onClick={() => setParent("")} title="Toți oamenii">Toate</button>
          {parent !== "" && (<><span className="sep">›</span><span className="crumb cur par">{parent}</span></>)}
          <div className="chips" key={parent || "root"}>
            {parent === ""
              ? parents.map((g) => (
                  <button key={g.name} className="chip" onClick={() => setParent(g.name)}>
                    {g.name}{g.memberCount ? <span className="ch-n">{g.memberCount}</span> : null}
                  </button>
                ))
              : childMinistries.map((m) => (
                  <button key={m.name} className={`chip ${group === m.name ? "on" : ""}`} onClick={() => setGroup(m.name)}>
                    {m.name}{m.memberCount ? <span className="ch-n">{m.memberCount}</span> : null}
                  </button>
                ))}
          </div>
        </div>

        <div className="gright">
          {canBlock && (
            <button className="gblocked" onClick={() => setBlockedOpen(true)} title="Oameni blocați acum">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              Blocați{blockedCount ? <span className="gb-n">{blockedCount}</span> : null}
            </button>
          )}
          {parent === "" && (
            <div className="filt-wrap">
              <button className={`gfilt ${filtersOpen ? "on" : ""}`} onClick={() => setFiltersOpen((v) => !v)} title="Coloane vizibile">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 5h18M6 12h12M10 19h4" /></svg>
                Filtre{cols.size ? <span className="gf-n">{cols.size}</span> : null}
              </button>
              {filtersOpen && (
                <>
                  <div className="filt-bd" onClick={() => setFiltersOpen(false)} />
                  <div className="filt-pop">
                    <div className="fp-h">Coloane</div>
                    <div className="fp-locked">Prenume · Nume · Email · Telefon · Permisiuni · Creat<span>(mereu)</span></div>
                    {OPT_COLS.map((c) => (
                      <button key={c.key} className={`fp-row ${cols.has(c.key) ? "on" : ""}`} onClick={() => toggleCol(c.key)}>
                        <span className={`fp-ck ${cols.has(c.key) ? "on" : ""}`}>{cols.has(c.key) ? "✓" : ""}</span>{c.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      {parent !== "" ? (
        activeMinistry ? <MinistryBoard ministry={activeMinistry} onChanged={loadMinistries} />
          : <div className="empty">Nicio lucrare în „{parent}".</div>
      ) : (
      <>
      <div className="pcount">{loading ? "…" : `${total} persoane`}</div>
      <div className="table">
        <div className="thead" style={{ gridTemplateColumns: gridCols }}>
          <div className="c-av" />
          <div className="c-fn sortable" onClick={() => sort("firstName")}>PRENUME {sortBy === "firstName" ? (dir === "asc" ? "↑" : "↓") : ""}</div>
          <div className="c-ln sortable" onClick={() => sort("lastName")}>NUME {sortBy === "lastName" ? (dir === "asc" ? "↑" : "↓") : ""}</div>
          <div className="c-em">EMAIL</div>
          <div className="c-ph">TELEFON</div>
          {showSim && <div className="c-sim">SIM</div>}
          <div className="c-pm">PERMISIUNI</div>
          <div className="c-cr">CREAT</div>
          {showSex && <div className="c-sx">SEX</div>}
          <div className="c-sp" />
        </div>
        {rows.map((p) => {
          const name = `${p.firstName || ""} ${p.lastName || ""}`.trim();
          return (
          <div key={p.id} className="trow" style={{ gridTemplateColumns: gridCols }} onClick={() => openProfile(p.id)} title="Click: deschide profilul">
            {/* bară de acțiuni la HOVER, în stânga */}
            <div className="hbar" onClick={(e) => e.stopPropagation()}>
              <button className="aic" title="Slujiri — asignează rapid"
                onClick={() => setQuickFor({ id: p.id, name, avatar: p.avatar, initials: p.initials, sim: p.sim })}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              </button>
              <button className="aic" title="Deschide profilul" onClick={() => openProfile(p.id)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>
              </button>
            </div>
            <div className="c-av">
              <span className={`avw ${blockedIds.has(String(p.id)) ? "locked" : ""}`}>
                {p.avatar ? <img src={p.avatar} alt="" className="ava" /> : <span className="ava ini">{p.initials}</span>}
                {blockedIds.has(String(p.id)) && (
                  <span className="lockc" title="Blocat — nu apare în listele de planificare">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  </span>
                )}
              </span>
            </div>
            <div className="c-fn">{p.firstName}</div>
            <div className="c-ln">{p.lastName}</div>
            <div className="c-em" title={p.email}>{p.email}</div>
            <div className="c-ph">{p.phone}</div>
            {showSim && <div className="c-sim">{p.sim ? <span className="simb">SIM {p.sim}</span> : <span className="dash">—</span>}</div>}
            <div className="c-pm">{p.permission}</div>
            <div className="c-cr">{fmtDate(p.createdAt)}</div>
            {showSex && <div className="c-sx">{p.gender === "F" ? <span className="sxb f">F</span> : p.gender === "M" ? <span className="sxb m">M</span> : <span className="dash">—</span>}</div>}
            <div className="c-sp" />
          </div>
          );
        })}
        {!loading && rows.length === 0 && <div className="empty">Nicio persoană.</div>}
      </div>

      <div className="pager">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
        <span className="pg">{page} / {totalPages}</span>
        <button disabled={!hasMore} onClick={() => setPage(page + 1)}>›</button>
      </div>
      </>
      )}

      {quickFor && (
        <QuickAssignModal person={quickFor} onClose={() => setQuickFor(null)} onChanged={loadMinistries} />
      )}

      {blockedOpen && (
        <BlockedPeopleModal onClose={() => setBlockedOpen(false)} onChanged={() => { loadBlockedCount(); load(page); }} />
      )}

      <style jsx>{`
        .people { padding: 20px 20px 80px; }
        .ctl { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .srch { position: relative; display: flex; align-items: center; flex: none; }
        .srch .si { position: absolute; left: 12px; color: var(--text-faint); pointer-events: none; }
        .search { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 9px;
          height: 38px; padding: 0 30px 0 34px; width: 300px; outline: none; font-size: 13.5px; transition: border-color .12s, box-shadow .12s; }
        .search::placeholder { color: var(--text-faint); }
        .search:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(47,129,247,.12); }
        .sx { position: absolute; right: 8px; background: transparent; border: none; color: var(--text-faint); font-size: 17px; cursor: pointer; line-height: 1; padding: 2px 4px; border-radius: 5px; }
        .sx:hover { color: var(--text); }

        .nav { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; flex-wrap: wrap; }
        .crumb { display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 14px;
          background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); font-size: 12px;
          cursor: pointer; white-space: nowrap; transition: all .18s cubic-bezier(.4,0,.2,1); }
        .crumb:hover { color: var(--text); border-color: var(--product); }
        .crumb.cur { color: var(--text); font-weight: 600; }
        .crumb.par { background: var(--surface-3); border-color: var(--product); cursor: default; }
        .sep { color: var(--text-faint); font-size: 14px; flex: none; }
        .chips { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; animation: chipsIn .24s cubic-bezier(.4,0,.2,1); }
        @keyframes chipsIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }
        .chip { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 15px; border-radius: 18px;
          background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); font-size: 13px;
          cursor: pointer; white-space: nowrap; transition: color .12s, background .12s, border-color .12s, transform .12s; }
        .chip:hover { color: var(--text); transform: translateY(-1px); }
        .chip.on { background: var(--surface-3); border-color: var(--product); color: var(--text); font-weight: 600; }
        .ch-n { background: var(--surface); border-radius: 10px; padding: 0 7px; font-size: 11px; color: var(--text-faint); }
        .chip.on .ch-n { color: var(--product); }

        .gright { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .gblocked, .gfilt { display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 13px;
          border-radius: 8px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim);
          font-size: 12.5px; cursor: pointer; transition: color .12s, border-color .12s; }
        .gblocked:hover, .gfilt:hover, .gfilt.on { color: var(--text); border-color: var(--product); }
        .gb-n { background: rgba(229,83,75,.16); color: #f0a7a2; border-radius: 10px; padding: 0 7px; font-size: 11px; font-weight: 600; }
        .gf-n { background: rgba(47,129,247,.16); color: #9cc4f5; border-radius: 10px; padding: 0 7px; font-size: 11px; font-weight: 600; }
        .filt-wrap { position: relative; }
        .filt-bd { position: fixed; inset: 0; z-index: 40; }
        .filt-pop { position: absolute; right: 0; top: 40px; z-index: 41; width: 230px; background: var(--surface-3);
          border: 1px solid var(--border-strong); border-radius: 10px; box-shadow: 0 16px 40px rgba(0,0,0,.5); padding: 10px; animation: chipsIn .16s ease; }
        .fp-h { color: var(--text); font-size: 12px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; margin: 2px 2px 8px; }
        .fp-locked { color: var(--text-faint); font-size: 11px; line-height: 1.5; padding: 0 2px 8px; border-bottom: 1px solid var(--border); margin-bottom: 6px; }
        .fp-locked span { opacity: .7; margin-left: 4px; }
        .fp-row { display: flex; align-items: center; gap: 9px; width: 100%; background: transparent; border: none; color: var(--text-dim);
          padding: 8px 8px; border-radius: 7px; cursor: pointer; font-size: 13px; }
        .fp-row:hover { background: var(--surface-2); color: var(--text); }
        .fp-row.on { color: var(--text); }
        .fp-ck { width: 18px; height: 18px; border-radius: 5px; border: 1px solid var(--border-strong); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; color: #fff; }
        .fp-ck.on { background: var(--primary); border-color: var(--primary); }

        .pcount { color: var(--text-dim); font-size: 12.5px; margin: 6px 0 8px; }
        .table { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .thead, .trow { display: grid; align-items: center; }
        .thead { color: var(--text-faint); font-size: var(--fs-colhead); letter-spacing: .5px; padding: 11px 14px; border-bottom: 1px solid var(--border); background: var(--surface-2); }
        .sortable { cursor: pointer; } .sortable:hover { color: var(--text-dim); }
        .trow { padding: 9px 14px; border-bottom: 1px solid var(--border-soft); cursor: pointer; font-size: 13.5px; position: relative; }
        .trow:last-child { border-bottom: none; }
        .trow:hover { background: var(--row-hover); }
        .hbar { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); z-index: 3; display: flex; gap: 6px; opacity: 0; transition: opacity .12s; }
        .trow:hover .hbar { opacity: 1; }
        .trow:hover .c-av { opacity: .12; }
        .aic { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 7px;
          background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text-dim); cursor: pointer; transition: all .12s; }
        .aic:hover { color: var(--product); border-color: var(--product); background: var(--surface-2); transform: translateY(-1px); }
        .c-av { display: flex; transition: opacity .12s; }
        .avw { position: relative; display: inline-flex; }
        .avw.locked .ava { border: 2px solid var(--primary); }
        .lockc { position: absolute; right: -3px; bottom: -3px; width: 15px; height: 15px; border-radius: 50%; background: var(--primary);
          color: #fff; display: inline-flex; align-items: center; justify-content: center; border: 2px solid var(--bg); }
        .lockc svg { width: 8px; height: 8px; }
        .ava { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
        .ava.ini { background: #3a4552; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; }
        .c-fn, .c-ln { color: var(--text); }
        .c-em, .c-ph, .c-pm, .c-cr { color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 10px; }
        .simb { color: #9cc4f5; background: rgba(47,129,247,.14); border: 1px solid rgba(47,129,247,.38); border-radius: 10px; padding: 1px 8px; font-size: 11px; font-weight: 600; }
        .sxb { display: inline-flex; width: 20px; height: 20px; align-items: center; justify-content: center; border-radius: 50%; font-size: 11px; font-weight: 700; }
        .sxb.f { color: #e6a3d0; background: rgba(214,110,178,.16); } .sxb.m { color: #8fb7f0; background: rgba(47,129,247,.16); }
        .dash { color: var(--text-faint); }
        .empty { padding: 30px 14px; color: var(--text-faint); }
        .pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 16px; }
        .pager button { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px;
          width: 34px; height: 30px; cursor: pointer; font-size: 15px; }
        .pager button:disabled { opacity: .4; cursor: default; }
        .pager button:not(:disabled):hover { color: var(--text); }
        .pg { color: var(--text-dim); font-size: 13px; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; }
      `}</style>
    </div>
  );
}
