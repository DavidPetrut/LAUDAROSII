import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  StatusBar,
} from "react-native";
import { GameImages } from "../assets";

const { width, height } = Dimensions.get("window");

const GameEntry = ({ onEntryComplete }) => {
  const [phase, setPhase] = useState("black"); // 'black' | 'logo' | 'transition' | 'complete'
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const transitionProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sequence = async () => {
      // Phase 1: Black screen for 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPhase("logo");

      // Phase 2: Show logo with fade in and scale
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Hold logo for 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setPhase("transition");

      // Phase 3: Transition animation (like prayer tabs)
      Animated.sequence([
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(transitionProgress, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setPhase("complete");
        onEntryComplete?.();
      });
    };

    sequence();
  }, [fadeAnim, logoScale, logoOpacity, transitionProgress, onEntryComplete]);

  const renderTransitionBars = () => {
    const bars = [];
    const barCount = 8;

    for (let i = 0; i < barCount; i++) {
      const delay = i * 50;
      const barTranslate = transitionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -height],
      });

      bars.push(
        <Animated.View
          key={i}
          style={[
            styles.transitionBar,
            {
              left: (width / barCount) * i,
              width: width / barCount + 1,
              transform: [
                {
                  translateY: Animated.add(
                    barTranslate,
                    new Animated.Value(delay * 0.5)
                  ),
                },
              ],
            },
          ]}
        />
      );
    }
    return bars;
  };

  if (phase === "complete") {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {phase === "transition" && (
        <View style={styles.transitionContainer}>{renderTransitionBars()}</View>
      )}

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={GameImages.verticalChurchLogo}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: width * 0.6,
    height: height * 0.3,
  },
  transitionContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    zIndex: 10,
  },
  transitionBar: {
    position: "absolute",
    top: 0,
    height: height * 2,
    backgroundColor: "#1a1a2e",
  },
});

export default GameEntry;
