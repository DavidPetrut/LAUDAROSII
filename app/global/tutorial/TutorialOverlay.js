import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTutorial } from "./TutorialContext";

const DIM = "rgba(0,0,0,0.55)";
const ACCENT = "#21c063";
const PAD = 8;
const TIP_GAP = 12;

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
  const [tipH, setTipH] = useState(0);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (mode !== "play" || !currentPlayStep) {
      setRect(null);
      return;
    }
    let active = true;
    let ticks = 0;
    let nullStreak = 0;
    const tick = async () => {
      const r = await measureStep(currentPlayStep);
      if (!active) return;
      setRect(r);
      if (r) {
        nullStreak = 0;
        setStuck(false);
      } else {
        nullStreak += 1;
        // ~2s fara sa gasim elementul => oferim "Sari peste" / inchidere.
        if (nullStreak >= 12) setStuck(true);
      }
      ticks += 1;
      // remasuram periodic (elementul se poate muta la navigare/scroll)
      if (ticks < 200) setTimeout(tick, r ? 400 : 180);
    };
    tick();
    return () => {
      active = false;
    };
  }, [mode, playIndex, currentPlayStep, registryVersion, measureStep]);

  // La schimbarea pasului: remasuram tooltip-ul si resetam starea "blocat".
  useEffect(() => {
    setTipH(0);
    setStuck(false);
  }, [playIndex]);

  if (mode !== "play" || !currentPlayStep) return null;

  const { width: SW, height: SH } = Dimensions.get("window");
  const total = playTutorial?.steps?.length || 0;
  const instruction = currentPlayStep.instruction || "Apasă pe elementul evidențiat.";

  const hole = rect
    ? { x: Math.max(0, rect.x - PAD), y: Math.max(0, rect.y - PAD), w: rect.w + PAD * 2, h: rect.h + PAD * 2 }
    : null;

  // Pozitionarea tooltip-ului: lipit de element (sub el, sau deasupra daca nu incape jos).
  const TIP_W = Math.min(340, SW - 24);
  let tip = null;
  if (hole) {
    const roomBelow = SH - insets.bottom - 8 - (hole.y + hole.h + TIP_GAP);
    const placeAbove = tipH > 0 ? roomBelow < tipH : hole.y + hole.h > SH * 0.6;
    let top = placeAbove ? hole.y - TIP_GAP - tipH : hole.y + hole.h + TIP_GAP;
    top = Math.max(insets.top + 8, Math.min(top, SH - insets.bottom - tipH - 8));
    let left = Math.max(12, Math.min(hole.x + hole.w / 2 - TIP_W / 2, SW - TIP_W - 12));
    const arrowX = Math.max(16, Math.min(hole.x + hole.w / 2 - left - 8, TIP_W - 32));
    tip = { top, left, placeAbove, arrowX };
  }

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
        <Block style={[StyleSheet.absoluteFill, { backgroundColor: DIM, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }]}>
          <View style={[styles.tip, { width: TIP_W }]} dataSet={{ tutorialUi: "1" }}>
            <View style={styles.tipTop}>
              <Text style={styles.counter}>Pas {playIndex + 1} din {total}</Text>
              <TouchableOpacity onPress={stopPlay} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.55)" />
              </TouchableOpacity>
            </View>
            <Text style={styles.instruction}>{instruction}</Text>
            <Text style={styles.hint}>
              {stuck
                ? "Elementul acestui pas nu e pe ecranul curent. Fă pasul anterior ca să ajungi aici, sau închide tutorialul din X."
                : "Se pregătește pasul…"}
            </Text>
          </View>
        </Block>
      )}

      {hole && tip && (
        <View
          style={[
            styles.tip,
            // Cat timp masuram inaltimea (tipH=0) tinem tooltip-ul OFF-SCREEN, ca sa
            // nu acopere elementul evidentiat si sa nu-i blocheze apasarea.
            tipH
              ? { width: TIP_W, top: tip.top, left: tip.left, opacity: 1 }
              : { width: TIP_W, top: -1000, left: 12, opacity: 0 },
          ]}
          pointerEvents={tipH ? "box-none" : "none"}
          dataSet={{ tutorialUi: "1" }}
          onLayout={(e) => setTipH(e.nativeEvent.layout.height)}
        >
          <View
            style={[styles.arrowBase, tip.placeAbove ? styles.arrowDown : styles.arrowUp, { left: tip.arrowX }]}
          />
          <View style={styles.tipTop}>
            <Text style={styles.counter}>Pas {playIndex + 1} din {total}</Text>
            <TouchableOpacity onPress={stopPlay} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.55)" />
            </TouchableOpacity>
          </View>
          <Text style={styles.instruction}>{instruction}</Text>
          <Text style={styles.hint}>👆 Apasă pe zona evidențiată ca să continui</Text>
        </View>
      )}
    </View>
  );
};

const TIP_BG = "#1a1f2b";

const styles = StyleSheet.create({
  waiting: { color: "#e5e7eb", fontSize: 15 },
  tip: {
    position: "absolute",
    backgroundColor: TIP_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(33,192,99,0.55)",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
    zIndex: 10,
  },
  arrowBase: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  arrowUp: { top: -9, borderBottomWidth: 9, borderBottomColor: TIP_BG },
  arrowDown: { bottom: -9, borderTopWidth: 9, borderTopColor: TIP_BG },
  tipTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  counter: { color: ACCENT, fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  instruction: { color: "#ffffff", fontSize: 17, lineHeight: 24, fontWeight: "700" },
  hint: { color: "rgba(229,231,235,0.55)", fontSize: 13.5, marginTop: 10 },
});

export default TutorialOverlay;
