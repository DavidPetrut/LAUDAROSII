import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import { devotionalStyles as styles } from "../devotionalStyles";
import { PlayerControls } from "../session/PlayerControls";
import { DevotionalIcon } from "./DevotionalIcon";
import { useImmersive } from "../../../../global/context";

const fmt = (total) => {
  const s = Math.max(0, total);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/**
 * Ruleaza un devotional: parcurge task-urile in ordine, fiecare cu durata lui,
 * cu iconita animata si numaratoare. La final cheama onComplete. Fundal negru,
 * mod imersiv, se poate roti liber. "Stop" iese fara sa marcheze complet.
 */
export const DevotionalRunner = ({ devotional, onComplete, onExit }) => {
  const insets = useSafeAreaInsets();
  const { setImmersive } = useImmersive();
  const tasks = devotional.tasks || [];

  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState((tasks[0]?.durationMin || 1) * 60);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const indexRef = useRef(0);
  const tickRef = useRef(null);
  const exitedRef = useRef(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setImmersive(true);
    if (Platform.OS !== "web") ScreenOrientation.unlockAsync().catch(() => {});

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    tickRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setRemaining((prev) => {
        if (prev <= 1) {
          advance();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      setImmersive(false);
      if (tickRef.current) clearInterval(tickRef.current);
      if (Platform.OS !== "web") {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advance = () => {
    const next = indexRef.current + 1;
    if (next >= tasks.length) {
      leave(true);
      return;
    }
    indexRef.current = next;
    setIndex(next);
    setRemaining((tasks[next]?.durationMin || 1) * 60);
  };

  const leave = (completed) => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    if (tickRef.current) clearInterval(tickRef.current);
    if (completed) onComplete?.();
    onExit?.();
  };

  const task = tasks[index] || {};
  const accent = task.color || devotional.color || "#10b981";

  return (
    <View style={styles.overlay}>
      <Text style={styles.runnerStep}>
        {index + 1} / {tasks.length}
      </Text>

      <Animated.View style={[styles.runnerIcon, { backgroundColor: accent + "22", transform: [{ scale: pulse }] }]}>
        <DevotionalIcon set={task.iconSet} name={task.icon} size={64} color={accent} />
      </Animated.View>

      <Text style={styles.runnerTitle}>{task.title}</Text>
      <Text style={styles.runnerTimer}>{fmt(remaining)}</Text>

      <View style={[styles.controlsWrap, { marginTop: 40 }]}>
        <PlayerControls
          paused={paused}
          onPause={() => setPaused(true)}
          onResume={() => setPaused(false)}
          onStop={() => leave(false)}
        />
      </View>

      <Text style={[styles.overlayHint, { bottom: insets.bottom + 24 }]}>
        Următorul moment pornește automat.
      </Text>
    </View>
  );
};

export default DevotionalRunner;
