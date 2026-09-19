import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";

// paleta subtila, personalizabila fara sa fie stridenta
export const DEVOTIONAL_COLORS = [
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

/**
 * Rand de culori discrete pentru personalizarea iconitei/devotionalului.
 */
export const ColorSwatches = ({ value, onChange }) => (
  <View style={styles.swatchRow}>
    {DEVOTIONAL_COLORS.map((c) => (
      <TouchableOpacity
        key={c}
        style={[styles.swatch, { backgroundColor: c }, value === c && styles.swatchActive]}
        onPress={() => onChange(c)}
        activeOpacity={0.8}
      >
        {value === c && <Ionicons name="checkmark" size={16} color="#fff" />}
      </TouchableOpacity>
    ))}
  </View>
);

export default ColorSwatches;
