"use client";
/**
 * Song detail (screenshots 48-64). Layout PCO:
 *  header (titlu + CCLI/autor/© + Actions) · sidebar (All Arrangements / ARRANGEMENTS + Add) ·
 *  main (nume aranjament · Length/BPM/Meter · Sequence · Files[Arrangement + coloane chei] · Schedule/Tags/Notes).
 * Date reale din /api/pc/v1/songs/:id (+ /arrangements/:aid). Toate scrierile trec prin API.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { api, songsApi } from "@/lib/api/client";
import { abbreviateSequence } from "@/lib/songs/sequence";
import { renderChordPro } from "@/lib/songs/chordpro";
import { generateChartPdf } from "@/lib/songs/pdf";
import { detectKey, fetchAudioBuffer } from "@/lib/songs/keyDetect";
import { useAiSurface } from "@/lib/ai/useAiSurface";
import { usePlayer, isAudioUrl, isYouTube } from "@/lib/player/PlayerProvider";
import EditSequenceModal from "@/components/songs/EditSequenceModal";
import AddKeyModal from "@/components/songs/AddKeyModal";
import AddArrangementModal from "@/components/songs/AddArrangementModal";
import ArrangementModal from "@/components/songs/ArrangementModal";
const ClickTrackBar = dynamic(() => import("@/components/songs/ClickTrackBar"), { ssr: false });
import AddFileModal from "@/components/songs/AddFileModal";
import SongInfoModal from "@/components/songs/SongInfoModal";
import ChartPreviewModal from "@/components/songs/ChartPreviewModal";
import TransposeModal from "@/components/songs/TransposeModal";

const METERS = ["none", "2/2", "2/4", "3/2", "3/4", "4/2", "4/4", "5/4", "6/4", "3/8", "6/8", "7/4", "7/8", "9/8", "12/4", "12/8"];

export default function SongDetail() {
  const { id } = useParams();
  const router = useRouter();
  const player = usePlayer();
  const [song, setSong] = useState(null);
  const [arrId, setArrId] = useState(null);
  const [arr, setArr] = useState(null);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState(null); // 'seq'|'key'|'arr'|'file'|'info'
  const [manageArr, setManageArr] = useState(null); // aranjamentul de gestionat (modal)
  const [selKeys, setSelKeys] = useState(() => new Set()); // filtru game (gol = toate); reset la refresh
  const [showCT, setShowCT] = useState(false); // container Click Track
  const [ctDefaults, setCtDefaults] = useState(null);
  const colsRef = useRef(null);
  const [scroll, setScroll] = useState({ left: false, right: false });
  const [editField, setEditField] = useState(null); // 'bpm'|'length'|'name'
  const [preview, setPreview] = useState(null); // { mode, targetKey } pt. ChartPreviewModal
  const [transposeFor, setTransposeFor] = useState(null); // fișierul de transpus
  const [renameFor, setRenameFor] = useState(null); // fișierul de redenumit
  const [renameVal, setRenameVal] = useState("");
  const [deleteFor, setDeleteFor] = useState(null); // fișierul de șters (confirmare)
  const [deleteKeyFor, setDeleteKeyFor] = useState(null); // gama (cheia) de șters cu tot cu fișiere
  const [toast, setToast] = useState("");
  const [jobs, setJobs] = useState([]); // joburi de transpose audio (progres)
  const [fileMenu, setFileMenu] = useState(null); // UN SINGUR panou de acțiuni: { f, top, left }
  const fileMenuT = useRef(null);
  const openFileMenu = (f, el) => {
    if (fileMenuT.current) { clearTimeout(fileMenuT.current); fileMenuT.current = null; }
    if (!el) return;
    const r = el.getBoundingClientRect();
    setFileMenu({ f, top: r.top + r.height / 2, left: r.left });
  };
  const closeFileMenuSoon = () => {
    if (fileMenuT.current) clearTimeout(fileMenuT.current);
    fileMenuT.current = setTimeout(() => setFileMenu(null), 70); // punte scurtă (10px gap)
  };
  useEffect(() => () => { if (fileMenuT.current) clearTimeout(fileMenuT.current); }, []);

  // Popover „info / opțiuni rapide" (gama detectată + redenumire) — un singur popover.
  const [infoFor, setInfoFor] = useState(null); // { f, top, left }
  const [infoName, setInfoName] = useState("");
  const [detBusy, setDetBusy] = useState(false);
  const openInfo = (f, el) => {
    const r = el.getBoundingClientRect();
    setInfoFor({ f, top: r.bottom + 6, left: Math.min(r.right, (typeof window !== "undefined" ? window.innerWidth : 9999) - 16) });
    setInfoName(f.name || "");
  };
  const closeInfo = () => setInfoFor(null);
  const fileIsAudio = (f) => isAudioUrl(f?.url, f?.kind) || isYouTube(f?.url);
  const saveInfoName = async () => {
    const f = infoFor?.f; if (!f) return;
    const nm = infoName.trim(); if (!nm || nm === f.name) { closeInfo(); return; }
    try { await songsApi.patchFile(id, arrId, f.id, { name: nm }); await loadArr(); setToast("Nume actualizat ✓"); setTimeout(() => setToast(""), 2000); }
    catch (e) { setToast("Eroare: " + (e?.message || e)); setTimeout(() => setToast(""), 3000); }
    closeInfo();
  };
  const detectNow = async () => {
    const f = infoFor?.f; if (!f || !f.url || isYouTube(f.url)) return;
    setDetBusy(true);
    try {
      const ab = await fetchAudioBuffer(f.url);
      const d = await detectKey(ab);
      if (!d) { setToast("Nu am putut detecta gama."); setTimeout(() => setToast(""), 3000); return; }
      await songsApi.patchFile(id, arrId, f.id, { detectedKey: d.display, detectedLabel: d.label, detectedConf: d.conf });
      await loadArr();
      setInfoFor((cur) => (cur ? { ...cur, f: { ...cur.f, detectedKey: d.display, detectedLabel: d.label, detectedConf: d.conf } } : cur));
    } catch (e) { setToast("Detecție eșuată (CORS/format?): " + (e?.message || e)); setTimeout(() => setToast(""), 3500); }
    finally { setDetBusy(false); }
  };
  const applyLabelToName = async () => {
    const f = infoFor?.f; if (!f || !f.detectedLabel) return;
    const nm = `${(f.name || "").replace(/\s+in\s+\S+\s*$/i, "").trim()} in ${f.detectedLabel}`;
    try { await songsApi.patchFile(id, arrId, f.id, { name: nm }); await loadArr(); setToast(`„in ${f.detectedLabel}" adăugat ✓`); setTimeout(() => setToast(""), 2000); }
    catch (e) { setToast("Eroare: " + (e?.message || e)); setTimeout(() => setToast(""), 3000); }
    closeInfo();
  };

  const isChart = (f) => ["chordChart", "lyrics", "numbers", "numerals"].includes(f.kind);

  // Click pe nume: audio/YouTube → player intern; chart generat → preview in-app; altfel url/editor.
  const openFile = (f) => {
    if (isAudioUrl(f.url, f.kind) || isYouTube(f.url)) { player.play(f); return; }
    if (f.source === "generated" && isChart(f)) {
      let mode = "chords", targetKey = "";
      if (f.kind === "numbers") mode = "numbers";
      else if (f.kind === "numerals") mode = "numerals";
      else if (f.kind === "lyrics") mode = "lyrics";
      else { mode = "chords"; const m = /in\s+(\S+)/i.exec(f.name || ""); targetKey = m ? m[1] : ""; }
      setPreview({ mode, targetKey });
    } else if (f.url) window.open(f.url, "_blank", "noopener");
    else router.push(`/chords/${id}/${arrId}`);
  };

  const editFile = (f) => {
    if (f.source === "generated" && isChart(f)) { router.push(`/chords/${id}/${arrId}`); return; }
    setRenameVal(f.name || ""); setRenameFor(f);
  };
  const doRename = async () => {
    if (!renameFor || !renameVal.trim()) return;
    await songsApi.patchFile(id, arrId, renameFor.id, { name: renameVal.trim() });
    setRenameFor(null); await loadArr();
  };
  const downloadFile = (f) => { if (f.url) window.open(f.url, "_blank", "noopener"); };
  const confirmDelete = async () => {
    if (!deleteFor) return;
    await songsApi.deleteFile(id, arrId, deleteFor.id);
    setDeleteFor(null); await loadArr();
  };
  const confirmDeleteKey = async () => {
    if (!deleteKeyFor) return;
    try { await songsApi.deleteKey(id, arrId, deleteKeyFor.id); setDeleteKeyFor(null); await loadArr(); setToast("Gamă ștearsă ✓"); setTimeout(() => setToast(""), 2000); }
    catch (e) { setToast("Eroare: " + (e?.message || e)); setTimeout(() => setToast(""), 3000); }
  };

  // Transpose: chart-uri generate (PDF din ChordPro) SAU audio/YouTube (job de pitch-shift).
  const transposeFile = (f) => {
    if (isAudioUrl(f.url, f.kind) || isYouTube(f.url)) { setTransposeFor(f); return; }
    if (f.source !== "generated" || !isChart(f)) { setToast("Transpose merge la chart-urile generate (din Lyrics & Chords) sau la audio/YouTube."); setTimeout(() => setToast(""), 3800); return; }
    setTransposeFor(f);
  };

  const startAudioTranspose = async (f, targetKey) => {
    try {
      let fromKey = "C";
      try { const cc = await api.get(`/songs/${id}/arrangements/${arrId}/chordchart`); fromKey = cc.originalKey || "C"; } catch {}
      const r = await songsApi.transposeAudio(id, arrId, { sourceFileId: f.id, fromKey, toKey: targetKey });
      setJobs((js) => [...js, { jobId: r.jobId, name: r.name || `${f.name}-${targetKey}`, phase: "start", percent: 0, done: false, error: "" }]);
    } catch (e) { setToast("Nu pot porni transpunerea: " + (e?.message || e)); setTimeout(() => setToast(""), 4000); }
  };

  const doTranspose = async (targetKey) => {
    const f = transposeFor; if (!f) { return; }
    setTransposeFor(null);
    if (isAudioUrl(f.url, f.kind) || isYouTube(f.url)) { return startAudioTranspose(f, targetKey); }
    try {
      const cc = await api.get(`/songs/${id}/arrangements/${arrId}/chordchart`);
      const originalKey = cc.originalKey || "C";
      const mode = f.kind === "numbers" ? "numbers" : f.kind === "numerals" ? "numerals" : f.kind === "lyrics" ? "lyrics" : "chords";
      const lines = renderChordPro(cc.chordpro || "", { mode, originalKey, targetKey });
      const seqTokens = abbreviateSequence(arr?.sequence || []);
      const blob = await generateChartPdf({ title: song?.title, keyLabel: mode === "chords" ? targetKey : (mode[0].toUpperCase() + mode.slice(1)), bpm: arr?.bpm, meter: arr?.meter, arrName: arr?.name, author: song?.author, seqTokens, lines, chordColorHex: "#0921ff", fontSize: 16 });
      const base = (f.name || "Chart").replace(/\s*in\s+\S+$/i, "").replace(/-\S+$/, "").trim();
      const name = `${base}-${targetKey}`;
      // asigură cardul gamei țintă
      let key = (arr?.keys || []).find((k) => k.startKey === targetKey);
      if (!key) { const r = await songsApi.addKey(id, arrId, { startKey: targetKey }); key = { id: r.id, startKey: targetKey }; }
      // înlocuiește un transpose anterior cu același nume în acea cheie
      const fresh = await songsApi.arrangement(id, arrId);
      const fk = (fresh.keys || []).find((k) => k.startKey === targetKey);
      for (const o of ((fk?.files) || []).filter((x) => x.source === "generated" && x.name === name)) { try { await songsApi.deleteFile(id, arrId, o.id); } catch {} }
      const up = await songsApi.uploadBlob(blob, `${name}.pdf`, "raw");
      await songsApi.addFile(id, arrId, { name, url: up.url, kind: f.kind, source: "generated", keyId: key.id });
      await loadArr();
      setToast(`Transpus în ${targetKey} ✓`); setTimeout(() => setToast(""), 2500);
    } catch (e) { setToast("Eroare la transpose: " + (e?.message || e)); setTimeout(() => setToast(""), 3500); }
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

  // Poller pt. joburile de transpose audio (fază + procent în timp real).
  useEffect(() => {
    const active = jobs.filter((j) => !j.done && !j.error);
    if (!active.length) return;
    const iv = setInterval(async () => {
      for (const j of active) {
        try {
          const s = await songsApi.transposeAudioStatus(id, arrId, j.jobId);
          setJobs((cur) => cur.map((x) => (x.jobId === j.jobId ? { ...x, ...s } : x)));
          if (s.done) loadArr();
        } catch { setJobs((cur) => cur.map((x) => (x.jobId === j.jobId ? { ...x, error: "status indisponibil" } : x))); }
      }
    }, 1800);
    return () => clearInterval(iv);
  }, [jobs, id, arrId, loadArr]);

  // ── edits ──
  const patchArr = async (payload) => { await songsApi.updateArrangement(id, arrId, payload); await loadArr(); await loadSong(); };
  const saveSequence = async (seq) => { await patchArr({ sequence: seq }); setModal(null); };
  const addKey = async (payload) => { await songsApi.addKey(id, arrId, payload); setModal(null); await loadArr(); };
  const addArrangement = async (payload) => { const r = await songsApi.addArrangement(id, payload); setModal(null); setArrId(r.id); await loadSong(); };
  const saveInfo = async (payload) => { await songsApi.patchSong(id, payload); setModal(null); await loadSong(); };
  const onManageDone = async (res) => {
    setManageArr(null);
    if (res?.deleted && res.deleted === arrId) {
      // aranjamentul curent a fost șters → comută pe primul rămas
      const s = await songsApi.get(id); setSong(s); setArrId(s.arrangements?.[0]?.id || null);
    } else { await loadSong(); }
  };

  // Deschide Click Track preluând implicit gama (din chord chart), BPM-ul și măsura aranjamentului.
  const openClickTrack = () => {
    const ok = String(arr?.chordChart?.originalKey || "").trim();
    const isMinor = /m(in)?$/i.test(ok) && !/maj/i.test(ok);
    let key = ok.replace(/m(in)?$/i, "").replace(/maj$/i, "").trim() || "C";
    const sharp = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };
    if (sharp[key]) key = sharp[key];
    setCtDefaults({ key, mode: isMinor ? "minor" : "major", bpm: arr?.bpm || 72, meter: arr?.meter || "4/4" });
    setShowCT(true);
  };

  // ── Carusel game + filtru multi-select ──
  const updateScroll = useCallback(() => {
    const el = colsRef.current; if (!el) return;
    setScroll({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  const scrollCols = (dir) => { const el = colsRef.current; if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" }); };
  const toggleKey = (kid) => setSelKeys((cur) => { const n = new Set(cur); n.has(kid) ? n.delete(kid) : n.add(kid); return n; });
  useEffect(() => { setSelKeys(new Set()); }, [arrId]); // filtrele sunt per-aranjament
  useEffect(() => {
    const raf = requestAnimationFrame(updateScroll);
    const on = () => updateScroll();
    window.addEventListener("resize", on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", on); };
  }, [updateScroll, arr, selKeys]);

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
            <div key={a.id} className={`side-link arr-row ${a.id === arrId ? "sel" : ""}`} onClick={() => setArrId(a.id)}>
              <span className="arr-name">{a.name}</span>
              <button className="arr-gear" title="Gestionează aranjamentul" onClick={(e) => { e.stopPropagation(); setManageArr(a); }}><Ico name="gear" size={14} /></button>
            </div>
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
                <button className="ic" title="Gestionează aranjamentul (prioritate, ștergere)" onClick={() => { const a = (song.arrangements || []).find((x) => x.id === arrId); if (a) setManageArr(a); }}><Ico name="gear" size={15} /></button>
                <button className="ct-open" onClick={openClickTrack} title="Pad de pian + metronom live">Click Track</button>
              </div>

              <div className="specs">
                <span>Length: {editField === "length" ? (
                  <input className="spec-in" defaultValue={arr.lengthLabel} autoFocus
                    onBlur={async (e) => { const [m, s] = e.target.value.split(":").map(Number); await patchArr({ lengthSec: (m || 0) * 60 + (s || 0) }); setEditField(null); }}
                    onKeyDown={(e) => e.key === "Enter" && e.target.blur()} />
                ) : <b onClick={() => setEditField("length")}>{arr.lengthLabel || "0:00"}</b>}</span>
                <span>BPM: {editField === "bpm" ? (
                  <input className="spec-in" type="number" defaultValue={arr.bpm || ""} autoFocus
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

              <div className="file-cols-wrap">
                {scroll.left && <button className="car-arrow left" onClick={() => scrollCols(-1)} aria-label="Înapoi"><Ico name="chevL" size={18} /></button>}
                <div className="file-cols" ref={colsRef} onScroll={updateScroll}>
                  <div className="fcol">
                    <div className="fcol-h">Arrangement</div>
                    {(arr.arrangementFiles || []).map((f) => <FileRow key={f.id} f={f} onOpen={() => openFile(f)} onHover={openFileMenu} onLeave={closeFileMenuSoon} onInfo={openInfo} />)}
                    {(arr.arrangementFiles || []).length === 0 && <div className="fcol-empty" />}
                  </div>
                  {(arr.keys || []).filter((k) => selKeys.size === 0 || selKeys.has(k.id)).map((k) => (
                    <div key={k.id} className="fcol">
                      <div className="fcol-h">
                        <span>{k.label || k.startKey}</span>
                        <button className="fcol-del" title="Șterge gama (cu toate fișierele ei)" onClick={() => setDeleteKeyFor(k)}><Ico name="trash" size={13} /></button>
                      </div>
                      {(k.files || []).filter((f) => !f.derived).map((f) => <FileRow key={f.id} f={f} onOpen={() => openFile(f)} onHover={openFileMenu} onLeave={closeFileMenuSoon} onInfo={openInfo} />)}
                    </div>
                  ))}
                </div>
                {scroll.right && <button className="car-arrow right" onClick={() => scrollCols(1)} aria-label="Înainte"><Ico name="chevR" size={18} /></button>}
              </div>

              <div className="file-tabs">
                <span className={`ftab ${selKeys.size === 0 ? "active" : ""}`} onClick={() => setSelKeys(new Set())} title="Arată toate gamele">Arrangement</span>
                {(arr.keys || []).map((k) => (
                  <span key={k.id} className={`ftab key ${selKeys.has(k.id) ? "sel" : ""}`} onClick={() => toggleKey(k.id)} title="Filtrează după această gamă (click din nou = scoate)">{k.label || k.startKey}</span>
                ))}
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
      {manageArr && (
        <ArrangementModal songId={id} arrangement={manageArr} arrangements={song.arrangements || []}
          onClose={() => setManageArr(null)} onDone={onManageDone} />
      )}
      {showCT && <ClickTrackBar defaults={ctDefaults} playerActive={!!player.track} onClose={() => setShowCT(false)} />}
      {preview && <ChartPreviewModal songId={id} arrId={arrId} song={song} arr={arr} mode={preview.mode} targetKey={preview.targetKey} onClose={() => setPreview(null)} />}
      {transposeFor && <TransposeModal file={transposeFor} onClose={() => setTransposeFor(null)} onPick={doTranspose} />}
      {renameFor && (
        <div className="ov-min" onMouseDown={(e) => e.target === e.currentTarget && setRenameFor(null)}>
          <div className="mini">
            <h3>Redenumește fișier</h3>
            <input className="input" value={renameVal} autoFocus onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doRename()} />
            <div className="mini-foot"><button className="btn btn-link" onClick={() => setRenameFor(null)}>Anulează</button><button className="btn btn-primary" onClick={doRename}>Salvează</button></div>
          </div>
        </div>
      )}
      {deleteFor && (
        <div className="ov-min" onMouseDown={(e) => e.target === e.currentTarget && setDeleteFor(null)}>
          <div className="mini">
            <h3>Ștergi definitiv?</h3>
            <p className="mini-p">„{deleteFor.name}" va fi șters <b>definitiv</b> din baza de date. Ireversibil.</p>
            <div className="mini-foot"><button className="btn btn-link" onClick={() => setDeleteFor(null)}>Anulează</button><button className="btn btn-danger" onClick={confirmDelete}>Șterge definitiv</button></div>
          </div>
        </div>
      )}
      {deleteKeyFor && (
        <div className="ov-min" onMouseDown={(e) => e.target === e.currentTarget && setDeleteKeyFor(null)}>
          <div className="mini">
            <h3>Ștergi gama?</h3>
            <p className="mini-p">Gama „{deleteKeyFor.label || deleteKeyFor.startKey}" și <b>toate fișierele</b> din ea se șterg <b>definitiv</b>. Ireversibil.</p>
            <div className="mini-foot"><button className="btn btn-link" onClick={() => setDeleteKeyFor(null)}>Anulează</button><button className="btn btn-danger" onClick={confirmDeleteKey}>Șterge definitiv</button></div>
          </div>
        </div>
      )}
      {fileMenu && (
        /* UN SINGUR panou, position:fixed (scapă de overflow), în stânga rândului; se repoziționează, nu se stivuiește */
        <div className="fr-actions" style={{ top: fileMenu.top, left: fileMenu.left }}
          onMouseEnter={() => { if (fileMenuT.current) { clearTimeout(fileMenuT.current); fileMenuT.current = null; } }}
          onMouseLeave={closeFileMenuSoon}>
          <button onClick={(e) => { e.stopPropagation(); editFile(fileMenu.f); }} title="Editează"><Ico name="edit" /></button>
          <button onClick={(e) => { e.stopPropagation(); transposeFile(fileMenu.f); }} title="Transpune"><Ico name="transpose" /></button>
          <button onClick={(e) => { e.stopPropagation(); downloadFile(fileMenu.f); }} title="Descarcă"><Ico name="download" /></button>
          <button className="trash" onClick={(e) => { e.stopPropagation(); setDeleteFor(fileMenu.f); }} title="Șterge definitiv"><Ico name="trash" /></button>
        </div>
      )}
      {infoFor && (
        <div className="info-wrap" onClick={closeInfo}>
          <div className="info-pop" style={{ top: infoFor.top, left: infoFor.left }} onClick={(e) => e.stopPropagation()}>
            <div className="info-top">
              <span className="info-h">Opțiuni rapide</span>
              <button className="info-x" onClick={closeInfo} aria-label="Închide">✕</button>
            </div>
            <div className="info-det">
              {infoFor.f.detectedKey ? (
                <>Gama detectată: <b>{infoFor.f.detectedKey}</b> <span className="info-conf">· {Math.round((infoFor.f.detectedConf || 0) * 100)}% (estimare)</span></>
              ) : fileIsAudio(infoFor.f) && !isYouTube(infoFor.f.url) ? (
                <button className="info-btn" onClick={detectNow} disabled={detBusy}>{detBusy ? "Detectez…" : "Detectează gama (estimare)"}</button>
              ) : (
                <span className="info-conf">Gama detectată: — (doar pentru fișiere audio)</span>
              )}
            </div>
            {infoFor.f.detectedLabel && !/\s+in\s+\S+\s*$/i.test(infoFor.f.name || "") && (
              <button className="info-btn sub" onClick={applyLabelToName}>Adaugă „in {infoFor.f.detectedLabel}" la nume</button>
            )}
            <label className="info-lbl">Nume fișier</label>
            <div className="info-row">
              <input className="info-in" value={infoName} onChange={(e) => setInfoName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveInfoName(); if (e.key === "Escape") closeInfo(); }} autoFocus />
              <button className="info-save" onClick={saveInfoName}>Salvează</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="song-toast">{toast}</div>}
      {jobs.length > 0 && (
        <div className="job-stack">
          {jobs.map((j) => {
            const label = j.error ? "Eroare" : { start: "Se pornește…", download: "Descărcare", transpose: "Transpunere", upload: "Încărcare", done: "Gata ✓" }[j.phase] || j.phase;
            const pct = Math.max(0, Math.min(100, j.percent || 0));
            return (
              <div key={j.jobId} className={`job-card${j.error ? " err" : ""}${j.done ? " ok" : ""}`}>
                <div className="job-top">
                  <span className="job-name" title={j.name}>{j.name}</span>
                  <button className="job-x" onClick={() => setJobs((cur) => cur.filter((x) => x.jobId !== j.jobId))} aria-label="Închide">✕</button>
                </div>
                <div className="job-lbl">{label}{!j.done && !j.error && j.phase !== "start" ? ` · ${pct}%` : ""}{j.error ? ` · ${j.error}` : ""}</div>
                {!j.error && <div className="job-bar"><div className="job-fill" style={{ width: `${j.done ? 100 : pct}%` }} /></div>}
              </div>
            );
          })}
        </div>
      )}
      <style jsx>{`
        .job-stack { position: fixed; right: 18px; bottom: 86px; z-index: 76; display: flex; flex-direction: column; gap: 10px; width: 300px; max-width: calc(100vw - 36px); }
        .job-card { background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; padding: 11px 12px; box-shadow: 0 10px 28px rgba(0,0,0,.5); }
        .job-card.ok { border-color: #1f8a4c; }
        .job-card.err { border-color: var(--danger); }
        .job-top { display: flex; align-items: center; gap: 8px; }
        .job-name { font-size: 12.5px; color: var(--text); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
        .job-x { background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 12px; padding: 0 2px; }
        .job-x:hover { color: var(--text); }
        .job-lbl { font-size: 11.5px; color: var(--text-dim); margin: 4px 0 7px; }
        .job-bar { height: 5px; background: var(--surface-2); border-radius: 3px; overflow: hidden; }
        .job-fill { height: 100%; background: var(--primary); border-radius: 3px; transition: width .3s ease; }
        .job-card.ok .job-fill { background: #1f8a4c; }
      `}</style>
      <style jsx>{`
        .ov-min { position: fixed; inset: 0; z-index: 65; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; padding: 16px; }
        .mini { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 10px; padding: 20px; width: 400px; max-width: 100%; }
        .mini h3 { margin: 0 0 12px; font-size: 17px; }
        .mini-p { color: var(--text-dim); font-size: 13px; line-height: 1.5; margin: 0 0 16px; }
        .mini-foot { display: flex; justify-content: flex-end; gap: 14px; margin-top: 16px; }
        :global(.btn-danger) { background: var(--danger); color: #fff; border-color: var(--danger); }
        :global(.btn-danger:hover) { filter: brightness(1.1); }
        .song-toast { position: fixed; bottom: 86px; left: 50%; transform: translateX(-50%); z-index: 75; background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text); padding: 10px 16px; border-radius: 8px; font-size: 13px; box-shadow: 0 10px 28px rgba(0,0,0,.5); }
        /* Panou de acțiuni fișier — în STÂNGA rândului; position:fixed => nu e tăiat de overflow. */
        .fr-actions { position: fixed; transform: translate(-100%, -50%); margin-left: -10px; display: flex; gap: 2px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; padding: 3px; box-shadow: 0 6px 18px rgba(0,0,0,.45); white-space: nowrap; z-index: 80; }
        .fr-actions button { background: transparent; border: none; color: var(--text-dim); width: 28px; height: 28px; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .fr-actions button:hover { background: var(--surface-2); color: var(--text); }
        .fr-actions .trash:hover { background: rgba(229,83,75,.18); color: #f0a7a2; }
        /* Popover info / opțiuni rapide */
        .info-wrap { position: fixed; inset: 0; z-index: 82; }
        .info-pop { position: fixed; transform: translateX(-100%); width: 280px; max-width: calc(100vw - 24px); background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; padding: 12px; box-shadow: 0 14px 40px rgba(0,0,0,.55); }
        .info-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .info-h { font-size: 12px; letter-spacing: .4px; color: var(--text-faint); text-transform: uppercase; }
        .info-x { background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 12px; }
        .info-x:hover { color: var(--text); }
        .info-det { font-size: 13px; color: var(--text-dim); margin-bottom: 10px; }
        .info-det b { color: var(--text); }
        .info-conf { color: var(--text-faint); }
        .info-btn { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 7px 10px; cursor: pointer; font-size: 12.5px; width: 100%; }
        .info-btn:hover { border-color: var(--primary); }
        .info-btn.sub { margin-bottom: 10px; color: var(--primary); }
        .info-lbl { display: block; font-size: 11.5px; color: var(--text-faint); margin: 0 0 5px; }
        .info-row { display: flex; gap: 6px; }
        .info-in { flex: 1; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 7px 9px; font-size: 13px; min-width: 0; }
        .info-save { background: var(--primary); border: none; color: #fff; border-radius: 6px; padding: 0 12px; cursor: pointer; font-size: 12.5px; }
      `}</style>

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
        .arr-row { display: flex; align-items: center; gap: 8px; }
        .arr-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .arr-gear { display: none; background: transparent; border: none; color: var(--text-faint); cursor: pointer; padding: 2px; align-items: center; }
        .side-link:hover .arr-gear { display: inline-flex; }
        .arr-gear:hover { color: var(--text); }
        .side-add { margin-top: 10px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; padding: 6px 14px; cursor: pointer; }
        .arr-title-row { display: flex; align-items: center; gap: 10px; }
        .arr-title { font-size: 22px; font-weight: 600; margin: 0; }
        .ic { background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 14px; }
        .ct-open { margin-left: auto; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 999px; padding: 6px 16px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .ct-open:hover { background: var(--surface-3); border-color: var(--text-faint); }
        .specs { display: flex; gap: 26px; color: var(--text-dim); font-size: 15px; margin: 14px 0 10px; align-items: center; }
        .specs b { color: var(--text); cursor: pointer; }
        .spec-in { width: 70px; height: 26px; background: var(--surface-2); border: 1px solid var(--primary); border-radius: 4px; color: var(--text); padding: 0 6px; }
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
        .file-cols-wrap { position: relative; }
        .file-cols { display: flex; gap: 2px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px 8px 0 0; padding: 14px; overflow-x: auto; scroll-behavior: smooth; scrollbar-width: none; }
        .file-cols::-webkit-scrollbar { height: 0; }
        .fcol { flex: 1; min-width: 220px; border-right: 1px solid var(--border); padding: 0 14px; }
        .fcol:last-child { border-right: none; }
        .fcol-h { color: var(--text-dim); font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 20px; }
        .fcol-del { display: none; background: transparent; border: none; color: var(--text-faint); cursor: pointer; padding: 2px; align-items: center; }
        .fcol:hover .fcol-del { display: inline-flex; }
        .fcol-del:hover { color: #f0a7a2; }
        .fcol-empty { min-height: 120px; }
        .car-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; border-radius: 50%; background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; z-index: 15; box-shadow: 0 4px 14px rgba(0,0,0,.45); }
        .car-arrow.left { left: 6px; } .car-arrow.right { right: 6px; }
        .car-arrow:hover { border-color: var(--primary); color: var(--primary); }
        .file-tabs { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px; padding: 10px 16px; margin-bottom: 26px; flex-wrap: wrap; }
        .ftab { font-size: 13px; color: var(--text-dim); cursor: pointer; }
        .ftab.active { color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 3px; }
        .ftab.key { padding: 3px 11px; border-radius: 999px; border: 1px solid transparent; transition: color .15s, border-color .15s, background .15s; }
        .ftab.key:hover { color: var(--text); }
        .ftab.key.sel { color: var(--primary); border-color: var(--primary); background: rgba(47,129,247,.12); }
        .addkey { margin-left: 4px; background: transparent; border: none; color: var(--primary); cursor: pointer; font-size: 13px; }
        .three { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
        .panel { border: 1px solid var(--border); border-radius: 8px; padding: 14px; min-height: 90px; }
        .panel-h { font-weight: 600; margin-bottom: 8px; }
        .panel-sub { font-size: 13px; }
      `}</style>
    </div>
  );
}

function FileRow({ f, onOpen, onHover, onLeave, onInfo }) {
  const iconName = f.kind === "audio" ? "audio" : f.kind === "lyrics" ? "lyrics" : f.kind === "link" ? "play"
    : (f.kind === "chordChart" || f.kind === "numbers" || f.kind === "numerals") ? "chart" : "file";
  return (
    <div className="frow" onMouseEnter={(e) => onHover(f, e.currentTarget)} onMouseLeave={onLeave}>
      <button className="fl fl-btn" onClick={onOpen} title="Deschide / rulează">
        <span className="fi"><Ico name={iconName} size={15} /></span>
        <span className="fn">{f.name}</span>
      </button>
      <button className="fr-info" title="Info / opțiuni rapide" onClick={(e) => { e.stopPropagation(); onInfo(f, e.currentTarget); }}>
        <Ico name="info" size={15} />
      </button>
      <style jsx>{`
        .frow { position: relative; padding: 6px 0; }
        .fl { display: flex; align-items: center; gap: 8px; color: var(--text); font-size: 13px; }
        .fl:hover { color: var(--text-link); }
        .fl-btn { background: transparent; border: none; cursor: pointer; padding: 0; text-align: left; width: 100%; }
        .fi { color: var(--text-dim); display: inline-flex; align-items: center; }
        .fn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .fr-info { position: absolute; right: 2px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text-dim); cursor: pointer; z-index: 20; }
        .frow:hover .fr-info { display: inline-flex; }
        .fr-info:hover { color: var(--text); border-color: var(--primary); }
      `}</style>
    </div>
  );
}

/* Set de iconițe SVG (stil Lucide) — curate și sugestive, nu glife „cheap". */
function Ico({ name, size = 16 }) {
  const paths = {
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
    transpose: <><path d="m3 8 4-4 4 4" /><path d="M7 4v16" /><path d="m21 16-4 4-4-4" /><path d="M17 20V4" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
    info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
    audio: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m7 14 3-3 3 3 5-5" /></>,
    lyrics: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h10" /></>,
    play: <><polygon points="6 3 20 12 6 21 6 3" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    chevL: <><path d="m15 18-6-6 6-6" /></>,
    chevR: <><path d="m9 18 6-6-6-6" /></>,
  }[name] || null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths}
    </svg>
  );
}
