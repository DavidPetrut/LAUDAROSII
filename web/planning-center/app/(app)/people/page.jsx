"use client";
/**
 * Pagina People — tab-ul „People" din PCO Services, 1:1 cu screenshot-urile.
 * Header „N people" + căutare; tabel: FIRST NAME / LAST NAME / EMAIL / PHONE / PERMISSIONS /
 * LAST SCHEDULED PLAN / LAST LOGIN / LAST SET BLOCKOUTS / CREATED ON; avatar + paginare.
 * Date REALE din /api/pc/v1/people (paginate server-side).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { peopleApi, teamsApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";
import MinistryGroupsModal from "@/components/people/MinistryGroupsModal";
import BlockedPeopleModal from "@/components/people/BlockedPeopleModal";

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
  const [group, setGroup] = useState("");          // grupul de slujire selectat ("" = toate)
  const [groups, setGroups] = useState([]);        // [{ name, teamCount, isDefault }]
  const [canManage, setCanManage] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [canBlock, setCanBlock] = useState(false);   // scheduler: vede/administrează blocajele
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [blockedIds, setBlockedIds] = useState(() => new Set()); // pt. badge-ul de lacăt pe avatar
  const limit = 40;
  const tRef = useRef(null);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const r = await peopleApi.list({ q: query, page: p, limit, sortBy, dir, ministryGroup: group || undefined });
      setRows(r.results || []); setTotal(r.total || 0); setHasMore(!!r.hasMore); setErr("");
    } catch (e) { setErr(e?.message || "Eroare la încărcare."); }
    finally { setLoading(false); }
  }, [query, page, sortBy, dir, group]);
  useEffect(() => { load(page); /* eslint-disable-line */ }, [page, sortBy, dir]);

  // la schimbarea grupului → resetează la pagina 1 și reîncarcă
  useEffect(() => { setPage(1); load(1); /* eslint-disable-line */ }, [group]);

  // grupurile de slujire + dacă pot administra maparea (admin)
  const loadGroups = useCallback(() => { teamsApi.ministryGroups().then((r) => setGroups(r.groups || [])).catch(() => {}); }, []);
  const loadBlockedCount = useCallback(() => {
    peopleApi.blocked().then((r) => { setBlockedCount(r.total || 0); setBlockedIds(new Set((r.blocked || []).map((x) => String(x.id)))); }).catch(() => {});
  }, []);
  useEffect(() => {
    loadGroups();
    peopleApi.me().then((r) => {
      setCanManage(!!r?.capabilities?.manageServiceTypes);
      if (r?.capabilities?.schedule) { setCanBlock(true); loadBlockedCount(); }
    }).catch(() => {});
  }, [loadGroups, loadBlockedCount]);

  // căutare debounced → resetează la pagina 1
  useEffect(() => {
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
    getContext: () => ({ query, total, page, afișate: rows.length }),
    actions: [
      { id: "search", label: "Caută persoană", params: { q: "string" }, run: ({ q }) => setQuery(q || "") },
      { id: "open", label: "Deschide profil", params: { id: "string" }, run: ({ id }) => router.push(`/people/${id}`) },
    ],
  }, [query, total, page, rows]);

  return (
    <div className="people pc-full pc-pad">
      <div className="phead">
        <span className="count">{loading ? "…" : `${total} people`}</span>
        <input className="search" placeholder="Caută după nume sau email" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {err && <div className="err">{err}</div>}

      <div className="gbar">
        <div className="gchips">
          <button className={`gchip ${group === "" ? "on" : ""}`} onClick={() => setGroup("")}>Toate</button>
          {groups.map((g) => (
            <button key={g.name} className={`gchip ${group === g.name ? "on" : ""}`} onClick={() => setGroup(g.name)}>
              {g.name}{g.teamCount ? <span className="gc-n">{g.teamCount}</span> : null}
            </button>
          ))}
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

      <div className="table">
        <div className="thead">
          <div className="c-av" />
          <div className="c-fn sortable" onClick={() => sort("firstName")}>FIRST NAME {sortBy === "firstName" ? (dir === "asc" ? "↑" : "↓") : ""}</div>
          <div className="c-ln sortable" onClick={() => sort("lastName")}>LAST NAME {sortBy === "lastName" ? (dir === "asc" ? "↑" : "↓") : ""}</div>
          <div className="c-em">EMAIL ADDRESS</div>
          <div className="c-ph">PHONE NUMBER</div>
          <div className="c-pm">PERMISSIONS</div>
          <div className="c-cr">CREATED ON</div>
        </div>
        {rows.map((p) => (
          <div key={p.id} className="trow" onClick={() => router.push(`/people/${p.id}`)}>
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
            <div className="c-em">{p.email}</div>
            <div className="c-ph">{p.phone}</div>
            <div className="c-pm">{p.permission}</div>
            <div className="c-cr">{fmtDate(p.createdAt)}</div>
          </div>
        ))}
        {!loading && rows.length === 0 && <div className="empty">Nicio persoană.</div>}
      </div>

      <div className="pager">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
        <span className="pg">{page} / {totalPages}</span>
        <button disabled={!hasMore} onClick={() => setPage(page + 1)}>›</button>
      </div>

      {manageOpen && (
        <MinistryGroupsModal
          groups={groups.map((g) => g.name)}
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
        .gbar { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
        .gchips { display: flex; gap: 7px; flex-wrap: wrap; }
        .gchip { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 13px; border-radius: 15px;
          background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); font-size: 12.5px;
          cursor: pointer; transition: color .12s, background .12s, border-color .12s; }
        .gchip:hover { color: var(--text); }
        .gchip.on { background: var(--surface-3); border-color: var(--product); color: var(--text); font-weight: 600; }
        .gc-n { background: var(--surface); border-radius: 10px; padding: 0 6px; font-size: 11px; color: var(--text-faint); }
        .gchip.on .gc-n { color: var(--product); }
        .gright { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .gmanage, .gblocked { display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 13px;
          border-radius: 6px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim);
          font-size: 12.5px; cursor: pointer; transition: color .12s, border-color .12s; }
        .gmanage:hover, .gblocked:hover { color: var(--text); border-color: var(--product); }
        .gb-n { background: rgba(229,83,75,.16); color: #f0a7a2; border-radius: 10px; padding: 0 7px; font-size: 11px; font-weight: 600; }
        .phead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .count { color: var(--text); font-size: 15px; font-weight: 600; }
        .search { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px;
          height: 32px; padding: 0 12px; width: 280px; outline: none; font-size: 13px; }
        .search::placeholder { color: var(--text-faint); }
        .table { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .thead, .trow { display: grid; grid-template-columns: 48px 150px 150px minmax(200px,1fr) 150px 140px 130px; align-items: center; }
        .thead { color: var(--text-faint); font-size: var(--fs-colhead); letter-spacing: .5px; padding: 10px 14px; border-bottom: 1px solid var(--border); background: var(--surface-2); }
        .sortable { cursor: pointer; } .sortable:hover { color: var(--text-dim); }
        .trow { padding: 10px 14px; border-bottom: 1px solid var(--border-soft); cursor: pointer; font-size: 13.5px; }
        .trow:last-child { border-bottom: none; }
        .trow:hover { background: var(--row-hover); }
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
