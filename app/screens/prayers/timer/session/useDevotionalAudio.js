import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Audio } from "expo-av";

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

  const soundRef = useRef(null);
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

  const unload = async () => {
    const s = soundRef.current;
    soundRef.current = null;
    if (s) {
      try {
        await s.stopAsync();
        await s.unloadAsync();
      } catch (e) {}
    }
  };

  const playAt = async (pos) => {
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
      await unload();
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true, volume: 1 }
      );
      if (!activeRef.current) {
        try { await sound.unloadAsync(); } catch (e) {}
        return;
      }
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status?.didJustFinish) playAt(posRef.current + 1);
      });
    } catch (e) {
      // sar peste piesa nefunctionala
      if (activeRef.current) setTimeout(() => playAt(pos + 1), 400);
    }
  };

  const start = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: Platform.OS !== "web",
        shouldDuckAndroid: false,
      });
    } catch (e) {}
    orderRef.current = shuffle(tracks);
    playAt(0);
  };

  const pause = async () => {
    setPaused(true);
    try {
      await soundRef.current?.pauseAsync();
    } catch (e) {}
  };

  const resume = async () => {
    setPaused(false);
    try {
      await soundRef.current?.playAsync();
    } catch (e) {}
  };

  // Scade lin volumul si opreste (fade-out fin, nu brusc).
  const stop = async ({ fade = true } = {}) => {
    activeRef.current = false;
    const s = soundRef.current;
    if (fade && s) {
      try {
        const steps = 12;
        for (let i = steps - 1; i >= 0; i--) {
          await s.setVolumeAsync(i / steps);
          await new Promise((r) => setTimeout(r, 55));
        }
      } catch (e) {}
    }
    await unload();
  };

  return { trackTitle, paused, pause, resume, stop };
};
