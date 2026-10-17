"use client";
/**
 * Song detail (screenshots 48-64). Layout PCO:
 *  header (titlu + CCLI/autor/© + Actions) · sidebar (All Arrangements / ARRANGEMENTS + Add) ·
 *  main (nume aranjament · Length/BPM/Meter · Sequence · Files[Arrangement + coloane chei] · Schedule/Tags/Notes).
 * Date reale din /api/pc/v1/songs/:id (+ /arrangements/:aid). Toate scrierile trec prin API.
 */
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { songsApi } from "@/lib/api/client";
import { abbreviateSequence } from "@/lib/songs/sequence";
import { useAiSurface } from "@/lib/ai/useAiSurface";
import EditSequenceModal from "@/components/songs/EditSequenceModal";
import AddKeyModal from "@/components/songs/AddKeyModal";
import AddArrangementModal from "@/components/songs/AddArrangementModal";
import AddFileModal from "@/components/songs/AddFileModal";
import SongInfoModal from "@/components/songs/SongInfoModal";
import ChartPreviewModal from "@/components/songs/ChartPreviewModal";

const METERS = ["none", "2/2", "2/4", "3/2", "3/4", "4/2", "4/4", "5/4", "6/4", "3/8", "6/8", "7/4", "7/8", "9/8", "12/4", "12/8"];

export default function SongDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [song, setSong] = useState(null);
  const [arrId, setArrId] = useState(null);
  const [arr, setArr] = useState(null);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState(null); // 'seq'|'key'|'arr'|'file'|'info'
  const [editField, setEditField] = useState(null); // 'bpm'|'length'|'name'
  const [preview, setPreview] = useState(null); // { mode, targetKey } pt. ChartPreviewModal

  // Click pe un fișier: chart-urile generate → preview in-app; audio/link → tab nou; derivat → editor.
  const openFile = (f) => {
    if (f.source === "generated") {
      let mode = "chords", targetKey = "";
      if (f.kind === "numbers") mode = "numbers";
      else if (f.kind === "numerals") mode = "numerals";
      else if (f.kind === "lyrics") mode = "lyrics";
      else { mode = "chords"; const m = /in\s+(\S+)/i.exec(f.name || ""); targetKey = m ? m[1] : ""; }
      setPreview({ mode, targetKey });
    } else if (f.url) window.open(f.url, "_blank", "noopener");
    else router.push(`/chords/${id}/${arrId}`);
  };

  const loadSong = useCallback(async () => {
    try {
      const s = await songsApi.get(id);
      setSong(s);
      setArrId((cur) => cur || s.arrangements?.[0]?.id || null);
    } catch (e) { setErr(e?.message || "Eroare."); }
  }, [id]);

  const loadArr = useCallback(async () => {
    if (!arrId) return;
    try { setArr(await songsApi.arrangement(id, arrId)); } catch (e) { setErr(e?.message || "Eroare."); }
  }, [id, arrId]);

  useEffect(() => { loadSong(); }, [loadSong]);
  useEffect(() => { loadArr(); }, [loadArr]);

  // ── edits ──
  const patchArr = async (payload) => { await songsApi.updateArrangement(id, arrId, payload); await loadArr(); await loadSong(); };
  const saveSequence = async (seq) => { await patchArr({ sequence: seq }); setModal(null); };
  const addKey = async (payload) => { await songsApi.addKey(id, arrId, payload); setModal(null); await loadArr(); };
  const addArrangement = async (payload) => { const r = await songsApi.addArrangement(id, payload); setModal(null); setArrId(r.id); await loadSong(); };
  const saveInfo = async (payload) => { await songsApi.patchSong(id, payload); setModal(null); await loadSong(); };

  // ── AI surface ──
  useAiSurface({
    id: "songs.detail",
    label: `Cântec: ${song?.title || ""}`,
    scope: "page",
    getContext: () => ({ songId: id, title: song?.title, arrangement: arr?.name, bpm: arr?.bpm, meter: arr?.meter, sequence: arr?.sequence, keys: (arr?.keys || []).map((k) => k.label) }),
    actions: [
      { id: "addKey", label: "Adaugă o cheie", run: () => setModal("key") },
      { id: "editSequence", label: "Editează secvența", run: () => setModal("seq") },
      { id: "addFile", label: "Adaugă un fișier", run: () => setModal("file") },
      { id: "addArrangement", label: "Adaugă un aranjament", run: () => setModal("arr") },
      { id: "setBpm", label: "Setează BPM", params: { bpm: "number" }, run: ({ bpm }) => patchArr({ bpm: Number(bpm) }) },
    ],
  }, [song, arr, id]);

  if (err) return <div className="pad err">{err}</div>;
  if (!song) return <div className="pad dim">Se încarcă…</div>;

  const seqTokens = abbreviateSequence(arr?.sequence || []);

  return (
    <div className="detail">
      {/* Header */}
      <div className="song-head">
        <div>
          <h1 className="song-title">{song.title}</h1>
          <div className="song-meta">
            {song.ccli ? <span>CCLI #{song.ccli}{song.author ? ` | ${song.author}` : ""}</span> : song.author ? <span>{song.author}</span> : null}
            {(song.copyrightYear || song.notes || (song.themes || []).length > 0) && (
              <div className="meta2">
                {song.copyrightYear ? <span>© {song.copyrightYear}</span> : null}
                {song.notes ? <span> | Notes</span> : null}
                {(song.themes || []).length ? <span> | {(song.themes || []).join(", ")}</span> : null}
              </div>
            )}
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setModal("info")}>Actions ▾</button>
        </div>
      </div>

      <div className="grid">
        {/* Sidebar */}
        <aside className="side">
          <div className="side-h">SONG</div>
          <div className="side-link active">All Arrangements</div>
          <div className="side-h mt">ARRANGEMENTS</div>
          {song.arrangements?.map((a) => (
            <div key={a.id} className={`side-link ${a.id === arrId ? "sel" : ""}`} onClick={() => setArrId(a.id)}>{a.name}</div>
          ))}
          <button className="side-add" onClick={() => setModal("arr")}>Add</button>
        </aside>

        {/* Main */}
        <section className="main">
          {!arr ? <div className="dim">Se încarcă aranjamentul…</div> : (
            <>
              <div className="arr-title-row">
                <h2 className="arr-title">{arr.name}</h2>
                <button className="ic" title="Redenumește" onClick={async () => {
                  const name = prompt("Nume aranjament:", arr.name); if (name && name.trim()) await patchArr({ name: name.trim() });
                }}>✎</button>
              </div>

              <div className="specs">
                <span>Length: {editField === "length" ? (
                  <input className="mini" defaultValue={arr.lengthLabel} autoFocus
                    onBlur={async (e) => { const [m, s] = e.target.value.split(":").map(Number); await patchArr({ lengthSec: (m || 0) * 60 + (s || 0) }); setEditField(null); }}
                    onKeyDown={(e) => e.key === "Enter" && e.target.blur()} />
                ) : <b onClick={() => setEditField("length")}>{arr.lengthLabel || "0:00"}</b>}</span>
                <span>BPM: {editField === "bpm" ? (
                  <input className="mini" type="number" defaultValue={arr.bpm || ""} autoFocus
                    onBlur={async (e) => { await patchArr({ bpm: Number(e.target.value) || null }); setEditField(null); }}
                    onKeyDown={(e) => e.key === "Enter" && e.target.blur()} />
                ) : <b onClick={() => setEditField("bpm")}>{arr.bpm || "—"}</b>}</span>
                <span>Meter: <select className="meter" value={arr.meter || "none"} onChange={async (e) => await patchArr({ meter: e.target.value === "none" ? "" : e.target.value })}>
                  {METERS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select></span>
              </div>

              <div className="seq-row">
                <span className="seq-label">Sequence:</span>
                {seqTokens.length ? (
                  <>
                    <span className="seq-tokens">{seqTokens.join(", ")}</span>
                    <button className="seq-btn" onClick={() => setModal("seq")} title="Edit sequence">✎</button>
                  </>
                ) : <button className="seq-create" onClick={() => setModal("seq")}>Create</button>}
              </div>

              {/* Files */}
              <div className="files-head">
                <span className="fh-title">Files</span>
                <button className="ic" onClick={() => setModal("file")} title="Adaugă fișier">＋</button>
                <button className="lyrics-chip" onClick={() => router.push(`/chords/${id}/${arrId}`)} title="Editează Lyrics & Chords">Lyrics &amp; Chords</button>
              </div>

              <div className="file-cols">
                <div className="fcol">
                  <div className="fcol-h">Arrangement</div>
                  {(arr.arrangementFiles || []).map((f) => <FileRow key={f.id} f={f} onOpen={() => openFile(f)} />)}
                  {(arr.arrangementFiles || []).length === 0 && <div className="fcol-empty" />}
                </div>
                {(arr.keys || []).map((k) => (
                  <div key={k.id} className="fcol">
                    <div className="fcol-h">{k.label || k.startKey}</div>
                    {(k.files || []).filter((f) => !f.derived).map((f) => <FileRow key={f.id} f={f} onOpen={() => openFile(f)} />)}
                  </div>
                ))}
              </div>

              <div className="file-tabs">
                <span className="ftab active">Arrangement</span>
                {(arr.keys || []).map((k) => <span key={k.id} className="ftab">{k.label || k.startKey}</span>)}
                <button className="addkey" onClick={() => setModal("key")}>Add key</button>
              </div>

              {/* Schedule / Tags / Notes */}
              <div className="three">
                <div className="panel">
                  <div className="panel-h">Schedule</div>
                  <div className="panel-sub dim">Istoricul programărilor (în curând)</div>
                </div>
                <div className="panel">
                  <div className="panel-h">Tags</div>
                  <div className="panel-sub dim">{(arr.tagIds || []).length ? `${arr.tagIds.length} tag-uri` : "Fără tag-uri."}</div>
                </div>
                <div className="panel">
                  <div className="panel-h">Notes</div>
                  <div className="panel-sub dim">{arr.notes || ""}</div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {modal === "seq" && <EditSequenceModal initial={arr?.sequence || []} onClose={() => setModal(null)} onSave={saveSequence} />}
      {modal === "key" && <AddKeyModal onClose={() => setModal(null)} onSubmit={addKey} />}
      {modal === "arr" && <AddArrangementModal onClose={() => setModal(null)} onSubmit={addArrangement} />}
      {modal === "file" && <AddFileModal songId={id} arrangementId={arrId} keys={arr?.keys || []} onClose={() => setModal(null)} onDone={() => { setModal(null); loadArr(); }} />}
      {modal === "info" && <SongInfoModal song={song} onClose={() => setModal(null)} onSubmit={saveInfo} />}
      {preview && <ChartPreviewModal songId={id} arrId={arrId} song={song} arr={arr} mode={preview.mode} targetKey={preview.targetKey} onClose={() => setPreview(null)} />}

      <style jsx>{`
        .detail { padding: 22px 0 90px; }
        .pad { padding: 30px 0; } .dim { color: var(--text-dim); } .err { color: #f0a7a2; }
        .song-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
        .song-title { font-size: 24px; font-weight: 600; margin: 0 0 6px; }
        .song-meta { color: var(--text-dim); font-size: 12.5px; }
        .meta2 { margin-top: 3px; }
        .actions { margin-left: auto; }
        .grid { display: grid; grid-template-columns: 210px 1fr; gap: 28px; }
        .side-h { color: var(--text-faint); font-size: 11px; letter-spacing: .6px; margin: 2px 0 8px; }
        .side-h.mt { margin-top: 20px; }
        .side-link { padding: 8px 10px; border-radius: 6px; color: var(--text-dim); cursor: pointer; font-size: 13.5px; }
        .side-link:hover { background: var(--surface-2); color: var(--text); }
        .side-link.active, .side-link.sel { background: var(--surface-2); color: var(--text); }
        .side-add { margin-top: 10px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; padding: 6px 14px; cursor: pointer; }
        .arr-title-row { display: flex; align-items: center; gap: 10px; }
        .arr-title { font-size: 22px; font-weight: 600; margin: 0; }
        .ic { background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 14px; }
        .specs { display: flex; gap: 26px; color: var(--text-dim); font-size: 15px; margin: 14px 0 10px; align-items: center; }
        .specs b { color: var(--text); cursor: pointer; }
        .mini { width: 70px; height: 26px; background: var(--surface-2); border: 1px solid var(--primary); border-radius: 4px; color: var(--text); padding: 0 6px; }
        .meter { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 4px; height: 28px; }
        .seq-row { display: flex; align-items: center; gap: 10px; margin: 6px 0 24px; color: var(--text-dim); }
        .seq-label { }
        .seq-tokens { color: var(--text); font-weight: 600; }
        .seq-btn { background: transparent; border: none; color: var(--text-dim); cursor: pointer; }
        .seq-create { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 5px; padding: 3px 12px; cursor: pointer; }
        .files-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .fh-title { font-size: 18px; font-weight: 600; }
        .lyrics-chip { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--primary); border-radius: 5px; padding: 4px 10px; font-size: 12.5px; cursor: pointer; }
        .lyrics-chip:hover { border-color: var(--primary); }
        .file-cols { display: flex; gap: 2px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px 8px 0 0; padding: 14px; overflow-x: auto; }
        .fcol { flex: 1; min-width: 220px; border-right: 1px solid var(--border); padding: 0 14px; }
        .fcol:last-child { border-right: none; }
        .fcol-h { color: var(--text-dim); font-size: 14px; margin-bottom: 12px; }
        .fcol-empty { min-height: 120px; }
        .file-tabs { display: flex; align-items: center; gap: 18px; background: var(--surface); border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px; padding: 10px 16px; margin-bottom: 26px; }
        .ftab { font-size: 13px; color: var(--text-dim); }
        .ftab.active { color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 3px; }
        .addkey { margin-left: 4px; background: transparent; border: none; color: var(--primary); cursor: pointer; font-size: 13px; }
        .three { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
        .panel { border: 1px solid var(--border); border-radius: 8px; padding: 14px; min-height: 90px; }
        .panel-h { font-weight: 600; margin-bottom: 8px; }
        .panel-sub { font-size: 13px; }
      `}</style>
    </div>
  );
}

function FileRow({ f, onOpen }) {
  const inner = (
    <>
      <span className="fi">{f.kind === "audio" ? "♪" : f.kind === "chordChart" ? "♯" : f.kind === "lyrics" ? "¶" : "▦"}</span>
      <span className="fn">{f.name}</span>
    </>
  );
  return (
    <div className="frow">
      <button className="fl fl-btn" onClick={onOpen} title="Deschide">{inner}</button>
      <style jsx>{`
        .frow { padding: 6px 0; }
        .fl { display: flex; align-items: center; gap: 8px; color: var(--text); font-size: 13px; }
        .fl:hover { color: var(--text-link); }
        .fl-btn { background: transparent; border: none; cursor: pointer; padding: 0; text-align: left; width: 100%; }
        .fi { color: var(--text-dim); }
        .fn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      `}</style>
    </div>
  );
}
