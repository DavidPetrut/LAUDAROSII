import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { devotionalStyles as styles } from "./devotionalStyles";

const fmt = (total) => {
  const s = Math.max(0, total);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

/**
 * Overlay full-screen pentru o sesiune de worship: numaratoare inversa + redare
 * in coada a pieselor (loop in ordine pana se umple durata). Foreground-only.
 */
export const DevotionalPlayer = ({ durationMin, tracks, withMusic, onStop }) => {
  const insets = useSafeAreaInsets();
  const [remaining, setRemaining] = useState(durationMin * 60);
  const [trackTitle, setTrackTitle] = useState("");

  const soundRef = useRef(null);
  const idxRef = useRef(0);
  const activeRef = useRef(true);
  const tickRef = useRef(null);

  useEffect(() => {
    activeRef.current = true;
    if (withMusic && tracks.length > 0) startPlayback();

    tickRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          finish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      activeRef.current = false;
      if (tickRef.current) clearInterval(tickRef.current);
      unloadSound();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unloadSound = async () => {
    const s = soundRef.current;
    soundRef.current = null;
    if (s) {
      try {
        await s.stopAsync();
        await s.unloadAsync();
      } catch (e) {}
    }
  };

  const playIndex = async (i) => {
    if (!activeRef.current || tracks.length === 0) return;
    const track = tracks[i % tracks.length];
    setTrackTitle(track.title || "");
    try {
      await unloadSound();
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true }
      );
      if (!activeRef.current) {
        try { await sound.unloadAsync(); } catch (e) {}
        return;
      }
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status?.didJustFinish) {
          idxRef.current = (idxRef.current + 1) % tracks.length;
          playIndex(idxRef.current);
        }
      });
    } catch (e) {
      // sar peste piesa care nu se poate reda si trec la urmatoarea
      idxRef.current = (idxRef.current + 1) % tracks.length;
      if (idxRef.current !== i % tracks.length) setTimeout(() => playIndex(idxRef.current), 400);
    }
  };

  const startPlayback = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch (e) {}
    idxRef.current = 0;
    playIndex(0);
  };

  const finish = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    stopNow();
  };

  const stopNow = async () => {
    activeRef.current = false;
    await unloadSound();
    onStop();
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={[styles.stopBtn, { top: insets.top + 16 }]} onPress={stopNow}>
        <Text style={styles.stopIcon}>■</Text>
      </TouchableOpacity>

      <Text style={styles.overlayTimer}>{fmt(remaining)}</Text>
      {withMusic && !!trackTitle && <Text style={styles.overlayTrack}>♪ {trackTitle}</Text>}

      <Text style={[styles.overlayHint, { bottom: insets.bottom + 40 }]}>
        Ține ecranul aprins — muzica se oprește dacă închizi ecranul.
      </Text>
    </View>
  );
};

export default DevotionalPlayer;
