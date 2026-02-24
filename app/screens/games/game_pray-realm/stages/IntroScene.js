import React, { useState, useEffect, useRef } from "react";
import { View, Image, Animated, StyleSheet, Dimensions } from "react-native";
import IntroTextBox from "./IntroTextBox";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const TEXT_FADE_DURATION = 1200;
const BUTTON_DELAY = 800;
const BUTTON_FADE_DURATION = 1000;

const IntroScene = ({ scene, isActive, onNext }) => {
  const [showButton, setShowButton] = useState(false);
  const sceneOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      setShowButton(false);
      sceneOpacity.setValue(0);
      textOpacity.setValue(0);
      buttonOpacity.setValue(0);

      Animated.timing(sceneOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: TEXT_FADE_DURATION,
          useNativeDriver: true,
        }).start();
      }, 300);

      const buttonTimer = setTimeout(() => {
        setShowButton(true);
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: BUTTON_FADE_DURATION,
          useNativeDriver: true,
        }).start();
      }, BUTTON_DELAY + TEXT_FADE_DURATION);

      return () => clearTimeout(buttonTimer);
    }
  }, [isActive]);

  const handleNext = () => {
    Animated.parallel([
      Animated.timing(sceneOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(buttonOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onNext());
  };

  if (!isActive && sceneOpacity._value === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: sceneOpacity }]}>
      <Image source={scene.image} style={styles.backgroundImage} resizeMode="cover" />
      <IntroTextBox
        lines={scene.lines}
        position={scene.textPosition}
        showButton={showButton}
        isLast={scene.isLast}
        onNext={handleNext}
        textOpacity={textOpacity}
        buttonOpacity={buttonOpacity}
        buttonCentered={scene.buttonCentered}
        verticalOffset={scene.verticalOffset}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  backgroundImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});

export default IntroScene;
