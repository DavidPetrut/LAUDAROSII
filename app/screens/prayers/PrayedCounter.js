import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useTheme } from "../../global/context";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../public/styles/global";

const PRAY_ICON = require("../../public/icons/praying.png");

export const PrayedCounter = ({ count }) => {
  const { theme, isDarkMode } = useTheme();

  if (!count || count === 0) return null;

  // Folosesc aceeasi culoare subtila ca in footer
  const iconTint = isDarkMode ? "#a7f3d0" : "#d1fae5";

  return (
    <View style={styles.container}>
      <Image
        source={PRAY_ICON}
        style={[styles.icon, { tintColor: iconTint }]}
      />
      <Text style={[styles.count, { color: iconTint }]}>{count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    width: 18,
    height: 18,
  },
  count: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
