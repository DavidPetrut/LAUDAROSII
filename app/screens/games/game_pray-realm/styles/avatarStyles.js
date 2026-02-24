import { StyleSheet } from "react-native";
import { AVATAR_SIZE, SCREEN_WIDTH, rem } from "../constants/dimensions";

export const avatarStyles = StyleSheet.create({
  // Container poziționat absolut, CENTRAT PE X-AXIS
  container: {
    position: "absolute",
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    // Centrat perfect pe X-axis folosind left: 50% - jumătate din width
    left: (SCREEN_WIDTH - AVATAR_SIZE) / 2,
    top: 0, // Poziția pe Y va fi controlată de translateY
    zIndex: 100,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: AVATAR_SIZE / 2,
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    borderRadius: AVATAR_SIZE / 2,
    overflow: "hidden",
    borderWidth: rem(3),
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: rem(2) },
    shadowOpacity: 0.3,
    shadowRadius: rem(4),
    elevation: 5,
  },
});
