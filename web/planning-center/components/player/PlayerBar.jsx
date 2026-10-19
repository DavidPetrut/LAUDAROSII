"use client";
/**
 * Bara de player jos (ca în PCO): nume track + play/pause + seek + timp + volum + X.
 * Vizibilă doar când rulează ceva. Rulează mp3 și YouTube (audio) din PlayerProvider.
 */
import { usePlayer } from "@/lib/player/PlayerProvider";

const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

export default function PlayerBar() {
  const { track, playing, time, dur, volume, toggle, seek, changeVol, close } = usePlayer();
  if (!track) return null;

  return (
    <div className="pbar">
      <div className="pb-track">
        <div className="pb-lbl">CURRENT TRACK</div>
        <div className="pb-name" title={track.title}>{track.title}{track.kind === "youtube" ? " · YouTube" : ""}</div>
      </div>
      <button className="pb-play" onClick={toggle} aria-label={playing ? "Pauză" : "Play"}>
        {playing
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
      </button>
      <span className="pb-t">{fmt(time)}</span>
      <input className="pb-seek" type="range" min={0} max={dur || 0} step={0.1} value={Math.min(time, dur || 0)} onChange={(e) => seek(Number(e.target.value))} />
      <span className="pb-t">{fmt(dur)}</span>
      <svg className="pb-volico" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4z" /></svg>
      <input className="pb-vol" type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => changeVol(Number(e.target.value))} />
      <button className="pb-x" onClick={close} aria-label="Închide">✕</button>

      <style jsx>{`
        .pbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 35; height: 64px;
          background: #0c1016; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 14px; padding: 0 16px; }
        .pb-track { width: 220px; min-width: 160px; }
        .pb-lbl { font-size: 10px; letter-spacing: .8px; color: var(--text-faint); }
        .pb-name { font-size: 13px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pb-play { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border-strong); background: var(--surface-2); color: var(--text); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }
        .pb-play:hover { background: var(--surface-3); }
        .pb-t { font-size: 12px; color: var(--text-dim); width: 40px; text-align: center; flex: 0 0 auto; }
        .pb-seek { flex: 1; accent-color: var(--primary); }
        .pb-volico { color: var(--text-dim); flex: 0 0 auto; }
        .pb-vol { width: 90px; accent-color: var(--primary); flex: 0 0 auto; }
        .pb-x { background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 14px; padding: 8px; flex: 0 0 auto; }
        .pb-x:hover { color: var(--text); }
        @media (max-width: 720px) { .pb-vol, .pb-volico { display: none; } .pb-track { width: 120px; } }
      `}</style>
    </div>
  );
}
