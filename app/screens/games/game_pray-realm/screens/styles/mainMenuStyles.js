import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const mainMenuStyles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  bgContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  menuContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: height * 0.025,
    paddingVertical: height * 0.1,
  },
  menuButton: {
    width: width * 0.6,
    aspectRatio: 3.2,
  },
  buttonImage: {
    width: "100%",
    height: "100%",
  },
});
