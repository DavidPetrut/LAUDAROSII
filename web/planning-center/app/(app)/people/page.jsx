"use client";
/**
 * Pagina People — tab-ul „People" din PCO Services.
 * Nivel 1 = taburi „părinte" (Toate / Asimilare / Vertical Kids / Laudă și Închinare / Media / Grupuri mici),
 * nivel 2 = lucrările reale din acel părinte, nivel 3 = pozițiile → roster (MinistryBoard).
 * „Toate" = tabelul plat cu toți oamenii (coloană Actions: slujire + profil). Date REALE din /api/pc/v1/people.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { peopleApi, teamsApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";
import MinistryGroupsModal from "@/components/people/MinistryGroupsModal";
import BlockedPeopleModal from "@/components/people/BlockedPeopleModal";
import MinistryBoard from "@/components/people/MinistryBoard";
import QuickAssignModal from "@/components/people/QuickAssignModal";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

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
  const [parent, setParent] = useState("");         // tab de nivel 1 ("" = Toate)
  const [group, setGroup] = useState("");           // lucrarea (minister) selectată în nivelul 2
  const [mapGroups, setMapGroups] = useState([]);   // pt. modalul de mapare echipe→grupuri (admin)
  const [ministries, setMinistries] = useState([]); // lucrări → poziții → roster (cu .group = părinte)
  const [parents, setParents] = useState([]);       // [{ name, memberCount, ministryCount }] taburi nivel 1
  const [quickFor, setQuickFor] = useState(null);   // persoana pt. asignare rapidă (din Toate)
  const [canManage, setCanManage] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [canBlock, setCanBlock] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [blockedIds, setBlockedIds] = useState(() => new Set());
  const limit = 40;
  const tRef = useRef(null);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const r = await peopleApi.list({ q: query, page: p, limit, sortBy, dir });
      setRows(r.results || []); setTotal(r.total || 0); setHasMore(!!r.hasMore); setErr("");
    } catch (e) { setErr(e?.message || "Eroare la încărcare."); }
    finally { setLoading(false); }
  }, [query, page, sortBy, dir]);
  useEffect(() => { if (parent === "") load(page); /* eslint-disable-line */ }, [page, sortBy, dir, parent]);

  const loadGroups = useCallback(() => { teamsApi.ministryGroups().then((r) => setMapGroups(r.groups || [])).catch(() => {}); }, []);
  const loadMinistries = useCallback(() => {
    peopleApi.ministries().then((r) => { setMinistries(r.ministries || []); setParents(r.groups || []); }).catch(() => {});
  }, []);
  useEffect(() => { loadMinistries(); }, [loadMinistries]);

  // lucrările din părintele selectat (nivel 2) + lucrarea activă
  const childMinistries = useMemo(() => (parent ? ministries.filter((m) => m.group === parent) : []), [ministries, parent]);
  const activeMinistry = useMemo(() => ministries.find((m) => m.name === group) || null, [ministries, group]);

  // schimbare părinte → auto-selectează prima lucrare din el (sau golește pt. Toate)
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
    loadGroups();
    peopleApi.me().then((r) => {
      setCanManage(!!r?.capabilities?.manageServiceTypes);
      if (r?.capabilities?.manageBlocks) { setCanBlock(true); loadBlockedCount(); }
    }).catch(() => {});
  }, [loadGroups, loadBlockedCount]);

  // căutare debounced (doar pe „Toate") → resetează la pagina 1
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
      {/* RÂND CONTROL: căutare (stânga) · taburi nivel 1 · acțiuni (dreapta) */}
      <div className="ctl">
        <div className="srch">
          <svg className="si" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input className="search" placeholder="Caută persoană…" value={query}
            onChange={(e) => { if (parent !== "") setParent(""); setQuery(e.target.value); }} />
          {query && <button className="sx" title="Șterge" onClick={() => setQuery("")}>×</button>}
        </div>

        <div className="nav">
          {/* breadcrumb: pe măsură ce intri, părintele se micșorează într-un crumb la stânga */}
          <button className={`crumb ${parent === "" ? "cur" : ""}`} onClick={() => setParent("")} title="Toți oamenii">Toate</button>
          {parent !== "" && (
            <>
              <span className="sep">›</span>
              <span className="crumb cur par">{parent}</span>
            </>
          )}
          {/* chip-urile nivelului curent (animate la fiecare schimbare de nivel) */}
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
          {canManage && (
            <button className="gmanage" onClick={() => setManageOpen(true)} title="Mapează echipele la grupuri">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              Grupuri de slujire
            </button>
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
        <div className="thead">
          <div className="c-ac">ACȚIUNI</div>
          <div className="c-av" />
          <div className="c-fn sortable" onClick={() => sort("firstName")}>PRENUME {sortBy === "firstName" ? (dir === "asc" ? "↑" : "↓") : ""}</div>
          <div className="c-ln sortable" onClick={() => sort("lastName")}>NUME {sortBy === "lastName" ? (dir === "asc" ? "↑" : "↓") : ""}</div>
          <div className="c-em">EMAIL</div>
          <div className="c-ph">TELEFON</div>
          <div className="c-pm">PERMISIUNI</div>
          <div className="c-cr">CREAT</div>
          <div className="c-sp" />
        </div>
        {rows.map((p) => {
          const name = `${p.firstName || ""} ${p.lastName || ""}`.trim();
          return (
          <div key={p.id} className="trow" onClick={() => openProfile(p.id)} title="Click: deschide profilul">
            <div className="c-ac" onClick={(e) => e.stopPropagation()}>
              <button className="aic" title="Slujiri — asignează rapid"
                onClick={() => setQuickFor({ id: p.id, name, avatar: p.avatar, initials: p.initials })}>
                <img src="/icons/planificare.png" alt="Slujiri" draggable={false} />
              </button>
              <button className="aic" title="Deschide profilul" onClick={() => openProfile(p.id)}>
                <img src="/icons/profile.png" alt="Profil" draggable={false} />
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
            <div className="c-pm">{p.permission}</div>
            <div className="c-cr">{fmtDate(p.createdAt)}</div>
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

      {manageOpen && (
        <MinistryGroupsModal
          groups={mapGroups.map((g) => g.name)}
          onClose={() => setManageOpen(false)}
          onChanged={() => { loadGroups(); load(page); }}
        />
      )}

      {blockedOpen && (
        <BlockedPeopleModal
          onClose={() => setBlockedOpen(false)}
          onChanged={() => { loadBlockedCount(); load(page); }}
        />
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
        .gmanage, .gblocked { display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 13px;
          border-radius: 8px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim);
          font-size: 12.5px; cursor: pointer; transition: color .12s, border-color .12s; }
        .gmanage:hover, .gblocked:hover { color: var(--text); border-color: var(--product); }
        .gb-n { background: rgba(229,83,75,.16); color: #f0a7a2; border-radius: 10px; padding: 0 7px; font-size: 11px; font-weight: 600; }

        .pcount { color: var(--text-dim); font-size: 12.5px; margin: 6px 0 8px; }
        .table { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .thead, .trow { display: grid; grid-template-columns: 76px 44px 150px 150px 230px 140px 110px 110px 1fr; align-items: center; }
        .thead { color: var(--text-faint); font-size: var(--fs-colhead); letter-spacing: .5px; padding: 11px 14px; border-bottom: 1px solid var(--border); background: var(--surface-2); }
        .sortable { cursor: pointer; } .sortable:hover { color: var(--text-dim); }
        .trow { padding: 9px 14px; border-bottom: 1px solid var(--border-soft); cursor: pointer; font-size: 13.5px; }
        .trow:last-child { border-bottom: none; }
        .trow:hover { background: var(--row-hover); }
        .c-ac { display: flex; align-items: center; gap: 8px; }
        .aic { display: inline-flex; align-items: center; justify-content: center; padding: 0; background: transparent; border: none;
          cursor: pointer; border-radius: 50%; transition: transform .12s, filter .12s; opacity: .9; }
        .aic img { width: 26px; height: 26px; display: block; border-radius: 50%; }
        .aic:hover { transform: translateY(-1px) scale(1.08); opacity: 1; filter: drop-shadow(0 2px 5px rgba(47,129,247,.35)); }
        .c-av { display: flex; }
        .avw { position: relative; display: inline-flex; }
        .avw.locked .ava { border: 2px solid var(--primary); }
        .lockc { position: absolute; right: -3px; bottom: -3px; width: 15px; height: 15px; border-radius: 50%; background: var(--primary);
          color: #fff; display: inline-flex; align-items: center; justify-content: center; border: 2px solid var(--bg); }
        .lockc svg { width: 8px; height: 8px; }
        .ava { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
        .ava.ini { background: #3a4552; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; }
        .c-fn, .c-ln { color: var(--text); }
        .c-em, .c-ph, .c-pm, .c-cr { color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 10px; }
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
