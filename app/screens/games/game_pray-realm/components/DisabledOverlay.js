import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Componentă refolosibilă pentru efectul de "disabled" pe imagini/elemente
 * Aplică un gradient gri semi-transparent peste elementul copil
 *
 * @param {boolean} disabled - Dacă e true, aplică efectul de disabled
 * @param {React.ReactNode} children - Elementele de randat
 * @param {object} style - Stiluri adiționale pentru container
 * @param {string} variant - "dark" | "light" - tipul de overlay
 */
const DisabledOverlay = ({
  disabled = false,
  children,
  style,
  variant = "dark",
}) => {
  if (!disabled) {
    return <View style={style}>{children}</View>;
  }

  const gradientColors =
    variant === "dark"
      ? [
          "rgba(60, 60, 70, 0.6)",
          "rgba(80, 80, 90, 0.5)",
          "rgba(60, 60, 70, 0.6)",
        ]
      : [
          "rgba(150, 150, 160, 0.4)",
          "rgba(170, 170, 180, 0.3)",
          "rgba(150, 150, 160, 0.4)",
        ];

  return (
    <View style={[styles.container, style]}>
      {children}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.overlay}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
  },
});

export default DisabledOverlay;
