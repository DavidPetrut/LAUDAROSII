import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Animated, Easing, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import { devotionalStyles as styles } from "../devotionalStyles";
import { PlayerControls } from "../session/PlayerControls";
import { DevotionalIcon } from "./DevotionalIcon";
import { useImmersive } from "../../../../global/context";

const fmt = (total) => {
  const s = Math.max(0, total);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Ruleaza un devotional moment cu moment. Dupa ce trece timpul minim al unui
 * moment nu avanseaza automat: apare un buton fin cu numele momentului urmator,
 * apasat de user. Fiecare moment isi reda muzica proprie (daca e activata).
 */
export const DevotionalRunner = ({ devotional, program, onComplete, onExit }) => {
  const insets = useSafeAreaInsets();
  const { setImmersive } = useImmersive();
  const tasks = devotional.tasks || [];

  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState((tasks[0]?.durationMin || 1) * 60);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const readyRef = useRef(false);
  readyRef.current = ready;
  const indexRef = useRef(0);
  indexRef.current = index;

  const tickRef = useRef(null);
  const exitedRef = useRef(false);
  const pulse = useRef(new Animated.Value(1)).current;

  const soundRef = useRef(null);
  const orderRef = useRef([]);
  const posRef = useRef(0);
  const activeRef = useRef(true);

  useEffect(() => {
    setImmersive(true);
    activeRef.current = true;
    if (Platform.OS !== "web") ScreenOrientation.unlockAsync().catch(() => {});

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    tickRef.current = setInterval(() => {
      if (pausedRef.current || readyRef.current) return;
      setRemaining((prev) => {
        if (prev <= 1) {
          setReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      setImmersive(false);
      activeRef.current = false;
      if (tickRef.current) clearInterval(tickRef.current);
      stopMusic();
      if (Platform.OS !== "web") {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La schimbarea momentului: reseteaza timpul, opreste "ready" si porneste muzica lui.
  useEffect(() => {
    setRemaining((tasks[index]?.durationMin || 1) * 60);
    setReady(false);
    playTaskMusic(tasks[index]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const stopMusic = async () => {
    const s = soundRef.current;
    soundRef.current = null;
    if (s) {
      try { await s.stopAsync(); await s.unloadAsync(); } catch (e) {}
    }
  };

  const playAt = async (i) => {
    if (!activeRef.current || orderRef.current.length === 0) return;
    if (i >= orderRef.current.length) {
      orderRef.current = shuffle(orderRef.current);
      i = 0;
    }
    posRef.current = i;
    const track = orderRef.current[i];
    try {
      await stopMusic();
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: Platform.OS !== "web" });
      const { sound } = await Audio.Sound.createAsync({ uri: track.url }, { shouldPlay: true });
      if (!activeRef.current) { try { await sound.unloadAsync(); } catch (e) {} return; }
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st?.didJustFinish) playAt(posRef.current + 1);
      });
    } catch (e) {}
  };

  const playTaskMusic = async (task) => {
    await stopMusic();
    if (!task?.music?.enabled) return;
    const tracks = (program?.playlist || []).filter((t) => t.category === task.music.category && t.url);
    if (tracks.length === 0) return;
    orderRef.current = shuffle(tracks);
    playAt(0);
  };

  const advance = () => {
    if (indexRef.current >= tasks.length - 1) {
      leave(true);
      return;
    }
    setIndex((i) => i + 1);
  };

  const leave = async (completed) => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    if (tickRef.current) clearInterval(tickRef.current);
    await stopMusic();
    if (completed) onComplete?.();
    onExit?.();
  };

  const pause = async () => {
    setPaused(true);
    try { await soundRef.current?.pauseAsync(); } catch (e) {}
  };
  const resume = async () => {
    setPaused(false);
    try { await soundRef.current?.playAsync(); } catch (e) {}
  };

  const task = tasks[index] || {};
  const accent = task.color || devotional.color || "#10b981";
  const isLast = index >= tasks.length - 1;
  const nextTask = tasks[index + 1];

  return (
    <View style={styles.overlay}>
      <Text style={styles.runnerStep}>{index + 1} / {tasks.length}</Text>

      <Animated.View style={[styles.runnerIcon, { backgroundColor: accent + "22", transform: [{ scale: pulse }] }]}>
        <DevotionalIcon set={task.iconSet} name={task.icon} size={64} color={accent} />
      </Animated.View>

      <Text style={styles.runnerTitle}>{task.title}</Text>
      <Text style={styles.runnerTimer}>{fmt(remaining)}</Text>

      <View style={[styles.controlsWrap, { marginTop: 32 }]}>
        <PlayerControls paused={paused} onPause={pause} onResume={resume} onStop={() => leave(false)} />
      </View>

      {ready && (
        <TouchableOpacity style={[styles.runnerNextBtn, { borderColor: accent }]} onPress={advance} activeOpacity={0.85}>
          <Text style={[styles.runnerNextText, { color: accent }]}>
            {isLast ? "Termină" : nextTask?.title}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={accent} />
        </TouchableOpacity>
      )}

      <Text style={[styles.overlayHint, { bottom: insets.bottom + 24 }]}>
        {ready ? "Poți sta cât ai nevoie — apasă când ești gata." : "Următorul moment îl pornești tu."}
      </Text>
    </View>
  );
};

export default DevotionalRunner;
