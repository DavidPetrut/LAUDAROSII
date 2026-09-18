import React, { useEffect, useRef, useState } from "react";
import { View, Text, useWindowDimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import { devotionalStyles as styles } from "../devotionalStyles";
import { PlayerControls } from "./PlayerControls";
import { useDevotionalAudio } from "./useDevotionalAudio";

const fmt = (total) => {
  const s = Math.max(0, total);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

/**
 * Overlay full-screen al sesiunii: numaratoare inversa + redare audio (random,
 * background). Un singur buton fin sub ceas (pauza -> reia/stop). Fundal negru,
 * text gri fin. Se roteste liber (landscape) doar cat timp e activa sesiunea.
 */
export const DevotionalPlayer = ({ durationMin, tracks, withMusic, onExit, onComplete }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [remaining, setRemaining] = useState(durationMin * 60);
  const audio = useDevotionalAudio({ tracks, withMusic });
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const tickRef = useRef(null);
  const exitedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web") {
      ScreenOrientation.unlockAsync().catch(() => {});
    }
    tickRef.current = setInterval(() => {
      if (audioRef.current.paused) return;
      setRemaining((prev) => {
        if (prev <= 1) {
          finish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (Platform.OS !== "web") {
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        ).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leave = async (completed) => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    if (tickRef.current) clearInterval(tickRef.current);
    await audioRef.current.stop({ fade: true });
    if (completed) onComplete?.();
    onExit?.();
  };

  const finish = () => leave(true);
  const handleStop = () => leave(false);

  return (
    <View style={styles.overlay}>
      <Text style={[styles.overlayTimer, landscape && styles.overlayTimerLandscape]}>
        {fmt(remaining)}
      </Text>
      {withMusic && !!audio.trackTitle && (
        <Text style={styles.overlayTrack} numberOfLines={1}>
          ♪ {audio.trackTitle}
        </Text>
      )}

      <View style={[styles.controlsWrap, { marginTop: landscape ? 20 : 48 }]}>
        <PlayerControls
          paused={audio.paused}
          onPause={audio.pause}
          onResume={audio.resume}
          onStop={handleStop}
        />
      </View>

      <Text style={[styles.overlayHint, { bottom: insets.bottom + 24 }]}>
        Rugăciunea continuă și cu ecranul închis, până la finalul timerului.
      </Text>
    </View>
  );
};

export default DevotionalPlayer;
