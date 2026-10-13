/**
 * PcExitHandle — gest discret de ieșire din modul, DIFERIT pe sistem de operare (cerință user):
 *  • Android: „mânerul" stă pe marginea STÂNGĂ (vertical). Îl apeși și tragi spre DREAPTA → iese din Planificare.
 *  • iOS: „mânerul" stă JOS de tot (orizontal, ca un home-indicator). Îl apeși și tragi în SUS → iese.
 *
 * Nu folosește gesture-handler/reanimated (ca să nu adauge deps native) — doar PanResponder + Animated din core.
 * Animațiile rulează pe view-uri mici (mânerul + hint), deci rămân fluide. Modulul NU se demontează la ieșire
 * (tab-ul „Planificare" rămâne montat) → când reintri, te ia exact de unde ai rămas.
 */
import React, { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Platform, StyleSheet, Text, Vibration, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pcColors } from "../theme";
import { usePcShell } from "../navigation/PcContext";

const IS_IOS = Platform.OS === "ios";
const THRESHOLD = 78;     // distanța după care ieșirea se „armează"
const MAX_REVEAL = 132;   // cât se poate deplasa mânerul (cu rezistență peste prag)

export function PcExitHandle() {
  const { exitModule } = usePcShell();
  const insets = useSafeAreaInsets();

  const drag = useRef(new Animated.Value(0)).current; // 0..MAX_REVEAL în direcția ieșirii
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
        // Nu capturăm simplul tap — lăsăm UI-ul de dedesubt să funcționeze; prindem doar tragerea în direcția corectă.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => {
          if (committedRef.current) return false;
          return IS_IOS
            ? g.dy < -6 && Math.abs(g.dy) > Math.abs(g.dx)
            : g.dx > 6 && Math.abs(g.dx) > Math.abs(g.dy);
        },
        onPanResponderGrant: () => {
          committedRef.current = false;
        },
        onPanResponderMove: (_, g) => {
          const raw = IS_IOS ? -g.dy : g.dx;
          let v = Math.max(0, raw);
          if (v > THRESHOLD) v = THRESHOLD + (v - THRESHOLD) * 0.45; // rezistență după prag
          v = Math.min(v, MAX_REVEAL);
          drag.setValue(v);
          setArm(raw >= THRESHOLD);
        },
        onPanResponderRelease: (_, g) => {
          const raw = IS_IOS ? -g.dy : g.dx;
          if (raw >= THRESHOLD && !committedRef.current) {
            committedRef.current = true;
            // Finalizează fluid în direcția ieșirii, apoi iese și resetează pentru data viitoare.
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

  if (IS_IOS) {
    // ——— iOS: mâner orizontal jos de tot, tragere în sus ———
    // Stă STRICT în banda safe-area de jos (unde tab bar-ul are doar padding gol) → nu acoperă niciun tab.
    const band = Math.max(insets.bottom, 22);
    return (
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {/* Hint deasupra mânerului, apare cât tragi */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hintH,
            { bottom: band + 12, opacity: hintOpacity, transform: [{ translateY: Animated.multiply(drag, -1) }] },
          ]}
        >
          <View style={[styles.hintPill, armed && styles.hintPillArmed]}>
            <Ionicons name="chevron-up" size={14} color={armed ? "#0E0E0E" : pcColors.textPrimary} />
            <Text style={[styles.hintTxt, armed && styles.hintTxtArmed]}>
              {armed ? "Eliberează ca să ieși" : "Trage în sus"}
            </Text>
          </View>
        </Animated.View>

        {/* Zona de prindere + pilula (în banda de jos) */}
        <View pointerEvents="box-none" style={[styles.zoneH, { height: band }]}>
          <Animated.View
            {...pan.panHandlers}
            style={[styles.grabH, { height: band, transform: [{ translateY: Animated.multiply(drag, -1) }] }]}
          >
            <Animated.View style={[styles.pillH, { backgroundColor: accent }]} />
          </Animated.View>
        </View>
      </View>
    );
  }

  // ——— Android: mâner vertical pe marginea stângă, tragere spre dreapta ———
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Hint în dreapta mânerului */}
      <Animated.View
        pointerEvents="none"
        style={[styles.hintV, { opacity: hintOpacity, transform: [{ translateX: drag }] }]}
      >
        <View style={[styles.hintPill, armed && styles.hintPillArmed]}>
          <Ionicons name="chevron-forward" size={14} color={armed ? "#0E0E0E" : pcColors.textPrimary} />
          <Text style={[styles.hintTxt, armed && styles.hintTxtArmed]}>
            {armed ? "Eliberează ca să ieși" : "Trage spre dreapta"}
          </Text>
        </View>
      </Animated.View>

      {/* Zona de prindere + pilula (centrat vertical) */}
      <View pointerEvents="box-none" style={styles.zoneV}>
        <Animated.View {...pan.panHandlers} style={[styles.grabV, { transform: [{ translateX: drag }] }]}>
          <Animated.View style={[styles.pillV, { backgroundColor: accent }]} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ——— Android (vertical, stânga) ———
  zoneV: { position: "absolute", left: 0, top: 0, bottom: 0, width: 30, alignItems: "flex-start", justifyContent: "center" },
  grabV: { height: 108, width: 30, alignItems: "flex-start", justifyContent: "center", paddingLeft: 3 },
  pillV: { width: 5, height: 58, borderRadius: 3 },
  hintV: { position: "absolute", left: 16, top: 0, bottom: 0, justifyContent: "center", alignItems: "flex-start" },

  // ——— iOS (orizontal, jos) ———
  zoneH: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  grabH: { width: 200, alignItems: "center", justifyContent: "center" },
  pillH: { width: 140, height: 5, borderRadius: 3 },
  hintH: { position: "absolute", left: 0, right: 0, alignItems: "center" },

  // ——— Hint comun ———
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
