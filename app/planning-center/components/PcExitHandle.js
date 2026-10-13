/**
 * PcExitHandle — gest discret de ieșire din modul. Pe AMBELE sisteme bara stă pe marginea
 * STÂNGĂ (vertical): o apeși și tragi spre DREAPTA → iese din Planificare.
 * (Pe iOS NU o punem jos, fiindcă iPhone are deja bara nativă home-indicator jos și se încurcă —
 *  cerință user: la fel ca pe Android, în stânga.)
 *
 * Nu folosește gesture-handler/reanimated (zero deps native) — doar PanResponder + Animated din core.
 * Modulul NU se demontează la ieșire (tab-ul „Planificare" rămâne montat) → când reintri, te ia
 * exact de unde ai rămas.
 */
import React, { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Platform, StyleSheet, Text, Vibration, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { pcColors } from "../theme";
import { usePcShell } from "../navigation/PcContext";

const THRESHOLD = 78;     // distanța după care ieșirea se „armează"
const MAX_REVEAL = 132;   // cât se poate deplasa mânerul (cu rezistență peste prag)

export function PcExitHandle() {
  const { exitModule } = usePcShell();

  const drag = useRef(new Animated.Value(0)).current; // 0..MAX_REVEAL spre dreapta
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const committedRef = useRef(false);

  const setArm = (next) => {
    if (armedRef.current === next) return;
    armedRef.current = next;
    setArmed(next);
    // Feedback tactil scurt DOAR pe Android la armare (pe iOS Vibration e prea puternic fără expo-haptics).
    if (next && Platform.OS === "android") Vibration.vibrate(12);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        // Prindem doar tragerea clară spre dreapta (lasă scroll-ul vertical să treacă).
        onMoveShouldSetPanResponder: (_, g) =>
          !committedRef.current && g.dx > 6 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => { committedRef.current = false; },
        onPanResponderMove: (_, g) => {
          let v = Math.max(0, g.dx);
          if (v > THRESHOLD) v = THRESHOLD + (v - THRESHOLD) * 0.45; // rezistență după prag
          v = Math.min(v, MAX_REVEAL);
          drag.setValue(v);
          setArm(g.dx >= THRESHOLD);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dx >= THRESHOLD && !committedRef.current) {
            committedRef.current = true;
            Animated.timing(drag, { toValue: MAX_REVEAL, duration: 130, useNativeDriver: false }).start(() => {
              exitModule();
              drag.setValue(0);
              setArm(false);
              committedRef.current = false;
            });
          } else {
            setArm(false);
            Animated.spring(drag, { toValue: 0, speed: 18, bounciness: 6, useNativeDriver: false }).start();
          }
        },
        onPanResponderTerminate: () => {
          setArm(false);
          Animated.spring(drag, { toValue: 0, speed: 18, bounciness: 6, useNativeDriver: false }).start();
        },
      }),
    [drag, exitModule]
  );

  const accent = armed ? pcColors.primary : "rgba(255,255,255,0.55)";
  const hintOpacity = drag.interpolate({ inputRange: [8, THRESHOLD], outputRange: [0, 1], extrapolate: "clamp" });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Hint în dreapta mânerului, apare cât tragi */}
      <Animated.View
        pointerEvents="none"
        style={[styles.hint, { opacity: hintOpacity, transform: [{ translateX: drag }] }]}
      >
        <View style={[styles.hintPill, armed && styles.hintPillArmed]}>
          <Ionicons name="chevron-forward" size={14} color={armed ? "#0E0E0E" : pcColors.textPrimary} />
          <Text style={[styles.hintTxt, armed && styles.hintTxtArmed]}>
            {armed ? "Eliberează ca să ieși" : "Trage spre dreapta"}
          </Text>
        </View>
      </Animated.View>

      {/* Zona de prindere + pilula (centrat vertical, marginea stângă) */}
      <View pointerEvents="box-none" style={styles.zone}>
        <Animated.View {...pan.panHandlers} style={[styles.grab, { transform: [{ translateX: drag }] }]}>
          <Animated.View style={[styles.pill, { backgroundColor: accent }]} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: { position: "absolute", left: 0, top: 0, bottom: 0, width: 30, alignItems: "flex-start", justifyContent: "center" },
  grab: { height: 108, width: 30, alignItems: "flex-start", justifyContent: "center", paddingLeft: 3 },
  pill: { width: 5, height: 58, borderRadius: 3 },
  hint: { position: "absolute", left: 16, top: 0, bottom: 0, justifyContent: "center", alignItems: "flex-start" },
  hintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(28,28,30,0.96)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: pcColors.chipBorder,
  },
  hintPillArmed: { backgroundColor: pcColors.primary, borderColor: pcColors.primary },
  hintTxt: { color: pcColors.textPrimary, fontSize: 12, fontWeight: "700" },
  hintTxtArmed: { color: "#0E0E0E" },
});

export default PcExitHandle;
