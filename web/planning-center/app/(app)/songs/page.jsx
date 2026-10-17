"use client";
/**
 * Pagina Songs — lista de cântece. Date REALE din /api/pc/v1/songs (DB-ul vostru).
 * Vizual apropiat de PCO; o facem pixel-identică pe iterații (header „N songs", Filter,
 * coloane TITLE / [fișiere] / BPM / KEYS / LAST SCHEDULED / CREATED, paginare, „Add a song").
 *
 * NOTĂ backend (aditiv, de făcut): GET /songs nu întoarce încă createdAt/lastScheduled/
 * prezența fișierelor — le adăugăm în endpoint ca să completăm coloanele. Momentan afișăm
 * ce expune API-ul azi (TITLE / BPM / KEYS).
 *
 * AI-first: pagina se înregistrează ca suprafață => asistentul AI o poate „vedea" și căuta în ea.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { songsApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";
import AddSongModal from "@/components/songs/AddSongModal";

export default function SongsPage() {
  const router = useRouter();
  const [all, setAll] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    try { const r = await songsApi.list(); setAll(r.songs || []); }
    catch (e) { setErr(e?.message || "Eroare la încărcare."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((s) => (s.title || "").toLowerCase().includes(q) || (s.author || "").toLowerCase().includes(q));
  }, [all, query]);

  // ── AI-first: expune ecranul către asistent ──
  useAiSurface({
    id: "songs.list",
    label: "Lista de cântece",
    scope: "page",
    getContext: () => ({ query, total: all.length, afișate: rows.length }),
    actions: [
      { id: "search", label: "Caută în cântece", description: "Filtrează lista după text", params: { q: "string" }, run: ({ q }) => setQuery(q || "") },
      { id: "open", label: "Deschide un cântec", description: "Navighează la un cântec după id", params: { id: "string" }, run: ({ id }) => router.push(`/songs/${id}`) },
      { id: "addSong", label: "Adaugă un cântec", description: "Deschide formularul Add Song", run: () => setAddOpen(true) },
    ],
  }, [query, all, rows]);

  return (
    <div className="songs">
      <h1 className="page-title">Songs</h1>

      <div className="filterbar">
        <button className="filter-chip">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M4 8h8M6 12h4"/></svg>
          Filter
        </button>
        <input className="filter-text" placeholder="Add text filter" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn btn-primary add-song" onClick={() => setAddOpen(true)}>Add a song</button>
      </div>

      <div className="count-row">
        <span>{loading ? "…" : `${rows.length} songs`}</span>
      </div>

      {err && <div className="err">{err}</div>}

      <div className="table">
        <div className="thead">
          <div className="c-title">TITLE</div>
          <div className="c-bpm">BPM</div>
          <div className="c-keys">KEYS</div>
          <div className="c-sched">LAST SCHEDULED</div>
          <div className="c-created">CREATED</div>
        </div>
        {rows.map((s) => (
          <div key={s.id} className="trow" onClick={() => router.push(`/songs/${s.id}`)}>
            <div className="c-title">{s.title}</div>
            <div className="c-bpm">{s.bpm || ""}</div>
            <div className="c-keys">{(s.keys || []).join(", ")}</div>
            <div className="c-sched" />
            <div className="c-created" />
          </div>
        ))}
        {!loading && rows.length === 0 && <div className="empty">Niciun cântec.</div>}
      </div>

      {addOpen && <AddSongModal onClose={() => setAddOpen(false)} onCreated={load} />}

      <style jsx>{`
        .songs { padding: 24px 0 80px; }
        .page-title { font-size: var(--fs-h1); font-weight: 600; margin: 8px 0 18px; }
        .filterbar { display: flex; align-items: center; gap: 0; background: var(--surface);
          border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; }
        .filter-chip { display: inline-flex; align-items: center; gap: 7px; background: var(--surface-2);
          border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; height: 32px; padding: 0 12px; cursor: pointer; font-size: 13px; }
        .filter-text { flex: 1; background: transparent; border: none; outline: none; color: var(--text);
          font-size: 14px; padding: 0 14px; height: 32px; }
        .filter-text::placeholder { color: var(--text-faint); }
        .add-song { margin-left: auto; }
        .count-row { color: var(--text-dim); font-size: 14px; margin: 16px 2px 8px; }
        .table { }
        .thead, .trow { display: grid; grid-template-columns: minmax(280px,1fr) 90px 220px 160px 190px; align-items: center; }
        .thead { color: var(--text-faint); font-size: var(--fs-colhead); letter-spacing: .6px;
          padding: 8px 8px; border-bottom: 1px solid var(--border); }
        .trow { padding: 15px 8px; border-bottom: 1px solid var(--border-soft); cursor: pointer; font-size: 14px; }
        .trow:hover { background: var(--row-hover); }
        .c-title { color: var(--text); }
        .c-bpm, .c-keys, .c-sched, .c-created { color: var(--text-dim); }
        .empty { padding: 30px 8px; color: var(--text-faint); }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; }
      `}</style>
    </div>
  );
}
