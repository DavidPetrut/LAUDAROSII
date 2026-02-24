import { StyleSheet } from "react-native";
import { SCREEN_WIDTH, SCREEN_HEIGHT } from "../constants/dimensions";

export const gameStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent", // Acum folosim bg_dark.png / bg_light.png
  },
  gameArea: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  worldContainer: {
    position: "absolute",
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
