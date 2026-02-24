import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * Badge pentru afișarea numărului de notificări
 * Se poziționează în colțul din dreapta-jos al elementului părinte
 */
export const NotificationBadge = ({
  count,
  size = "small",
  style,
  offsetRight = -6,
  offsetBottom = -4,
}) => {
  if (!count || count <= 0) return null;

  const displayCount = count > 99 ? "99+" : count.toString();
  const isLarge = size === "large";

  return (
    <View
      style={[
        styles.badge,
        isLarge ? styles.badgeLarge : styles.badgeSmall,
        { right: offsetRight, bottom: offsetBottom },
        style,
      ]}
    >
      <Text style={[styles.text, isLarge && styles.textLarge]}>
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    backgroundColor: "#10b981",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 16,
    zIndex: 10,
  },
  badgeSmall: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
  },
  badgeLarge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
  },
  text: {
    color: "#002b07",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  textLarge: {
    fontSize: 12,
  },
});
