/**
 * Player audio global PC (expo-audio) — un singur player, coadă de piese, status live.
 * Rămâne activ între ecrane (provider montat în root-ul modulului) → mini-player persistent
 * până dai X (cerință user). Redă URL-uri (mp3/m4a/aac hosted, ex. Cloudinary).
 */
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

const PcAudioContext = createContext(null);
export const usePcAudio = () => useContext(PcAudioContext) || {};

export function PcAudioProvider({ children }) {
  const [queue, setQueue] = useState([]);       // [{id,title,url,subtitle,bpm}]
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);  // secunde
  const [duration, setDuration] = useState(0);
  const [loop, setLoop] = useState(false);
  const [visible, setVisible] = useState(false); // mini-player vizibil
  const playerRef = useRef(null);
  const loopRef = useRef(false);
  const queueRef = useRef([]);
  const navRef = useRef(null); // navigația stack-ului PC (pt. deschiderea Media Player din mini-player)
  const attachNav = useCallback((n) => { navRef.current = n; }, []);
  const openPlayer = useCallback(() => { try { navRef.current?.navigate("PcMediaPlayer"); } catch (e) {} }, []);
  useEffect(() => { loopRef.current = loop; }, [loop]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  const unload = useCallback(() => {
    const p = playerRef.current; playerRef.current = null;
    if (p) { try { p.pause(); p.remove(); } catch (e) {} }
  }, []);

  const playAt = useCallback((i, q) => {
    const list = q || queueRef.current;
    if (!list.length) return;
    const pos = Math.max(0, Math.min(i, list.length - 1));
    setIndex(pos);
    const track = list[pos];
    if (!track?.url) return;
    unload();
    try {
      const player = createAudioPlayer({ uri: track.url });
      playerRef.current = player;
      player.volume = 1;
      player.play();
      setPlaying(true); setVisible(true); setPosition(0); setDuration(0);
      player.addListener("playbackStatusUpdate", (s) => {
        if (!playerRef.current) return;
        if (typeof s?.currentTime === "number") setPosition(s.currentTime);
        if (typeof s?.duration === "number" && s.duration > 0) setDuration(s.duration);
        if (typeof s?.playing === "boolean") setPlaying(s.playing);
        if (s?.didJustFinish) {
          if (loopRef.current) { try { player.seekTo(0); player.play(); } catch (e) {} }
          else playAt(pos + 1, list);
        }
      });
    } catch (e) { /* skip */ }
  }, [unload]);

  const playQueue = useCallback(async (tracks, startIndex = 0) => {
    try {
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: Platform.OS !== "web", interruptionMode: "doNotMix" });
    } catch (e) {}
    const list = (tracks || []).filter((t) => t?.url);
    if (!list.length) return false;
    setQueue(list); queueRef.current = list;
    playAt(startIndex, list);
    return true;
  }, [playAt]);

  const toggle = useCallback(() => {
    const p = playerRef.current;
    // Niciun player activ (ex. s-a descărcat la navigare) dar avem coadă → reîncarcă piesa curentă.
    if (!p) { if (queueRef.current.length) playAt(index); return; }
    try { if (p.playing) { p.pause(); setPlaying(false); } else { p.play(); setPlaying(true); } } catch (e) {}
  }, [index, playAt]);
  const seek = useCallback((sec) => { try { playerRef.current?.seekTo(Math.max(0, sec)); setPosition(sec); } catch (e) {} }, []);
  const skip = useCallback((delta) => { try { const p = playerRef.current; if (p) { const t = Math.max(0, (p.currentTime || position) + delta); p.seekTo(t); setPosition(t); } } catch (e) {} }, [position]);
  const next = useCallback(() => playAt(index + 1), [index, playAt]);
  const prev = useCallback(() => (position > 3 ? seek(0) : playAt(index - 1)), [index, position, playAt, seek]);
  const close = useCallback(() => { unload(); setVisible(false); setPlaying(false); setQueue([]); setIndex(0); setPosition(0); setDuration(0); }, [unload]);

  useEffect(() => () => unload(), [unload]);

  const track = queue[index] || null;
  const value = {
    queue, index, track, playing, position, duration, loop, visible,
    playQueue, toggle, seek, skip, next, prev, close, setLoop,
    attachNav, openPlayer,
  };
  return <PcAudioContext.Provider value={value}>{children}</PcAudioContext.Provider>;
}

export default PcAudioContext;
