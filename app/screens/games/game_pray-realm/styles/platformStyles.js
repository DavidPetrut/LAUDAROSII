import { StyleSheet } from "react-native";
import {
  SCREEN_WIDTH,
  TROPHY_SIZE,
  HAMMER_SIZE,
  LEVEL_NUMBER_FONT_SIZE,
  rem,
} from "../constants/dimensions";

export const platformStyles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    left: 0,
    right: 0,
  },
  stepImage: {
    resizeMode: "contain",
  },
  levelInfoContainer: {
    position: "absolute",
    alignSelf: "center",
    top: rem(-45),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  levelNumber: {
    fontSize: LEVEL_NUMBER_FONT_SIZE,
    fontWeight: "bold",
  },
  hammerImage: {
    width: HAMMER_SIZE,
    height: HAMMER_SIZE,
    marginRight: rem(8),
  },
  trophyImage: {
    width: TROPHY_SIZE,
    height: TROPHY_SIZE,
    marginTop: rem(-13), // Ridicat mai sus să nu intre în treaptă
  },
});
