import React from "react";
import { View, Image, StyleSheet, Animated } from "react-native";
import { rem } from "../constants/dimensions";
import { ToolImages } from "../assets";

/**
 * BuffIndicators - Afișează iconițele pentru buff-urile active
 * Poziționat în colțul dreapta-jos al avatarului
 * Sword apare deasupra Shield-ului
 */
const BuffIndicators = ({ hasShield = false, hasSword = false }) => {
  if (!hasShield && !hasSword) return null;

  return (
    <View style={styles.container}>
      {/* Sword - deasupra shield-ului */}
      {hasSword && (
        <View style={[styles.iconContainer, styles.swordIcon]}>
          <Image
            source={ToolImages.sword}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Shield - jos */}
      {hasShield && (
        <View style={[styles.iconContainer, styles.shieldIcon]}>
          <Image
            source={ToolImages.shield}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>
      )}
    </View>
  );
};

const ICON_SIZE = rem(28);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: -rem(5),
    bottom: -rem(5),
    flexDirection: "column",
    alignItems: "center",
    gap: rem(2),
  },
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: ICON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  icon: {
    width: ICON_SIZE * 0.7,
    height: ICON_SIZE * 0.7,
  },
  shieldIcon: {
    // Shield specific styles if needed
  },
  swordIcon: {
    marginBottom: -rem(5), // Overlap slightly
  },
});

export default BuffIndicators;
