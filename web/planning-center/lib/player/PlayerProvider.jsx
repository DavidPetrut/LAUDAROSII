"use client";
/**
 * Player intern global — rulează mp3 (<audio>) ȘI YouTube (IFrame API) în pagină, nu într-un tab nou.
 * Expune play(file)/toggle/seek/close prin context. Bara de jos (PlayerBar) consumă starea.
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

const Ctx = createContext(null);

// videoId din diverse forme de link YouTube.
export function youtubeId(url) {
  const m = String(url || "").match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}
export function isYouTube(url) { return !!youtubeId(url); }
export function isAudioUrl(url, kind) {
  if (kind === "audio") return true;
  return /\.(mp3|m4a|aac|wav|ogg|flac|opus)(\?|$)/i.test(String(url || ""));
}

let ytApiPromise = null;
function loadYT() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(window.YT); };
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

export function PlayerProvider({ children }) {
  const [track, setTrack] = useState(null); // { kind:'audio'|'youtube', url, title, videoId }
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [volume, setVol] = useState(1);
  const [bars, setBars] = useState({}); // bare de jos extra (ex. click track) -> înălțime px
  const audioRef = useRef(null);
  const ytRef = useRef(null);
  const ytTimer = useRef(null);

  const play = useCallback((file) => {
    const url = file?.url; if (!url) return;
    const vid = youtubeId(url);
    if (vid) {
      // oprește audio dacă rula
      if (audioRef.current) { audioRef.current.pause(); }
      setTrack({ kind: "youtube", url, title: file.name || "YouTube", videoId: vid });
    } else {
      setTrack({ kind: "audio", url, title: file.name || "Audio" });
    }
  }, []);

  // ── AUDIO ──
  useEffect(() => {
    if (track?.kind !== "audio") return;
    const a = audioRef.current; if (!a) return;
    a.src = track.url; a.volume = volume; a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  // ── YOUTUBE ──
  useEffect(() => {
    if (track?.kind !== "youtube") { if (ytRef.current && ytRef.current.stopVideo) { try { ytRef.current.stopVideo(); } catch {} } return; }
    let cancelled = false;
    loadYT().then((YT) => {
      if (cancelled || !YT) return;
      if (ytRef.current && ytRef.current.loadVideoById) {
        ytRef.current.loadVideoById(track.videoId);
        return;
      }
      ytRef.current = new YT.Player("pc-yt", {
        videoId: track.videoId,
        playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0 },
        events: {
          onReady: (e) => { e.target.setVolume(volume * 100); e.target.playVideo(); setDur(e.target.getDuration() || 0); },
          onStateChange: (e) => { setPlaying(e.data === 1); if (e.data === 1) setDur(e.target.getDuration() || 0); },
        },
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  // ticker pt. YouTube
  useEffect(() => {
    clearInterval(ytTimer.current);
    if (track?.kind === "youtube") {
      ytTimer.current = setInterval(() => {
        const p = ytRef.current; if (p && p.getCurrentTime) { setTime(p.getCurrentTime() || 0); if (!dur && p.getDuration) setDur(p.getDuration() || 0); }
      }, 500);
    }
    return () => clearInterval(ytTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, dur]);

  const toggle = useCallback(() => {
    if (!track) return;
    if (track.kind === "audio") { const a = audioRef.current; if (!a) return; if (a.paused) a.play(); else a.pause(); }
    else { const p = ytRef.current; if (!p) return; if (playing) p.pauseVideo(); else p.playVideo(); }
  }, [track, playing]);

  const seek = useCallback((t) => {
    if (!track) return;
    if (track.kind === "audio") { if (audioRef.current) audioRef.current.currentTime = t; }
    else { if (ytRef.current && ytRef.current.seekTo) ytRef.current.seekTo(t, true); }
    setTime(t);
  }, [track]);

  const changeVol = useCallback((v) => {
    setVol(v);
    if (audioRef.current) audioRef.current.volume = v;
    if (ytRef.current && ytRef.current.setVolume) ytRef.current.setVolume(v * 100);
  }, []);

  const close = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.removeAttribute("src"); }
    if (ytRef.current && ytRef.current.stopVideo) { try { ytRef.current.stopVideo(); } catch {} }
    setTrack(null); setPlaying(false); setTime(0); setDur(0);
  }, []);

  // Registru bare de jos: PlayerBar (64px, când e track) + oricare alta (ex. ClickTrackBar).
  const registerBar = useCallback((id, h) => setBars((b) => (b[id] === h ? b : { ...b, [id]: h })), []);
  const unregisterBar = useCallback((id) => setBars((b) => { if (!(id in b)) return b; const n = { ...b }; delete n[id]; return n; }), []);
  const playerOpen = !!track;
  const extraBars = Object.values(bars).reduce((a, h) => a + h, 0);
  const bottomInset = (playerOpen ? 64 : 0) + extraBars; // cât ocupă barele jos
  const anyBottomBar = playerOpen || Object.keys(bars).length > 0;

  const value = { track, playing, time, dur, volume, play, toggle, seek, changeVol, close, registerBar, unregisterBar, bottomInset, anyBottomBar, playerOpen };

  return (
    <Ctx.Provider value={value}>
      {children}
      <audio ref={audioRef} onTimeUpdate={(e) => setTime(e.target.currentTime)} onLoadedMetadata={(e) => setDur(e.target.duration || 0)} onEnded={() => setPlaying(false)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} style={{ display: "none" }} />
      {/* container YouTube (ascuns vizual, dar randează audio) */}
      <div style={{ position: "fixed", width: 1, height: 1, left: -9999, bottom: 0, overflow: "hidden" }}><div id="pc-yt" /></div>
    </Ctx.Provider>
  );
}

export function usePlayer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer în afara PlayerProvider");
  return c;
}
