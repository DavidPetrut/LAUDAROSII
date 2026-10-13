/** Key picker (din poze: grid Major/Minor). Folosit la Add Key / Add Arrangement / Transpose. */
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { PcBottomSheet, PcSegmented } from "../../components";
import { pcColors } from "../../theme";

const KEYS = ["Ab", "A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#"];

export function KeyPicker({ visible, onClose, onPick, title = "Alege cheia" }) {
  const [mode, setMode] = useState("major");
  const pick = (letter) => { onPick(mode === "minor" ? `${letter}m` : letter); onClose(); };
  return (
    <PcBottomSheet visible={visible} onClose={onClose} maxHeightPct={0.7}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <Text style={styles.title}>{title}</Text>
        <PcSegmented options={[{ key: "major", label: "Major" }, { key: "minor", label: "Minor" }]} value={mode} onChange={setMode} style={{ alignSelf: "stretch", marginBottom: 16 }} />
        <View style={styles.grid}>
          {KEYS.map((k) => (
            <Pressable key={k} style={styles.keyBtn} onPress={() => pick(k)}>
              <Text style={styles.keyTxt}>{mode === "minor" ? `${k}m` : k}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </PcBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  keyBtn: { width: 60, height: 48, borderRadius: 10, borderWidth: 1, borderColor: pcColors.chipBorder, alignItems: "center", justifyContent: "center" },
  keyTxt: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700" },
});

export default KeyPicker;
