/**
 * Containere & structură globale (uniformizate din screenshot-uri):
 * PcScreen (fundal ecran), PcCard, PcDivider, PcSectionTitle (antet verde), PcListRow.
 */
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { pcColors, pcRadius } from "../../theme";

/** Containerul standard al unui ecran PC (fundal near-black). */
export function PcScreen({ children, style }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

/** Card standard (My Teams, grupuri). noPad = fără padding intern (pt. liste de PcListRow). */
export function PcCard({ children, style, onPress, noPad = false }) {
  const Comp = onPress ? Pressable : View;
  return (
    <Comp style={[styles.card, noPad && styles.cardNoPad, style]} onPress={onPress}>
      {children}
    </Comp>
  );
}

/** Linie separator hairline. */
export function PcDivider({ style, inset = 0 }) {
  return <View style={[styles.divider, inset ? { marginLeft: inset } : null, style]} />;
}

/** Antet de secțiune verde (Settings / categorii Tags). */
export function PcSectionTitle({ children, style }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

/** Rând de listă standard: [left] title/sub [right] + divider jos opțional. */
export function PcListRow({ left, title, sub, right, onPress, onLongPress, divider = true, style }) {
  return (
    <>
      <Pressable style={[styles.row, style]} onPress={onPress} onLongPress={onLongPress}>
        {left ? <View style={styles.rowLeft}>{left}</View> : null}
        <View style={{ flex: 1 }}>
          {typeof title === "string" ? <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text> : title}
          {!!sub && (typeof sub === "string" ? <Text style={styles.rowSub}>{sub}</Text> : sub)}
        </View>
        {right}
      </Pressable>
      {divider && <PcDivider inset={left ? 74 : 16} />}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: pcColors.bg },
  card: { backgroundColor: pcColors.card, borderRadius: pcRadius.lg, padding: 16 },
  cardNoPad: { padding: 0, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: pcColors.divider },
  sectionTitle: { color: pcColors.primary, fontSize: 15, fontWeight: "700", paddingHorizontal: 16, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  rowLeft: { },
  rowTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "600" },
  rowSub: { color: pcColors.textSecondary, fontSize: 14, marginTop: 3 },
});

export default { PcScreen, PcCard, PcDivider, PcSectionTitle, PcListRow };
