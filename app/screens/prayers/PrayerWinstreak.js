import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Image } from "react-native";

const FLAME_GIF = require("../../public/animations/flacari_keyed.gif");
const DISPLAY_DURATION = 3000; // 3 secunde vizibil pe ecran

export const PrayerWinstreak = ({ count, visible, onHide }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    // Winstreak apare doar la 3+ rugăciuni
    if (visible && count >= 3) {
      // Clear orice timer anterior
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Bounce animation pentru counter când crește
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.4,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();

      // Show animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide după DISPLAY_DURATION
      timerRef.current = setTimeout(() => {
        hideWinstreak();
      }, DISPLAY_DURATION);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible, count]);

  const hideWinstreak = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onHide?.());
  };

  // Winstreak apare doar la 3+ rugăciuni (1-2 nu e "streak")
  if (!visible || count < 3) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.gifWrapper}>
        {/* GIF */}
        <Image source={FLAME_GIF} style={styles.gif} resizeMode="contain" />

        {/* Counter în colțul dreapta sus */}
        <Animated.View
          style={[
            styles.counterContainer,
            { transform: [{ scale: bounceAnim }] },
          ]}
        >
          <Text style={styles.counterText}>+{count}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 85,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  gifWrapper: {
    position: "relative",
  },
  gif: {
    width: 120,
    height: 120,
  },
  counterContainer: {
    position: "absolute",
    top: 5,
    right: -15,
    backgroundColor: "#21c063",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#21c063",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  counterText: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "PilotCommand",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
