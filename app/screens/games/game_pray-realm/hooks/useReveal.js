import { useState, useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { getRevealTargetForLevel } from "../utils/levelUtils";

export const useReveal = (currentLevel) => {
  const revealProgress = useRef(new Animated.Value(0)).current;
  const [isFullyRevealed, setIsFullyRevealed] = useState(false);

  useEffect(() => {
    const targetReveal = getRevealTargetForLevel(currentLevel);
    const currentValue = revealProgress._value || 0;

    console.log("🌳 useReveal update:", {
      currentLevel,
      targetReveal,
      currentValue,
      isFullyRevealed,
    });

    // Resetează isFullyRevealed dacă targetul e mai mic de 1
    if (targetReveal < 1 && isFullyRevealed) {
      setIsFullyRevealed(false);
    }

    // Animează întotdeauna când targetul se schimbă
    console.log("🌳 Animating reveal from", currentValue, "to", targetReveal);

    Animated.timing(revealProgress, {
      toValue: targetReveal,
      duration: targetReveal > currentValue ? 1500 : 500, // Mai rapid când scade (restart)
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      console.log("🌳 Reveal animation complete, targetReveal:", targetReveal);
      if (targetReveal >= 1) {
        setIsFullyRevealed(true);
      }
    });
  }, [currentLevel]);

  const forceFullReveal = () => {
    console.log("🌳 Force full reveal!");
    setIsFullyRevealed(true);
    Animated.timing(revealProgress, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const resetReveal = () => {
    console.log("🌳 Resetting reveal to 0");
    Animated.timing(revealProgress, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsFullyRevealed(false);
  };

  return {
    revealProgress,
    isFullyRevealed,
    forceFullReveal,
    resetReveal,
  };
};
