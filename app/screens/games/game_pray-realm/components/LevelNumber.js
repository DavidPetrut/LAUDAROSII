import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LEVEL_NUMBER_FONT_SIZE } from "../constants/dimensions";

const LevelNumber = ({ level }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.levelNumber}>{level}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  levelNumber: {
    fontSize: LEVEL_NUMBER_FONT_SIZE,
    fontWeight: "800",
    color: "#8B7355",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default React.memo(LevelNumber);
