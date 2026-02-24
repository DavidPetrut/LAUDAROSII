import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../public/styles/global";

export const RibbonBadge = ({ label = "URGENT!", color = colors.error }) => {
  return (
    <View style={styles.container}>
      <View style={[styles.ribbon, { backgroundColor: color }]}>
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 8,
    right: -4,
    zIndex: 10,
  },
  ribbon: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  text: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
