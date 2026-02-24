import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * Iconița globala de back arrow
 * light=true pentru fundal colorat (sageata alba)
 * light=false pentru fundal deschis (sageata verde)
 */
export const BackArrowIcon = ({ size = 36, light = false }) => (
  <View
    style={[
      styles.circle,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderColor: light ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)",
      },
    ]}
  >
    <Text
      style={[
        styles.arrow,
        { fontSize: size * 0.4, color: light ? "#fff" : "#3cfe16" },
      ]}
    >
      ◀
    </Text>
  </View>
);

const styles = StyleSheet.create({
  circle: {
    backgroundColor: "transparent",
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  arrow: {
    marginLeft: -2,
  },
});
