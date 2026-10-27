"use client";
/**
 * Media — biblioteca de media (link/video/imagine). /api/pc/v1/media → { items }.
 * Grid cu thumbnail + titlu + tip. Căutare. (Create/edit = pe web, gated media.edit — ulterior.)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { mediaApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";

export default function MediaPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { const r = await mediaApi.list(); setItems(r.items || []); } catch (e) { setErr(e?.message || "Eroare."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => (i.title || "").toLowerCase().includes(s)) : items;
  }, [items, q]);

  useAiSurface({ id: "media.list", label: "Media", scope: "page",
    getContext: () => ({ total: items.length, q }), actions: [{ id: "search", label: "Caută", params: { q: "string" }, run: ({ q }) => setQ(q || "") }] }, [items, q]);

  return (
    <div className="media pc-full pc-pad">
      <h1 className="page-title">Media</h1>
      <input className="search" placeholder="Caută media" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <div className="err">{err}</div>}
      <div className="count">{loading ? "…" : `${rows.length} media`}</div>
      <div className="grid">
        {rows.map((m) => (
          <a key={m.id} className="mc" href={m.url || "#"} target={m.url ? "_blank" : undefined} rel="noreferrer">
            <div className="thumb" style={m.thumbnailUrl ? { backgroundImage: `url(${m.thumbnailUrl})` } : {}}>{!m.thumbnailUrl && <span className="kind">{(m.kind || "media").toUpperCase()}</span>}</div>
            <div className="mt">{m.title}</div>
            <div className="ma">{m.author || m.kind || ""}</div>
          </a>
        ))}
        {!loading && rows.length === 0 && <div className="muted">Niciun element media.</div>}
      </div>
      <style jsx>{`
        .media { padding: 22px 20px 60px; }
        .page-title { font-size: var(--fs-h1); font-weight: 600; margin: 4px 0 14px; }
        .search { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px; height: 34px; padding: 0 12px; color: var(--text); width: 300px; outline: none; font-size: 13px; }
        .count { color: var(--text-dim); font-size: 13px; margin: 14px 0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
        .mc { text-decoration: none; }
        .thumb { aspect-ratio: 16/9; background: var(--surface-2) center/cover; border: 1px solid var(--border); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .kind { color: var(--text-faint); font-size: 11px; letter-spacing: .5px; }
        .mt { color: var(--text); font-size: 13.5px; margin: 7px 0 2px; } .ma { color: var(--text-faint); font-size: 11.5px; }
        .muted { color: var(--text-faint); font-size: 13px; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; }
      `}</style>
    </div>
  );
}
