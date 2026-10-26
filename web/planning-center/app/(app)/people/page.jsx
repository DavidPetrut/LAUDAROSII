"use client";
/**
 * Pagina People — tab-ul „People" din PCO Services, 1:1 cu screenshot-urile.
 * Header „N people" + căutare; tabel: FIRST NAME / LAST NAME / EMAIL / PHONE / PERMISSIONS /
 * LAST SCHEDULED PLAN / LAST LOGIN / LAST SET BLOCKOUTS / CREATED ON; avatar + paginare.
 * Date REALE din /api/pc/v1/people (paginate server-side).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { peopleApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";

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
  useEffect(() => { load(page); /* eslint-disable-line */ }, [page, sortBy, dir]);

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
    <div className="people">
      <div className="phead">
        <span className="count">{loading ? "…" : `${total} people`}</span>
        <input className="search" placeholder="Caută după nume sau email" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {err && <div className="err">{err}</div>}

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
              {p.avatar ? <img src={p.avatar} alt="" className="ava" /> : <span className="ava ini">{p.initials}</span>}
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

      <style jsx>{`
        .people { padding: 20px 0 80px; }
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
