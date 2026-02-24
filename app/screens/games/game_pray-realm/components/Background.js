import React, { useState, useEffect, useRef } from "react";
import { View, Image, StyleSheet, Animated } from "react-native";
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  BG_TREE_WIDTH_PERCENT,
  BG_TREE_HEIGHT_MULTIPLIER,
  isTablet,
  rem,
  LEVEL_HEIGHT,
} from "../constants/dimensions";
import { BG_SCROLL_FACTOR, START_LEVEL_OFFSET } from "../constants/gameConfig";

// Import toate imaginile de reveal
const REVEAL_IMAGES = {
  0: require("../assets/tree_piatra_transparent.png"), // 0% revealed (100% stone)
  1: require("../assets/transparent_piatra_1.png"), // 20% revealed (level 5)
  2: require("../assets/transparent_piatra_2.png"), // 40% revealed (level 10)
  3: require("../assets/transparent_piatra_3.png"), // 60% revealed (level 15)
  4: require("../assets/transparent_piatra_4.png"), // 80% revealed (level 20)
  5: require("../assets/tree.png"), // 100% revealed (level 25)
};

// Determină care imagine să afișeze bazat pe nivel
const getRevealImageIndex = (level) => {
  if (level >= 25) return 5; // tree.png - 100%
  if (level >= 20) return 4; // piatra_4.png - 80%
  if (level >= 15) return 3; // piatra_3.png - 60%
  if (level >= 10) return 2; // piatra_2.png - 40%
  if (level >= 5) return 1; // piatra_1.png - 20%
  return 0; // piatra.png - 0%
};

const Background = ({
  cameraY,
  revealProgress,
  isFullyRevealed,
  stoneImage,
  treeImage,
  currentLevel = 1,
}) => {
  // ========== DIMENSIUNI RESPONSIVE PENTRU PIETRE/COPAC ==========
  // Lățime: procent din ecran, centrat (5% mai mare pe mobil)
  const mobileWidthBoost = isTablet ? 1 : 1.15;
  const bgWidth = SCREEN_WIDTH * BG_TREE_WIDTH_PERCENT * mobileWidthBoost;
  // Înălțime: multiplicator bazat pe ecran
  const bgHeight = SCREEN_HEIGHT * BG_TREE_HEIGHT_MULTIPLIER;
  // Centrat pe X-axis
  const bgLeft = (SCREEN_WIDTH - bgWidth) / 2;

  // ========== LOGICA UNIFORMĂ PENTRU TOATE MOBILE-URILE ==========
  // Calculăm offset-ul bazat pe poziția scărilor (LEVEL_HEIGHT)
  // Asta garantează că piatra e mereu la aceeași distanță relativă de scări
  // indiferent de mărimea ecranului

  // Poziția platformei de nivel 1 (unde începe jocul)
  const level1PlatformY = -(1 + START_LEVEL_OFFSET) * LEVEL_HEIGHT;

  // Offset standard: piatra să fie aliniată cu scările
  // Folosim un multiplicator de LEVEL_HEIGHT pentru consistență
  const getBaseOffsetValue = () => {
    if (isTablet) {
      // Tabletă: offset ajustat
      return LEVEL_HEIGHT * 5;
    }
    // TOATE mobile-urile: aceeași formulă bazată pe LEVEL_HEIGHT
    // Asta garantează consistență pe toate ecranele
    return LEVEL_HEIGHT * 6;
  };

  const baseOffsetValue = getBaseOffsetValue();
  const baseOffset = SCREEN_HEIGHT - bgHeight + baseOffsetValue;
  const backgroundY = baseOffset - cameraY * BG_SCROLL_FACTOR;

  // Track images for crossfade
  const [currentImageIndex, setCurrentImageIndex] = useState(() =>
    getRevealImageIndex(currentLevel)
  );
  const [previousImageIndex, setPreviousImageIndex] = useState(() =>
    getRevealImageIndex(currentLevel)
  );

  // Opacity for crossfade (1 = new image fully visible)
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const newIndex = getRevealImageIndex(currentLevel);

    if (newIndex !== currentImageIndex) {
      console.log("🎨 Crossfade:", currentImageIndex, "->", newIndex);

      // Set previous to current before changing
      setPreviousImageIndex(currentImageIndex);
      setCurrentImageIndex(newIndex);

      // Reset fade to 0 (show previous) then animate to 1 (show new)
      fadeAnim.setValue(0);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200, // Smooth 1.2 second crossfade
        useNativeDriver: true,
      }).start();
    }
  }, [currentLevel]);

  return (
    <View
      style={[
        styles.mainContainer,
        { top: backgroundY, width: bgWidth, left: bgLeft, height: bgHeight },
      ]}
      pointerEvents="none"
    >
      {/* Previous image - always visible behind */}
      <Image
        source={REVEAL_IMAGES[previousImageIndex]}
        style={[styles.bgImage, { width: bgWidth, height: bgHeight }]}
        resizeMode="contain"
      />

      {/* Current image - fades in on top */}
      <Animated.View
        style={[
          styles.imageContainer,
          {
            width: bgWidth,
            height: bgHeight,
            opacity: fadeAnim,
          },
        ]}
      >
        <Image
          source={REVEAL_IMAGES[currentImageIndex]}
          style={[styles.bgImage, { width: bgWidth, height: bgHeight }]}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    position: "absolute",
    zIndex: -1,
  },
  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  imageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});

export default Background;
