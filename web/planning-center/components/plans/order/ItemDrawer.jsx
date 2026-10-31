"use client";
/**
 * Drawer „View item" (dreapta) — identic PCO. Title + timp + placement + Description + lideri +
 * taburi Notes / Detail / Song / Media / Files. Autosave (PATCH la blur/change). Delete.
 * Panou fixat dreapta (360px) — pagina îi face loc prin `.pd.has-side` (onSideChange).
 * Voci structurate + toggle tranziție se adaugă în Faza 2/3 (secțiuni marcate mai jos).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { plansApi, songsApi } from "@/lib/api/client";
import PersonAvatar from "@/components/plans/PersonAvatar";
import VoicesPicker from "./VoicesPicker";
import MinistriesPicker from "./MinistriesPicker";
import TransitionEditor from "./TransitionEditor";
import LightsEditor from "./LightsEditor";
import MedleyEditor from "./MedleyEditor";

// „+ Tranziție" (quick-insert): creează un ELEMENT simplu dedesubt, cu titlu fix, fără lead.
const QUICK_TRANS = [
  { k: "prayer", label: "Tranziție cu rugăciune", title: "Rugăciune cu biserică" },
  { k: "word", label: "Tranziție verbală", title: "Tranziție prin cuvânt" },
];
import LinkSongModal from "./LinkSongModal";
import Skeleton from "@/components/ui/Skeleton";
import dynamic from "next/dynamic";
import { usePlayer, isAudioUrl, isYouTube } from "@/lib/player/PlayerProvider";
import ChartPreviewModal from "@/components/songs/ChartPreviewModal";
import { abbreviateSequence } from "@/lib/songs/sequence";
const ClickTrackBar = dynamic(() => import("@/components/songs/ClickTrackBar"), { ssr: false });

// Tab-uri jos (fără „Media" — scos). Files mereu primul.
const TABS = ["Files", "Song", "Detail", "Notes"];
// Chart generat (din ChordPro) → preview in-app identic cu Songs; altfel PDF/url → viewer in-app (iframe).
const isChartFile = (f) => ["chordChart", "lyrics", "numbers", "numerals", "words"].includes(f?.kind);
const isGenChart = (f) => isChartFile(f) && (f.source === "generated" || f.source === "chordpro" || f.derived);
const splitLen = (s) => ({ m: Math.floor((s || 0) / 60), s: (s || 0) % 60 });

export default function ItemDrawer({ planId, itemId, canEdit = false, onClose, onChanged, flash }) {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("Files");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [mm, setMm] = useState(0);
  const [ss, setSs] = useState(0);
  const [song, setSong] = useState(null);    // songsApi.get
  const [arr, setArr] = useState(null);       // songsApi.arrangement (keys + files + sequence)
  const [placeOpen, setPlaceOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadQ, setLeadQ] = useState("");
  const [leadRes, setLeadRes] = useState(null);
  const [notes, setNotes] = useState(null);
  const [voices, setVoices] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [trans, setTrans] = useState({ kind: "", key: "", lights: [], prayer: null });
  const [lights, setLights] = useState([]);           // lumini pe item (orice tip)
  const [lightsTiming, setLightsTiming] = useState("after");
  const [lightsAdded, setLightsAdded] = useState(false); // afișează containerul chiar gol
  const [lightsOpen, setLightsOpen] = useState(true);    // expand/collapse container lumini
  const [mPool, setMPool] = useState({ week: [], preachers: [], byKind: {} });
  const [pool, setPool] = useState([]);
  const [linkModal, setLinkModal] = useState(false); // „Add a song" (import arrangement + gamă)
  const [qtOpen, setQtOpen] = useState(false); // meniul „+ Tranziție"
  const lt = useRef(null);
  // Player + click track + preview (reutilizate din Songs)
  const player = usePlayer();
  const [showCT, setShowCT] = useState(false);
  const [ctDefaults, setCtDefaults] = useState(null);
  const [preview, setPreview] = useState(null);     // { mode, targetKey } → ChartPreviewModal
  const [pdfUrl, setPdfUrl] = useState(null);        // viewer in-app pt. PDF/url încărcat
  const [notesDraft, setNotesDraft] = useState("");  // Notes aranjament (view+edit, se propagă în librărie)
  const [notesSaving, setNotesSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await plansApi.itemDetail(planId, itemId);
      setD(r); setTitle(r.title || ""); setDesc(r.description || ""); setVoices(r.voices || []); setMinistries(r.ministries || []);
      setTrans(r.transition || { kind: "", key: "", lights: [], prayer: null });
      setLights(r.lights || []); setLightsTiming(r.lightsTiming || "after"); setLightsAdded(false); setLightsOpen(!(r.lights || []).length);
      const L = splitLen(r.lengthSec); setMm(L.m); setSs(L.s);
      plansApi.voicesPool(planId).then((pr) => setPool(pr.people || [])).catch(() => {});
      if (r.type === "item" || r.type === "transition") plansApi.ministryPool(planId).then((pr) => setMPool({ week: pr.week || [], preachers: pr.preachers || [], byKind: pr.byKind || {} })).catch(() => {});
      setTab("Files"); // David: Files mereu primul la deschidere
      if (r.songId) {
        songsApi.get(r.songId).then(setSong).catch(() => {});
        if (r.arrangementId) songsApi.arrangement(r.songId, r.arrangementId).then(setArr).catch(() => {});
      }
    } catch (e) { flash?.(e?.message || "Eroare la item."); }
  }, [planId, itemId, flash]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setNotesDraft(arr?.notes || ""); }, [arr?.notes, d?.arrangementId]);

  async function patch(payload, reloadOrder = false) {
    try { await plansApi.updateItem(planId, itemId, payload); if (reloadOrder) onChanged?.(); }
    catch (e) { flash?.(e?.message || "Eroare la salvare."); }
  }
  const saveTitle = () => { if (title !== (d?.title || "")) patch({ title }, true); };
  const saveDesc = () => { if (desc !== (d?.description || "")) patch({ description: desc }, true); };
  const saveLen = () => { const sec = (Number(mm) || 0) * 60 + (Number(ss) || 0); if (sec !== (d?.lengthSec || 0)) patch({ lengthSec: sec }, true); };
  function saveVoices(next) {
    setVoices(next);
    plansApi.updateItem(planId, itemId, { voices: next.map((v) => ({ role: v.role, personId: v.personId || undefined, name: v.personId ? undefined : (v.name || "") })) }).then(() => onChanged?.()).catch((e) => flash?.(e?.message || "Eroare."));
  }
  function saveMinistries(next) {
    setMinistries(next);
    plansApi.updateItem(planId, itemId, { ministries: next.map((m) => ({ kind: m.kind, personId: m.personId || undefined, name: m.personId ? undefined : (m.name || "") })) }).then(() => onChanged?.()).catch((e) => flash?.(e?.message || "Eroare."));
  }
  // Tip „transition": salvează kind (rugăciune/cuvânt) + gamă/lumini/rugăciune. `next` = { kind, key, autoKey, lights, prayerPersonId }.
  function saveTransition(next) {
    const wp = next.prayerPersonId ? mPool.week.find((p) => String(p.personId) === String(next.prayerPersonId)) : null;
    const prayerMini = wp ? { id: wp.personId, name: wp.name, avatar: wp.avatar, initials: wp.initials } : (next.prayerPersonId && trans.prayer ? trans.prayer : null);
    const merged = { kind: next.kind || "", key: next.key || "", autoKey: !!next.autoKey, keySource: trans.keySource || "", lights: next.lights || [], prayer: prayerMini };
    setTrans(merged);
    plansApi.updateItem(planId, itemId, { transition: { kind: merged.kind, key: merged.key, autoKey: merged.autoKey, lights: merged.lights, prayerPersonId: next.prayerPersonId || null } })
      .then(() => { onChanged?.(); return plansApi.itemDetail(planId, itemId); }) // re-rezolvă gama auto (din următorul cântec)
      .then((r) => { if (r?.transition) setTrans(r.transition); })
      .catch((e) => flash?.(e?.message || "Eroare."));
  }
  // Lumini pe item (orice tip, „+ Lumini"): culori + timing (before/after). Afișate sub descriere (sau row deasupra dacă „before").
  function saveLights(next) { setLights(next); plansApi.updateItem(planId, itemId, { lights: next }).then(() => onChanged?.()).catch((e) => flash?.(e?.message || "Eroare.")); }
  function saveLightsTiming(t) { setLightsTiming(t); plansApi.updateItem(planId, itemId, { lightsTiming: t }).then(() => onChanged?.()).catch((e) => flash?.(e?.message || "Eroare.")); }
  function addLightsBox() { setLightsAdded(true); setLightsOpen(true); }
  function removeLights() { setLightsAdded(false); saveLights([]); }

  // „+ Tranziție" (quick-insert): creează un element simplu (fără lead) imediat DEDESUBT, cu titlu fix.
  async function addQuickTransition(title) {
    setQtOpen(false);
    try { await plansApi.addItem(planId, { type: "item", title, afterItemId: itemId }); onChanged?.(); flash?.(`Adăugat dedesubt: „${title}".`); }
    catch (e) { flash?.(e?.message || "Eroare la adăugare."); }
  }

  async function changeArrangement(aid) {
    setArr(null);
    await patch({ arrangementId: aid, keyId: "" }, true);
    setD((x) => ({ ...x, arrangementId: aid, keyId: null }));
    if (d?.songId && aid) songsApi.arrangement(d.songId, aid).then(setArr).catch(() => {});
  }
  async function changeKey(kid) {
    await patch({ keyId: kid }, true);
    setD((x) => ({ ...x, keyId: kid }));
  }

  // „Add a song" — importă cântec + aranjament + gamă; SUPRASCRIE titlul + length-ul itemului din cântec.
  async function importSong({ songId, arrangementId, keyId, title, lengthSec }) {
    setLinkModal(false);
    try {
      await plansApi.updateItem(planId, itemId, { songId, arrangementId: arrangementId || "", keyId: keyId || "", title: title || undefined, lengthSec: lengthSec || 0 });
      await load(); onChanged?.(); setTab("Files"); flash?.("Cântec importat.");
    } catch (e) { flash?.(e?.message || "Eroare la import."); }
  }

  // Notes aranjament (view+edit → se propagă în librăria de cântece).
  const saveSongNotes = async () => {
    if (!d?.songId || !d?.arrangementId || (arr?.notes || "") === notesDraft) return;
    setNotesSaving(true);
    try { await songsApi.updateArrangement(d.songId, d.arrangementId, { notes: notesDraft }); setArr((a) => (a ? { ...a, notes: notesDraft } : a)); }
    catch (e) { flash?.(e?.message || "Nu am putut salva notițele."); }
    finally { setNotesSaving(false); }
  };

  // Click pe fișier (identic cu Songs): audio/YouTube → player; chart generat → preview in-app; PDF/url → viewer in-app.
  function openSongFile(f) {
    if (isAudioUrl(f.url, f.kind) || isYouTube(f.url)) { player.play(f); return; }
    if (isGenChart(f)) {
      let mode = "chords", targetKey = "";
      if (f.kind === "numbers") mode = "numbers"; else if (f.kind === "numerals") mode = "numerals";
      else if (f.kind === "lyrics") mode = "lyrics"; else if (f.kind === "words") mode = "words";
      else { mode = "chords"; targetKey = f.displayKey || (/(?:in\s+|-)([A-G][b#]?)m?\b/i.exec(f.name || "") || [])[1] || ""; }
      setPreview({ mode, targetKey }); return;
    }
    if (f.url) { setPdfUrl(f.url); return; } // PDF/orice url → preview in-app (NU download)
  }

  // Click Track — preia gama (din chord chart), BPM-ul și măsura aranjamentului (identic cu Songs).
  function openClickTrack() {
    const ok = String(arr?.chordChart?.originalKey || "").trim();
    const isMinor = /m(in)?$/i.test(ok) && !/maj/i.test(ok);
    let key = ok.replace(/m(in)?$/i, "").replace(/maj$/i, "").trim() || "C";
    const sharp = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };
    if (sharp[key]) key = sharp[key];
    setCtDefaults({ key, mode: isMinor ? "minor" : "major", bpm: arr?.bpm || 72, meter: arr?.meter || "4/4" });
    setShowCT(true);
  }

  async function del() {
    if (!confirm("Ștergi acest item din ordine?")) return;
    try { await plansApi.deleteItem(planId, itemId); onChanged?.(); onClose?.(); flash?.("Șters."); }
    catch (e) { flash?.(e?.message || "Eroare la ștergere."); }
  }

  // ── lideri ──
  useEffect(() => {
    if (!leadOpen) return;
    clearTimeout(lt.current);
    lt.current = setTimeout(async () => {
      try { setLeadRes(await plansApi.leaderSearch(planId, leadQ)); } catch { setLeadRes({ positions: [], people: [] }); }
    }, 220);
    return () => clearTimeout(lt.current);
  }, [leadQ, leadOpen, planId]);
  async function addLeader(payload) { setLeadOpen(false); setLeadQ(""); try { await plansApi.addLeader(planId, itemId, payload); await load(); onChanged?.(); } catch (e) { flash?.(e?.message || "Eroare."); } }
  async function removeLeader(l) { try { await plansApi.removeLeader(planId, itemId, l.id ? { personId: l.id } : { positionId: l.positionId }); await load(); onChanged?.(); } catch (e) { flash?.(e?.message || "Eroare."); } }

  // ── notes ──
  useEffect(() => { if (tab === "Notes" && notes === null) plansApi.itemNotes(planId, itemId).then((r) => setNotes(r.notes || [])).catch(() => setNotes([])); }, [tab, notes, planId, itemId]);
  async function addNote() { try { const r = await plansApi.addItemNote(planId, itemId, { content: "" }); setNotes((n) => [...(n || []), { id: r.id, content: "", category: "" }]); } catch (e) { flash?.(e?.message || "Eroare."); } }
  async function saveNote(nid, content) { try { await plansApi.updateItemNote(planId, itemId, nid, { content }); } catch (e) { flash?.(e?.message || "Eroare."); } }
  async function delNote(nid) { try { await plansApi.deleteItemNote(planId, itemId, nid); setNotes((n) => n.filter((x) => String(x.id) !== String(nid))); } catch (e) { flash?.(e?.message || "Eroare."); } }

  const ro = !canEdit;
  const keyFiles = arr && d?.keyId ? (arr.keys || []).find((k) => String(k.id) === String(d.keyId))?.files || [] : [];
  const hasItemLights = !!(lights.length || lightsAdded);
  const lightsHost = d && d.type !== "header" && d.type !== "transition"; // „+ Lumini" pe orice item (tranziția își are luminile în editor).

  return (
    <aside className="drawer">
      <div className="d-top">
        <button className="d-x" onClick={onClose} aria-label="Închide">✕</button>
        <div className="d-ttl">View item</div>
        {canEdit && <button className="d-del" onClick={del}>Șterge</button>}
      </div>

      {!d ? <div className="d-load"><Skeleton lines={4} /></div> : (
        <div className="d-scroll">
          <input className="d-title" value={title} disabled={ro} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} placeholder="Titlu" />

          {d.type !== "header" && (
          <div className="d-boxes">
            <div className="d-box">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5V8l2.4 1.6" /></svg>
              <input className="d-num" type="number" min="0" value={mm} disabled={ro} onChange={(e) => setMm(e.target.value)} onBlur={saveLen} /> <span className="d-u">min</span>
              <input className="d-num" type="number" min="0" max="59" value={ss} disabled={ro} onChange={(e) => setSs(e.target.value)} onBlur={saveLen} /> <span className="d-u">sec</span>
            </div>
            <div className="d-box place" onClick={() => canEdit && setPlaceOpen((v) => !v)}>
              {d.duringLabel || "During All"} {canEdit && <span className="caret">▾</span>}
              {placeOpen && (
                <div className="place-pop" onClick={(e) => e.stopPropagation()}>
                  {["before", "during", "after"].map((p) => (
                    <button key={p} className={`pp ${d.placement === p ? "on" : ""}`} onClick={() => { patch({ placement: p, duringAll: true, timeIds: [] }, true); setD((x) => ({ ...x, placement: p, duringLabel: p === "during" ? "During All" : `${p[0].toUpperCase()}${p.slice(1)} All` })); setPlaceOpen(false); }}>
                      {p === "before" ? "Before All" : p === "after" ? "After All" : "During All"}
                    </button>
                  ))}
                  {(d.serviceTimes || []).length > 1 && d.placement === "during" && (
                    <div className="pp-times">
                      <div className="ppt-h">Doar la anumite ore:</div>
                      {d.serviceTimes.map((t) => {
                        const on = (d.timeIds || []).includes(String(t.id));
                        return <label key={t.id} className="ppt"><input type="checkbox" checked={on} onChange={(e) => {
                          const next = e.target.checked ? [...(d.timeIds || []), String(t.id)] : (d.timeIds || []).filter((x) => x !== String(t.id));
                          patch({ duringAll: next.length === 0, timeIds: next }, true); setD((x) => ({ ...x, timeIds: next, duringAll: next.length === 0, duringLabel: next.length ? `${next.length} time(s)` : "During All" }));
                        }} /> {t.label}</label>;
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>)}

          {d.type !== "header" && d.type !== "transition" && (
            <label className="d-trans">
              <input type="checkbox" checked={!!d.isTransition} disabled={ro}
                onChange={(e) => { patch({ isTransition: e.target.checked }, true); setD((x) => ({ ...x, isTransition: e.target.checked })); }} />
              <span className="dt-x">Tranziție <em>— timp neinclus în total, marcată cu „!"</em></span>
            </label>
          )}

          {(d.type === "song" || d.type === "medley" || d.type === "item") && (
            <div className="d-sec">
              <VoicesPicker value={voices} pool={pool} description={desc} canEdit={canEdit} onChange={saveVoices} leadOnly={d.type === "item"} />
              {d.type === "item" && <MinistriesPicker value={ministries} week={mPool.week} preachers={mPool.preachers} byKind={mPool.byKind} canEdit={canEdit} onChange={saveMinistries} />}
            </div>
          )}

          {d.type === "transition" && (
            <div className="d-sec">
              <div className="d-sl">Punte — tranziție · gamă · lumini</div>
              <TransitionEditor value={trans} week={mPool.week} canEdit={canEdit} onChange={saveTransition}
                desc={desc} onDescChange={setDesc} onDescBlur={saveDesc} />
            </div>
          )}

          {/* „+ Tranziție" (creează row dedesubt) + „+ Lumini" (stamp pe acest item, sub descriere). Doar la cântec/element. */}
          {lightsHost && canEdit && (
            <div className="d-sec qt">
              <div className="qt-row">
                <div className="qt-wrap">
                  <button className="qt-btn" onClick={() => setQtOpen((v) => !v)}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
                    Tranziție
                  </button>
                  {qtOpen && (<>
                    <div className="qt-back" onClick={() => setQtOpen(false)} />
                    <div className="qt-menu">
                      {QUICK_TRANS.map((t) => (
                        <button key={t.k} className="qt-it" onClick={() => addQuickTransition(t.title)}>
                          <span className="qt-l">{t.label}</span>
                          <span className="qt-d">creează „{t.title}" dedesubt</span>
                        </button>
                      ))}
                    </div>
                  </>)}
                </div>
                {!hasItemLights && (
                  <button className="qt-btn" onClick={addLightsBox}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
                    Lumini
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Description — pt. tipul „transition" e randat în editor (sub „Tranziție"), deci nu-l dublăm aici. */}
          {d.type !== "transition" && (
            <div className="d-sec">
              <div className="d-sl">Description</div>
              <textarea className="d-desc" value={desc} disabled={ro} onChange={(e) => setDesc(e.target.value)} onBlur={saveDesc}
                placeholder={"Note libere (versete, cue-uri)…"} rows={3} />
            </div>
          )}

          {/* Lumini pe item (stamp) — sub descriere; container collapsible cu X. */}
          {lightsHost && hasItemLights && (
            <div className="d-sec">
              <section className="lbox">
                <header className="lb-head" onClick={() => setLightsOpen((v) => !v)}>
                  <span className="lb-ic">💡</span><span className="lb-ttl">Lumini</span>
                  <span className="lb-sub">{lightsTiming === "before" ? "înainte" : "după"}</span>
                  <span className="lb-dots">{lights.slice(0, 6).map((l, i) => <span key={i} className="lb-dot" style={{ background: l.color || "#888" }} />)}</span>
                  {canEdit && <button className="lb-x" onClick={(e) => { e.stopPropagation(); removeLights(); }} title="Scoate luminile">✕</button>}
                  <svg className={`lb-chev ${lightsOpen ? "o" : ""}`} width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
                </header>
                {lightsOpen && (
                  <div className="lb-body">
                    <LightsEditor value={lights} canEdit={canEdit} onChange={saveLights} timing={lightsTiming} onTiming={saveLightsTiming} showTiming />
                  </div>
                )}
              </section>
            </div>
          )}

          {d.type !== "header" && d.type !== "transition" && (
          <div className="d-sec">
            <div className="d-sl">Item leader</div>
            <div className="leads">
              {(d.leaders || []).map((l, i) => (
                <span key={i} className={`lchip ${l.needed ? "need" : ""}`}>
                  {!l.needed && <PersonAvatar person={l} size={18} />}
                  {l.name || `${l.positionName} (gol)`}
                  {canEdit && <button onClick={() => removeLeader(l)}>✕</button>}
                </span>
              ))}
              {canEdit && (
                <div className="addlead">
                  <button className="addlead-b" onClick={() => setLeadOpen((v) => !v)}>+ Lider</button>
                  {leadOpen && (
                    <div className="lead-pop">
                      <input className="input" autoFocus placeholder="Caută persoană / poziție…" value={leadQ} onChange={(e) => setLeadQ(e.target.value)} />
                      <div className="lead-list">
                        {(leadRes?.positions || []).map((p) => <button key={`pos${p.id}`} className="lead-it" onClick={() => addLeader({ positionId: p.id })}><span className="li-ic">◇</span>{p.name}<span className="li-sub">{p.team}</span></button>)}
                        {(leadRes?.people || []).map((p) => <button key={`per${p.id}`} className="lead-it" onClick={() => addLeader({ personId: p.id })}><PersonAvatar person={p} size={18} />{p.name}</button>)}
                        {leadRes && !(leadRes.positions || []).length && !(leadRes.people || []).length && <div className="li-none">Niciun rezultat.</div>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>)}

          {d.type === "medley" && (
            <div className="d-sec">
              <MedleyEditor planId={planId} itemId={itemId} title={d.title} initial={d.medley || []} canEdit={canEdit} onChanged={onChanged} flash={flash} />
            </div>
          )}

          {/* „Add a song" (stânga, dispare după import) + „Click Track" (dreapta) — pe același row, deasupra tab-urilor. */}
          {d.type !== "header" && d.type !== "transition" && d.type !== "medley" && (
            <div className="d-sec addsong-row">
              {!d.songId && canEdit
                ? <button className="addsong" onClick={() => setLinkModal(true)}><span className="as-plus">＋</span> Add a song</button>
                : <span className="addsong-ttl">{d.songId ? (song?.title || d.title) : ""}</span>}
              <button className="ct-open" onClick={openClickTrack} title="Pad de pian + metronom live (BPM/meter din cântec)">Click Track</button>
            </div>
          )}

          {d.type !== "header" && d.type !== "transition" && (<>
          {/* ── tabs ── */}
          <div className="d-tabs">
            {TABS.map((t) => (
              <button key={t} className={`dt ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
                {t}{t === "Detail" && (d.htmlDetails || "").trim() ? <span className="dt-bang" title="Are detalii">!</span> : null}
              </button>
            ))}
          </div>

          <div className="d-pane">
            {tab === "Song" && (
              d.songId ? (
                <div className="song-tab">
                  <div className="st-row">
                    <label>Aranjament</label>
                    <select className="input" disabled={ro} value={d.arrangementId || ""} onChange={(e) => changeArrangement(e.target.value)}>
                      <option value="">— alege —</option>
                      {(song?.arrangements || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="st-row">
                    <label>Gamă</label>
                    <select className="input" disabled={ro || !d.arrangementId} value={d.keyId || ""} onChange={(e) => changeKey(e.target.value)}>
                      <option value="">— alege —</option>
                      {(arr?.keys || []).map((k) => <option key={k.id} value={k.id}>{k.startKey}{k.endKey && k.endKey !== k.startKey ? `→${k.endKey}` : ""}{k.description ? ` · ${k.description}` : ""}</option>)}
                    </select>
                  </div>
                  <div className="st-specs">
                    <span>Length: <b>{arr?.lengthLabel || "0:00"}</b></span>
                    <span>BPM: <b>{arr?.bpm || "—"}</b></span>
                    <span>Meter: <b>{arr?.meter || "—"}</b></span>
                  </div>
                  {(() => { const seq = abbreviateSequence(arr?.sequence || []); return seq.length ? <div className="st-seq"><span className="st-sl">Sequence</span> {seq.join(", ")}</div> : null; })()}
                </div>
              ) : (
                <div className="song-link">
                  <div className="d-none">Acest item nu e legat de un cântec. Folosește „＋ Add a song" de mai sus.</div>
                  {canEdit && <button className="st-linkbtn" onClick={() => setLinkModal(true)}>＋ Add a song</button>}
                </div>
              )
            )}

            {tab === "Files" && (
              d.songId ? (
                <div className="song-files-wrap">
                  <div className="song-files">
                    <div className="sf-col">
                      <div className="sf-colh">Arrangement</div>
                      {(arr?.arrangementFiles || []).map((f) => <SongFileRow key={f.id} f={f} onOpen={() => openSongFile(f)} />)}
                      {!(arr?.arrangementFiles || []).length && <div className="sf-empty" />}
                    </div>
                    {(() => {
                      const sk = (arr?.keys || []).find((k) => String(k.id) === String(d.keyId));
                      if (!sk) return null;
                      const kf = (sk.files || []).filter((f) => !f.derived);
                      return (
                        <div className="sf-col">
                          <div className="sf-colh">{sk.label || sk.startKey}</div>
                          {kf.map((f) => <SongFileRow key={f.id} f={f} onOpen={() => openSongFile(f)} />)}
                          {!kf.length && <div className="sf-empty" />}
                        </div>
                      );
                    })()}
                  </div>
                  {(d.files || []).length > 0 && (
                    <div className="sf-extra">
                      <div className="stf-h">Fișiere item</div>
                      {(d.files || []).map((f) => <SongFileRow key={f.id} f={f} onOpen={() => openSongFile(f)} onDelete={canEdit ? () => plansApi.deleteItemFile(planId, itemId, f.id).then(load) : null} />)}
                    </div>
                  )}
                  {canEdit && <AddFileInline onAdd={async (p) => { await plansApi.addItemFile(planId, itemId, p); await load(); onChanged?.(); }} />}
                </div>
              ) : (
                <div className="files-tab">
                  {(d.files || []).map((f) => <SongFileRow key={f.id} f={f} onOpen={() => openSongFile(f)} onDelete={canEdit ? () => plansApi.deleteItemFile(planId, itemId, f.id).then(load) : null} />)}
                  {!(d.files || []).length && <div className="d-none">Niciun fișier atașat acestui item.</div>}
                  {canEdit && <AddFileInline onAdd={async (p) => { await plansApi.addItemFile(planId, itemId, p); await load(); onChanged?.(); }} />}
                </div>
              )
            )}

            {tab === "Notes" && (
              d.songId && d.arrangementId ? (
                <div className="song-notes">
                  <div className="sn-h">Notes aranjament{notesSaving ? <span className="sn-saving"> · se salvează…</span> : null}</div>
                  <textarea className="d-desc" value={notesDraft} disabled={ro} onChange={(e) => setNotesDraft(e.target.value)} onBlur={saveSongNotes} rows={6}
                    placeholder="Notițe pentru acest aranjament (din librăria de cântece; editabile aici)…" />
                  <div className="sn-hint">View &amp; edit — se propagă în cântecul din librărie (și pe telefon).</div>
                </div>
              ) : <div className="d-none">Leagă un cântec ca să vezi notițele aranjamentului.</div>
            )}

            {tab === "Detail" && (<>
              <div className="dt-note">Doar aici — detaliile rămân pe acest item din order, nu suprascriu nimic în librărie.</div>
              <textarea className="d-desc" defaultValue={d.htmlDetails || ""} disabled={ro} rows={6} placeholder="Detalii (doar pentru acest order)…"
                onBlur={(e) => { patch({ htmlDetails: e.target.value }); setD((x) => ({ ...x, htmlDetails: e.target.value })); }} />
            </>)}
          </div>
          </>)}
        </div>
      )}

      {linkModal && <LinkSongModal onClose={() => setLinkModal(false)} onImport={importSong} />}
      {showCT && <ClickTrackBar defaults={ctDefaults} playerActive={!!player.track} onClose={() => setShowCT(false)} />}
      {preview && d?.songId && <ChartPreviewModal songId={d.songId} arrId={d.arrangementId} song={song} arr={arr} mode={preview.mode} targetKey={preview.targetKey} onClose={() => setPreview(null)} />}
      {pdfUrl && (
        <div className="pdf-ov" onMouseDown={(e) => e.target === e.currentTarget && setPdfUrl(null)}>
          <div className="pdf-box">
            <div className="pdf-top">
              <span className="pdf-ttl">Preview</span>
              <a className="pdf-dl" href={pdfUrl} target="_blank" rel="noreferrer">Deschide / Descarcă</a>
              <button className="pdf-x" onClick={() => setPdfUrl(null)} aria-label="Închide">✕</button>
            </div>
            <iframe className="pdf-frame" src={pdfUrl} title="Preview" />
          </div>
        </div>
      )}

      <style jsx>{`
        .drawer { position: fixed; top: var(--nav-h); right: 0; bottom: 0; width: 340px; background: var(--surface); border-left: 1px solid var(--border-strong); z-index: 50; display: flex; flex-direction: column; box-shadow: -8px 0 28px rgba(0,0,0,.28); animation: drIn .16s ease; }
        @keyframes drIn { from { transform: translateX(14px); opacity: .6; } to { transform: none; opacity: 1; } }
        .d-top { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--border); }
        .d-x { background: transparent; border: none; color: var(--text-dim); font-size: 14px; cursor: pointer; }
        .d-x:hover { color: var(--text); }
        .d-ttl { font-weight: 600; font-size: 14px; }
        .d-del { margin-left: auto; background: transparent; border: 1px solid var(--border-strong); color: var(--danger); border-radius: 6px; padding: 4px 11px; font-size: 12.5px; cursor: pointer; }
        .d-del:hover { border-color: var(--danger); }
        .d-load { padding: 30px 16px; color: var(--text-faint); }
        .d-scroll { overflow: auto; padding: 14px 16px 60px; }
        .d-title { width: 100%; font-size: 17px; font-weight: 600; background: transparent; border: 1px solid transparent; border-radius: 6px; color: var(--text); padding: 5px 8px; text-align: center; font-family: inherit; }
        .d-title:hover:not(:disabled), .d-title:focus { border-color: var(--border-strong); background: var(--surface-2); outline: none; }
        .d-boxes { display: flex; gap: 10px; margin: 12px 0 6px; }
        .d-box { flex: 1; display: flex; align-items: center; gap: 6px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; color: var(--text-dim); font-size: 12.5px; }
        .d-box.place { cursor: pointer; position: relative; justify-content: center; }
        .caret { color: var(--text-faint); }
        .d-num { width: 34px; background: transparent; border: none; border-bottom: 1px solid var(--border-strong); color: var(--text); font-size: 13px; text-align: center; font-family: inherit; }
        .d-num:disabled { color: var(--text-dim); }
        .d-u { color: var(--text-faint); font-size: 11px; }
        .place-pop { position: absolute; top: 40px; left: 0; right: 0; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 8px; padding: 6px; z-index: 5; box-shadow: 0 12px 32px rgba(0,0,0,.4); display: flex; flex-direction: column; gap: 2px; }
        .pp { text-align: left; background: transparent; border: none; color: var(--text); padding: 7px 9px; border-radius: 6px; cursor: pointer; font-size: 12.5px; }
        .pp:hover { background: var(--surface-2); } .pp.on { color: var(--primary); font-weight: 600; }
        .pp-times { border-top: 1px solid var(--border); margin-top: 4px; padding-top: 6px; }
        .ppt-h { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; padding: 2px 9px 4px; }
        .ppt { display: flex; align-items: center; gap: 7px; padding: 5px 9px; font-size: 12.5px; color: var(--text-dim); cursor: pointer; }
        .d-trans { display: flex; align-items: center; gap: 8px; margin: 10px 0 2px; color: var(--text-dim); font-size: 12.5px; cursor: pointer; }
        .d-trans input { accent-color: var(--danger); }
        .dt-x em { color: var(--text-faint); font-style: normal; font-size: 11.5px; }
        .d-sec { margin-top: 14px; }
        .d-sl { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
        .d-desc { width: 100%; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 9px 11px; font-size: 13px; font-family: inherit; line-height: 1.5; resize: vertical; }
        .d-desc:focus { outline: none; border-color: var(--primary); }
        .leads { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .lchip { display: inline-flex; align-items: center; gap: 6px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 16px; padding: 3px 9px 3px 4px; font-size: 12px; color: var(--text); }
        .lchip.need { color: var(--st-unconfirmed); border-color: rgba(201,162,39,.5); padding-left: 10px; }
        .lchip button { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 10px; }
        .addlead { position: relative; }
        .addlead-b { background: transparent; border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 16px; padding: 4px 11px; font-size: 12px; cursor: pointer; }
        .addlead-b:hover { color: var(--primary); border-color: var(--primary); }
        .lead-pop { position: absolute; top: 34px; left: 0; width: 280px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 9px; padding: 8px; z-index: 6; box-shadow: 0 12px 34px rgba(0,0,0,.45); }
        .lead-list { max-height: 230px; overflow: auto; margin-top: 6px; display: flex; flex-direction: column; gap: 1px; }
        .lead-it { display: flex; align-items: center; gap: 8px; text-align: left; background: transparent; border: none; color: var(--text); padding: 7px 7px; border-radius: 6px; cursor: pointer; font-size: 13px; }
        .lead-it:hover { background: var(--surface-2); }
        .li-ic { color: var(--text-faint); } .li-sub { color: var(--text-faint); font-size: 11px; margin-left: auto; }
        .li-none { color: var(--text-faint); font-size: 12px; padding: 8px; }
        /* „Add a song" + Click Track row */
        .addsong-row { display: flex; align-items: center; gap: 10px; margin-top: 16px; }
        .addsong { display: inline-flex; align-items: center; gap: 6px; background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text); border-radius: 8px; padding: 8px 13px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .addsong:hover { color: var(--primary); border-color: var(--primary); }
        .as-plus { color: var(--product); font-weight: 800; }
        .addsong-ttl { font-size: 13.5px; font-weight: 600; color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .ct-open { margin-left: auto; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 8px; padding: 8px 13px; font-size: 12.5px; font-weight: 600; cursor: pointer; flex: none; }
        .ct-open:hover { border-color: var(--primary); color: var(--primary); }
        .d-tabs { display: flex; margin-top: 16px; border-bottom: 1px solid var(--border); }
        .dt-bang { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-left: 5px; border-radius: 50%; background: var(--st-unconfirmed); color: #1d1600; font-size: 10px; font-weight: 900; vertical-align: middle; animation: dtpulse 1.6s ease-in-out infinite; }
        @keyframes dtpulse { 0%,100% { box-shadow: 0 0 0 0 rgba(201,162,39,.5); } 50% { box-shadow: 0 0 0 4px rgba(201,162,39,0); } }
        /* Song tab specs + Files containers + Notes */
        .st-specs { display: flex; flex-wrap: wrap; gap: 14px; color: var(--text-dim); font-size: 12.5px; margin: 4px 0 10px; }
        .st-specs b { color: var(--text); }
        .song-files-wrap { }
        .song-files { display: flex; gap: 2px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; overflow-x: auto; }
        .sf-col { flex: 1 1 0; min-width: 0; box-sizing: border-box; padding: 0 10px; border-right: 1px solid var(--border); }
        .sf-col:last-child { border-right: none; }
        .sf-colh { color: var(--text-dim); font-size: 13px; margin-bottom: 10px; min-height: 18px; }
        .sf-empty { min-height: 60px; }
        .sf-extra { margin-top: 12px; }
        .song-notes { }
        .sn-h { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
        .sn-saving { color: var(--primary); text-transform: none; letter-spacing: 0; }
        .sn-hint { color: var(--text-faint); font-size: 11px; margin-top: 6px; }
        .dt-note { color: var(--text-faint); font-size: 11px; margin-bottom: 8px; line-height: 1.5; }
        /* PDF/url preview in-app */
        .pdf-ov { position: fixed; inset: 0; z-index: 90; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .pdf-box { width: min(900px, 94vw); height: 88vh; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 70px rgba(0,0,0,.5); }
        .pdf-top { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--border); }
        .pdf-ttl { font-weight: 600; font-size: 13px; }
        .pdf-dl { margin-left: auto; color: var(--text-link); font-size: 12.5px; text-decoration: none; }
        .pdf-dl:hover { text-decoration: underline; }
        .pdf-x { background: transparent; border: none; color: var(--text-dim); font-size: 14px; cursor: pointer; }
        .pdf-x:hover { color: var(--text); }
        .pdf-frame { flex: 1; width: 100%; border: none; background: #fff; }
        .dt { flex: 1; text-align: center; background: transparent; border: none; color: var(--text-dim); padding: 8px 4px; cursor: pointer; font-size: 12px; border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; }
        .dt:hover { color: var(--text); } .dt.on { color: var(--text); border-bottom-color: var(--primary); font-weight: 600; }
        .d-pane { padding-top: 14px; }
        .d-none { color: var(--text-faint); font-size: 12.5px; padding: 12px 2px; }
        .st-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .st-row label { width: 84px; flex: none; color: var(--text-faint); font-size: 12px; }
        .st-seq { color: var(--text-dim); font-size: 12.5px; margin: 6px 0 10px; line-height: 1.5; }
        .st-sl { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; margin-right: 6px; }
        .stf-h { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; margin: 10px 0 6px; }
        .st-none { color: var(--text-faint); font-size: 12px; padding: 4px 0; }
        .song-link { padding: 8px 0; }
        .st-linkbtn { margin-top: 10px; background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 7px; padding: 8px 14px; font-size: 12.5px; cursor: pointer; }
        .st-linkbtn:hover { color: var(--primary); border-color: var(--primary); }
        .note { display: flex; gap: 6px; align-items: flex-start; margin-bottom: 8px; }
        .note-del { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 11px; padding-top: 8px; }
        .addnote { background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 7px; padding: 7px 12px; font-size: 12.5px; cursor: pointer; width: 100%; }
        .addnote:hover { color: var(--primary); border-color: var(--primary); }
        .d-sec.qt { margin-top: 12px; }
        .qt-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .qt-wrap { position: relative; }
        .lbox { background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .lb-head { display: flex; align-items: center; gap: 8px; padding: 11px 12px; cursor: pointer; user-select: none; }
        .lb-head:hover { background: var(--surface-3); }
        .lb-ic { font-size: 14px; }
        .lb-ttl { color: var(--text); font-size: 12.5px; font-weight: 600; }
        .lb-sub { color: var(--text-faint); font-size: 11px; border: 1px solid var(--border-strong); border-radius: 999px; padding: 0 7px; }
        .lb-dots { display: inline-flex; gap: 3px; flex: 1; }
        .lb-dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border-strong); }
        .lb-x { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 12px; padding: 2px 4px; border-radius: 4px; flex: none; }
        .lb-x:hover { color: var(--danger); background: var(--surface); }
        .lb-chev { color: var(--text-faint); transition: transform .14s ease; flex: none; }
        .lb-chev.o { transform: rotate(180deg); }
        .lb-body { padding: 2px 12px 12px; }
        .qt-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-dim); border-radius: 8px; padding: 7px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .qt-btn:hover { color: var(--primary); border-color: var(--primary); }
        .qt-back { position: fixed; inset: 0; z-index: 6; }
        .qt-menu { position: absolute; z-index: 7; top: 38px; left: 0; min-width: 236px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; box-shadow: 0 14px 40px rgba(0,0,0,.45); padding: 6px; display: flex; flex-direction: column; gap: 2px; }
        .qt-it { display: flex; flex-direction: column; gap: 2px; text-align: left; background: transparent; border: none; color: var(--text); padding: 8px 10px; border-radius: 7px; cursor: pointer; }
        .qt-it:hover { background: var(--surface-2); }
        .qt-l { font-size: 13px; font-weight: 600; }
        .qt-d { color: var(--text-faint); font-size: 11px; }
      `}</style>
    </aside>
  );
}

// Rând de fișier în Files — același stil/iconuri ca în Songs. Audio/YouTube = iconiță „play" (se redă în player).
function SongFileRow({ f, onOpen, onDelete }) {
  const audio = isAudioUrl(f?.url, f?.kind) || isYouTube(f?.url);
  const iconName = audio ? "play"
    : (f.kind === "lyrics" || f.kind === "words") ? "lyrics"
    : (f.kind === "chordChart" || f.kind === "numbers" || f.kind === "numerals") ? "chart"
    : f.kind === "link" ? "play" : "file";
  return (
    <div className="frow">
      <button className="fl fl-btn" onClick={onOpen} title={audio ? "Redă în player" : "Deschide preview"}>
        <span className="fi"><Ico name={iconName} size={15} /></span>
        <span className="fn">{f.name}</span>
      </button>
      {onDelete && <button className="fdel" onClick={onDelete} title="Scoate">✕</button>}
      <style jsx>{`
        .frow { position: relative; display: flex; align-items: center; gap: 6px; padding: 6px 0; }
        .fl { display: flex; align-items: center; gap: 8px; color: var(--text); font-size: 13px; }
        .fl:hover { color: var(--text-link); }
        .fl-btn { background: transparent; border: none; cursor: pointer; padding: 0; text-align: left; width: 100%; min-width: 0; }
        .fi { color: var(--text-dim); display: inline-flex; align-items: center; flex: none; }
        .fn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .fdel { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 11px; flex: none; }
        .fdel:hover { color: var(--danger); }
      `}</style>
    </div>
  );
}

// Iconițe (stil Lucide) — identice cu Songs.
function Ico({ name, size = 16 }) {
  const paths = {
    audio: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m7 14 3-3 3 3 5-5" /></>,
    lyrics: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h10" /></>,
    play: <><polygon points="6 3 20 12 6 21 6 3" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></>,
  }[name] || null;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>;
}

function AddFileInline({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  async function submit() { const n = name.trim(); if (!n) return; await onAdd({ name: n, url: url.trim(), kind: "link" }); setName(""); setUrl(""); setOpen(false); }
  if (!open) return <button className="addf" onClick={() => setOpen(true)}>+ Adaugă fișier (link)<style jsx>{`.addf{background:var(--surface-2);border:1px dashed var(--border-strong);color:var(--text-faint);border-radius:7px;padding:7px 12px;font-size:12.5px;cursor:pointer;width:100%;margin-top:8px}.addf:hover{color:var(--primary);border-color:var(--primary)}`}</style></button>;
  return (
    <div className="addf-form">
      <input className="input" placeholder="Nume fișier" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder="URL (opțional)" value={url} onChange={(e) => setUrl(e.target.value)} />
      <div className="afb"><button className="btn btn-ghost" onClick={() => setOpen(false)}>Anulează</button><button className="btn btn-primary" onClick={submit}>Adaugă</button></div>
      <style jsx>{`.addf-form{display:flex;flex-direction:column;gap:8px;margin-top:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px}.afb{display:flex;justify-content:flex-end;gap:10px}`}</style>
    </div>
  );
}

