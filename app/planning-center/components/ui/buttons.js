/**
 * Butoane globale Planning Center (uniformizate din screenshot-uri).
 * PcButton: primary (verde plin) / outline (bordură verde) / ghost (text verde).
 * PcIconButton: iconul de header (chat/bell/pencil…) cu dot opțional.
 */
import React from "react";
import { Pressable, Text, ActivityIndicator, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { pcColors, pcRadius } from "../../theme";

const VARIANTS = {
  primary: { container: { backgroundColor: pcColors.primary }, text: { color: "#0A0A0A" } },
  outline: { container: { borderWidth: 1, borderColor: pcColors.primary, backgroundColor: "transparent" }, text: { color: pcColors.primary } },
  ghost: { container: { backgroundColor: "transparent" }, text: { color: pcColors.primary } },
  danger: { container: { borderWidth: 1, borderColor: pcColors.danger, backgroundColor: "transparent" }, text: { color: pcColors.danger } },
};

export function PcButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon = null,
  block = false,
  style,
  textStyle,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, v.container, block && { alignSelf: "stretch" }, (disabled || loading) && { opacity: 0.5 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={v.text.color} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.text, v.text, textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function PcIconButton({ icon, color = pcColors.primary, size = 24, onPress, dot = false, style, lib: Lib = Ionicons }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={[styles.iconBtn, style]}>
      <Lib name={icon} size={size} color={color} />
      {dot && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: pcRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  text: { fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  iconBtn: { alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: pcColors.orange },
});

export default PcButton;
