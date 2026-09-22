import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Gestioneaza redarea audio a sesiunii devotional: ordine aleatoare (random),
 * auto-advance, pauza/reia si oprire cu fade-out fin. Ruleaza si cu ecranul
 * inchis (background audio) pe mobil. Foloseste-l din player, nu direct din ecran.
 */
export const useDevotionalAudio = ({ tracks, withMusic }) => {
  const [trackTitle, setTrackTitle] = useState("");
  const [paused, setPaused] = useState(false);

  const playerRef = useRef(null);
  const orderRef = useRef([]);
  const posRef = useRef(0);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    if (withMusic && tracks.length > 0) start();
    return () => {
      activeRef.current = false;
      unload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unload = () => {
    const p = playerRef.current;
    playerRef.current = null;
    if (p) {
      try {
        p.pause();
        p.remove();
      } catch (e) {}
    }
  };

  const playAt = (pos) => {
    if (!activeRef.current || orderRef.current.length === 0) return;
    if (pos >= orderRef.current.length) {
      // s-a terminat lista: reamesteca pentru a continua random
      orderRef.current = shuffle(tracks);
      pos = 0;
    }
    posRef.current = pos;
    const track = orderRef.current[pos];
    setTrackTitle(track.title || "");
    try {
      unload();
      const player = createAudioPlayer({ uri: track.url });
      if (!activeRef.current) {
        try { player.remove(); } catch (e) {}
        return;
      }
      playerRef.current = player;
      player.volume = 1;
      player.play();
      player.addListener("playbackStatusUpdate", (status) => {
        if (status?.didJustFinish) playAt(posRef.current + 1);
      });
    } catch (e) {
      // sar peste piesa nefunctionala
      if (activeRef.current) setTimeout(() => playAt(pos + 1), 400);
    }
  };

  const start = async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: Platform.OS !== "web",
        interruptionMode: "doNotMix",
      });
    } catch (e) {}
    orderRef.current = shuffle(tracks);
    playAt(0);
  };

  // Sare la piesa urmatoare / anterioara din ordinea random (cu wrap). Intoarce
  // titlul piesei acum active (pentru feedback vizual la swipe).
  const next = () => {
    playAt(posRef.current + 1);
    return orderRef.current[posRef.current]?.title || "";
  };
  const prev = () => {
    const len = orderRef.current.length;
    if (len === 0) return "";
    const target = posRef.current - 1;
    playAt(target < 0 ? len - 1 : target);
    return orderRef.current[posRef.current]?.title || "";
  };

  const pause = () => {
    setPaused(true);
    try { playerRef.current?.pause(); } catch (e) {}
  };

  const resume = () => {
    setPaused(false);
    try { playerRef.current?.play(); } catch (e) {}
  };

  // Scade lin volumul si opreste (fade-out fin, nu brusc).
  const stop = async ({ fade = true } = {}) => {
    activeRef.current = false;
    const p = playerRef.current;
    if (fade && p) {
      try {
        const steps = 12;
        for (let i = steps - 1; i >= 0; i--) {
          p.volume = i / steps;
          await new Promise((r) => setTimeout(r, 55));
        }
      } catch (e) {}
    }
    unload();
  };

  return { trackTitle, paused, pause, resume, stop, next, prev };
};
