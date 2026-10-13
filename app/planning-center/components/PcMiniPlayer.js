/** Mini-player persistent (din poză): thumbnail + titlu + timp + play/pause + X.
 *  Stă deasupra tab bar-ului și rămâne până dai X (cerință user). Tap pe el = deschide Media Player. */
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pcColors } from "../theme";
import { usePcAudio } from "../navigation/PcAudioContext";

const fmt = (s) => { const x = Math.max(0, Math.floor(s || 0)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`; };

export function PcMiniPlayer({ tabBarOffset = 58 }) {
  const insets = useSafeAreaInsets();
  const { visible, track, playing, position, toggle, close, openPlayer } = usePcAudio();
  if (!visible || !track) return null;
  return (
    <Pressable style={[styles.bar, { bottom: insets.bottom + tabBarOffset }]} onPress={openPlayer}>
      <View style={styles.thumb}><Ionicons name="musical-note" size={18} color={pcColors.textMuted} /></View>
      <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
      <Text style={styles.time}>{fmt(position)}</Text>
      <Pressable hitSlop={10} onPress={toggle} style={styles.btn}><Ionicons name={playing ? "pause" : "play"} size={22} color={pcColors.primary} /></Pressable>
      <Pressable hitSlop={10} onPress={close} style={styles.btn}><Ionicons name="close" size={22} color={pcColors.textSecondary} /></Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", left: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1C1C1E", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: pcColors.divider, elevation: 8, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  thumb: { width: 36, height: 36, borderRadius: 7, backgroundColor: pcColors.input, alignItems: "center", justifyContent: "center" },
  title: { color: pcColors.textPrimary, fontSize: 14, fontWeight: "700", flex: 1 },
  time: { color: pcColors.primary, fontSize: 12, fontWeight: "700" },
  btn: { padding: 2 },
});

export default PcMiniPlayer;
