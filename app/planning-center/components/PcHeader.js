/**
 * Antet negru PCO cu safe-area. Layout: [left] [titlu left-aligned] [right].
 * Acoperă toate ecranele: People (title+iconuri), Profile (X+title+pencil/dots),
 * Edit Contact (X+title+SAVE), Settings/My Teams (back+title+[info]).
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pcColors } from "../theme";

export function PcHeader({ title, left = null, right = null, titleStyle }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      {left}
      <Text style={[styles.title, left ? styles.titleWithLeft : null, titleStyle]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: pcColors.bgHeader,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  title: { color: pcColors.textPrimary, fontSize: 22, fontWeight: "700", flex: 1 },
  titleWithLeft: { marginLeft: 12, fontSize: 20 },
  right: { flexDirection: "row", alignItems: "center", gap: 18 },
});

export default PcHeader;
