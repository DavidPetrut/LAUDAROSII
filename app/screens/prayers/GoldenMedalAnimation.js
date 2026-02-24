import React, { useRef, useEffect } from "react";
import { View, Animated, StyleSheet, Image, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const MEDAL_ICON = require("../../public/icons/medal.png");

export const GoldenMedalAnimation = ({ visible, onComplete }) => {
  const scaleAnim = useRef(new Animated.Value(0.2)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(-1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.2);
      opacityAnim.setValue(0);
      shineAnim.setValue(-1);
      glowOpacity.setValue(0);
      runAnimation();
    }
  }, [visible]);

  const runAnimation = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0.8,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shineAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(shineAnim, {
            toValue: -1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ).start();

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.3,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onComplete?.();
        });
      }, 1800);
    });
  };

  const shineTranslate = shineAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-0, 15],
  });

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.medalWrapper,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View style={[styles.glowCircle, { opacity: glowOpacity }]} />

        <Image source={MEDAL_ICON} style={styles.medalImage} />

        <Animated.View
          style={[
            styles.shineOverlay,
            { transform: [{ translateX: shineTranslate }] },
          ]}
        >
          <LinearGradient
            colors={[
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0.5)",
              "rgba(255,255,255,0)",
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shineGradient}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  medalWrapper: {
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  glowCircle: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#ffd700",
    shadowColor: "#ffd700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 15,
  },
  medalImage: {
    width: 60,
    height: 60,
    zIndex: 2,
  },
  shineOverlay: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: "hidden",
    zIndex: 3,
  },
  shineGradient: {
    width: 30,
    height: "100%",
  },
});
