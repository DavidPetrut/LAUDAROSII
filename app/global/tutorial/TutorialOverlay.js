import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTutorial } from "./TutorialContext";

const DIM = "rgba(0,0,0,0.78)";
const ACCENT = "#21c063";
const PAD = 8;

// Blocheaza atingerile in zona intunecata (in afara elementului evidentiat).
const Block = (props) => <View {...props} onStartShouldSetResponder={() => true} />;

/**
 * Overlay-ul de redare a tutorialului: intuneca tot ecranul cu exceptia
 * elementului curent (spotlight), blocheaza restul atingerilor si arata
 * instructiunea + progresul. Userul avanseaza apasand pe elementul evidentiat.
 */
export const TutorialOverlay = () => {
  const insets = useSafeAreaInsets();
  const { mode, currentPlayStep, playTutorial, playIndex, measureStep, registryVersion, stopPlay } = useTutorial();
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (mode !== "play" || !currentPlayStep) {
      setRect(null);
      return;
    }
    let active = true;
    let ticks = 0;
    const tick = async () => {
      const r = await measureStep(currentPlayStep);
      if (!active) return;
      setRect(r);
      ticks += 1;
      // remasuram periodic (elementul se poate muta la navigare/scroll)
      if (ticks < 120) setTimeout(tick, r ? 400 : 150);
    };
    tick();
    return () => {
      active = false;
    };
  }, [mode, playIndex, currentPlayStep, registryVersion, measureStep]);

  if (mode !== "play" || !currentPlayStep) return null;

  const { width: SW, height: SH } = Dimensions.get("window");
  const total = playTutorial?.steps?.length || 0;
  const instruction = currentPlayStep.instruction || "Apasă pe elementul evidențiat.";

  const hole = rect
    ? { x: Math.max(0, rect.x - PAD), y: Math.max(0, rect.y - PAD), w: rect.w + PAD * 2, h: rect.h + PAD * 2 }
    : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hole ? (
        <>
          <Block style={{ position: "absolute", left: 0, top: 0, right: 0, height: hole.y, backgroundColor: DIM }} />
          <Block style={{ position: "absolute", left: 0, top: hole.y + hole.h, right: 0, bottom: 0, backgroundColor: DIM }} />
          <Block style={{ position: "absolute", left: 0, top: hole.y, width: hole.x, height: hole.h, backgroundColor: DIM }} />
          <Block style={{ position: "absolute", left: hole.x + hole.w, top: hole.y, right: 0, height: hole.h, backgroundColor: DIM }} />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: hole.x,
              top: hole.y,
              width: hole.w,
              height: hole.h,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: ACCENT,
              shadowColor: ACCENT,
              shadowOpacity: 0.7,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        </>
      ) : (
        <Block style={[StyleSheet.absoluteFill, { backgroundColor: DIM, alignItems: "center", justifyContent: "center" }]}>
          <Text style={styles.waiting}>Se pregătește pasul…</Text>
        </Block>
      )}

      <View style={[styles.bar, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none" dataSet={{ tutorialUi: "1" }}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.counter}>Pas {playIndex + 1} din {total}</Text>
            <TouchableOpacity onPress={stopPlay} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
          <Text style={styles.instruction}>{instruction}</Text>
          <Text style={styles.hint}>Apasă pe zona evidențiată ca să continui.</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  waiting: { color: "#e5e7eb", fontSize: 15 },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#161a24",
    borderRadius: 16,
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  counter: { color: ACCENT, fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  instruction: { color: "#f3f4f6", fontSize: 16, lineHeight: 23, fontWeight: "600" },
  hint: { color: "rgba(229,231,235,0.5)", fontSize: 13, marginTop: 8 },
});

export default TutorialOverlay;
