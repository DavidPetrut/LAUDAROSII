import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { AVATAR_SIZE, rem } from "../constants/dimensions";

/**
 * AuraEffect - Efect de aură albastră pulsantă pentru avatar
 * Apare când shield-ul sau sword-ul sunt active
 */
const AuraEffect = ({
  visible = false,
  color = "rgba(100, 180, 255, 0.6)",
  onExplode,
  isExploding = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const explodeScale = useRef(new Animated.Value(1)).current;
  const explodeOpacity = useRef(new Animated.Value(1)).current;

  // Animație de pulsare subtilă
  useEffect(() => {
    if (visible && !isExploding) {
      // Fade in
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulsare continuă subtilă
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else if (!visible && !isExploding) {
      // Fade out
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, isExploding]);

  // Animație de explozie
  useEffect(() => {
    if (isExploding) {
      Animated.parallel([
        Animated.timing(explodeScale, {
          toValue: 2.5,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(explodeOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset pentru următoarea utilizare
        explodeScale.setValue(1);
        explodeOpacity.setValue(1);
        opacityAnim.setValue(0);
        onExplode?.();
      });
    }
  }, [isExploding]);

  if (!visible && !isExploding) return null;

  return (
    <Animated.View
      style={[
        styles.auraContainer,
        {
          opacity: isExploding ? explodeOpacity : opacityAnim,
          transform: [{ scale: isExploding ? explodeScale : pulseAnim }],
        },
      ]}
      pointerEvents="none"
    >
      {/* Outer glow */}
      <View style={[styles.auraOuter, { borderColor: color }]} />
      {/* Inner glow */}
      <View style={[styles.auraInner, { borderColor: color }]} />
    </Animated.View>
  );
};

const AURA_SIZE = AVATAR_SIZE + rem(20);

const styles = StyleSheet.create({
  auraContainer: {
    position: "absolute",
    width: AURA_SIZE,
    height: AURA_SIZE,
    top: -rem(10),
    left: -rem(10),
    alignItems: "center",
    justifyContent: "center",
  },
  auraOuter: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: AURA_SIZE / 2,
    borderWidth: rem(3),
    backgroundColor: "transparent",
    shadowColor: "#64B4FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  auraInner: {
    position: "absolute",
    width: "85%",
    height: "85%",
    borderRadius: AURA_SIZE / 2,
    borderWidth: rem(2),
    backgroundColor: "transparent",
    opacity: 0.5,
  },
});

export default AuraEffect;
