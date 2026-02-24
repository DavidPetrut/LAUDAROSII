import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { INTRO_ASSETS } from "./stage1IntroData";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const rem = (size) => (SCREEN_WIDTH / 375) * size;

const IntroTextBox = ({
  lines,
  position,
  showButton,
  isLast,
  onNext,
  textOpacity,
  buttonOpacity,
  buttonCentered = false,
  verticalOffset = 0,
}) => {
  const containerStyle = getContainerStyle(position, verticalOffset);
  const buttonStyle = buttonCentered
    ? styles.buttonCentered
    : styles.buttonRight;

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.textWrapper,
          position === "bottom-right" && styles.textWrapperWide,
        ]}
      >
        <Animated.View style={{ opacity: textOpacity }}>
          {lines.map((line, index) => (
            <Text key={index} style={styles.lineText}>
              {line}
            </Text>
          ))}
        </Animated.View>
        <View style={[styles.buttonPlaceholder, buttonStyle]}>
          {showButton && (
            <Animated.View style={{ opacity: buttonOpacity }}>
              <TouchableOpacity onPress={onNext} activeOpacity={0.7}>
                <Image
                  source={
                    isLast ? INTRO_ASSETS.goButton : INTRO_ASSETS.arrowButton
                  }
                  style={
                    isLast ? styles.goButtonImage : styles.arrowButtonImage
                  }
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
};

const getContainerStyle = (position, offset = 0) => {
  switch (position) {
    case "top":
      return { ...styles.positionTop, top: rem(40) + offset };
    case "bottom":
      return { ...styles.positionBottom, bottom: rem(60) + offset };
    case "bottom-right":
      return { ...styles.positionBottomRight, bottom: rem(80) + offset };
    default:
      return styles.positionBottom;
  }
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    paddingHorizontal: rem(20),
    paddingVertical: rem(15),
  },
  positionTop: {
    left: 0,
    right: 0,
    alignItems: "center",
  },
  positionBottom: {
    left: 0,
    right: 0,
    alignItems: "center",
  },
  positionBottomRight: {
    right: rem(10),
    width: SCREEN_WIDTH * 0.55,
    alignItems: "flex-end",
  },
  textWrapper: {
    paddingHorizontal: rem(16),
    paddingVertical: rem(12),
    maxWidth: SCREEN_WIDTH * 0.85,
  },
  textWrapperWide: {
    width: "100%",
  },
  lineText: {
    color: "#340d01",
    fontSize: rem(20.5),
    fontFamily: "IMFellEnglish-Italic",
    textAlign: "center",
    lineHeight: rem(28),
    marginBottom: rem(3),
  },
  buttonPlaceholder: {
    height: rem(52),
    marginTop: rem(8),
    justifyContent: "center",
  },
  buttonRight: {
    alignItems: "flex-end",
    marginRight: rem(-25),
  },
  buttonCentered: {
    alignItems: "center",
  },
  arrowButtonImage: {
    width: rem(60),
    height: rem(60),
  },
  goButtonImage: {
    width: rem(80),
    height: rem(80),
  },
});

export default IntroTextBox;
