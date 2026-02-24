import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
} from "react-native";
import { GameImages } from "../assets";

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");

// Base rem unit
const BASE_WIDTH = 375;
const rem = (size) => (WINDOW_WIDTH / BASE_WIDTH) * size;

// Detect tablet
const isTablet = WINDOW_WIDTH > 600;

// Belzy size
const BELZY_WIDTH_PERCENT = 0.62;
const BELZY_SIZE = Math.min(
  WINDOW_WIDTH * BELZY_WIDTH_PERCENT,
  isTablet ? 360 : 310
);

// Cloud size
const CLOUD_WIDTH_PERCENT = 0.9;
const CLOUD_WIDTH = Math.min(
  WINDOW_WIDTH * CLOUD_WIDTH_PERCENT,
  isTablet ? 550 : 480
);

const GAP_BETWEEN = rem(2);

// Mesajele pe care le poate afișa Belzy când e blocat de scut
const SHIELD_BLOCK_MESSAGES = [
  "Arghh… ascunde-te în spatele scutului. Te prind eu când nu-l vei mai avea.",
  "Scutul acela… mi-ai luat tot cheful!",
];

/**
 * BelzyShieldBlock - Overlay când jucătorul are scutul activ
 * Belzy apare supărat dar nu poate face nimic
 * După ce se închide, scutul se consumă și aura explodează
 */
const BelzyShieldBlock = ({ visible, level, onComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [messageIndex, setMessageIndex] = React.useState(0);

  useEffect(() => {
    if (visible) {
      // Randomizează mesajul la fiecare apariție
      setMessageIndex(Math.floor(Math.random() * SHIELD_BLOCK_MESSAGES.length));

      // Animație de intrare
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-close după 3 secunde
      const timeout = setTimeout(() => {
        handleClose();
      }, 3000);

      return () => clearTimeout(timeout);
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    // Animație de ieșire
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.(level);
    });
  }, [level, onComplete, fadeAnim, scaleAnim]);

  if (!visible) return null;

  const message = SHIELD_BLOCK_MESSAGES[messageIndex];

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.overlay} />

        <Animated.View
          style={[
            styles.belzyCloudWrapper,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Speech bubble */}
          <View style={styles.cloudContainer}>
            <Image
              source={GameImages.talkingCloud}
              style={styles.cloudImage}
              resizeMode="contain"
            />
            <View style={styles.cloudContent}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          </View>

          {/* Belzy Angry */}
          <Image
            source={GameImages.belzyAngry}
            style={styles.belzyImage}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  belzyCloudWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  belzyImage: {
    width: BELZY_SIZE,
    height: BELZY_SIZE,
    marginTop: GAP_BETWEEN,
  },
  cloudContainer: {
    width: CLOUD_WIDTH,
    height: rem(300),
    alignItems: "center",
    justifyContent: "center",
  },
  cloudImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  cloudContent: {
    position: "absolute",
    top: 0,
    bottom: rem(30),
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: "15%",
  },
  messageText: {
    fontSize: rem(16),
    fontWeight: "700",
    color: "#dc2626",
    textAlign: "center",
    lineHeight: rem(24),
  },
});

export default BelzyShieldBlock;
