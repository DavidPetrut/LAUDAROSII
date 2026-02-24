import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { GameImages } from "../assets";
import SwordCinematic from "./SwordCinematic";

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

// Faze ale scenei cu sabia
const PHASES = {
  INITIAL: "INITIAL", // Belzy happy cu opțiunea de a folosi sabia
  SCARED: "SCARED", // Belzy scared după ce ai dat click pe sabie
  CINEMATIC: "CINEMATIC", // Video-ul cinematic
};

/**
 * BelzySwordScene - Overlay când jucătorul are sabia activă
 * Permite să dai click pe sword_active pentru a ucide pe Belzy
 * Include tranziție la belzy_scared și apoi video cinematic
 */
const BelzySwordScene = ({
  visible,
  level,
  onUseSword, // Când dai click pe sabie
  onSkipSword, // Când continui fără sabie (quiz normal)
  onComplete, // Când scena s-a terminat (Belzy e mort)
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [phase, setPhase] = useState(PHASES.INITIAL);

  useEffect(() => {
    if (visible) {
      setPhase(PHASES.INITIAL);

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
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  // Handler când dai click pe sabie
  const handleSwordClick = useCallback(() => {
    setPhase(PHASES.SCARED);

    // După 2 secunde, pornește video-ul
    setTimeout(() => {
      setPhase(PHASES.CINEMATIC);
    }, 2000);

    onUseSword?.(level);
  }, [level, onUseSword]);

  // Handler când video-ul s-a terminat
  const handleCinematicComplete = useCallback(() => {
    // Animație de ieșire
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.(level);
    });
  }, [level, onComplete, fadeAnim]);

  // Handler când dai click pe Belzy (skip sword, go to quiz)
  const handleSkip = useCallback(() => {
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
      onSkipSword?.(level);
    });
  }, [level, onSkipSword, fadeAnim, scaleAnim]);

  if (!visible) return null;

  // În faza cinematic, afișează doar video-ul
  if (phase === PHASES.CINEMATIC) {
    return (
      <SwordCinematic visible={true} onComplete={handleCinematicComplete} />
    );
  }

  // Alege imaginea Belzy bazată pe fază
  const belzyImage =
    phase === PHASES.SCARED ? GameImages.belzyScared : GameImages.belzyHappy;

  // Mesajul bazat pe fază
  const message =
    phase === PHASES.SCARED
      ? "Sabia aceea... nu mă trimite înapoi!!!"
      : "Oh nu, Belzy din nou...!";

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.overlay} />

        <Animated.View
          style={[styles.contentWrapper, { transform: [{ scale: scaleAnim }] }]}
        >
          {/* Sword Active Button - doar în faza inițială */}
          {phase === PHASES.INITIAL && (
            <TouchableOpacity
              style={styles.swordButton}
              onPress={handleSwordClick}
              activeOpacity={0.8}
            >
              <Image
                source={GameImages.swordActive}
                style={styles.swordActiveIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          {/* Speech bubble */}
          <TouchableOpacity
            style={styles.cloudContainer}
            onPress={phase === PHASES.INITIAL ? handleSkip : undefined}
            activeOpacity={0.9}
            disabled={phase !== PHASES.INITIAL}
          >
            <Image
              source={GameImages.talkingCloud}
              style={styles.cloudImage}
              resizeMode="contain"
            />
            <View style={styles.cloudContent}>
              <Text
                style={[
                  styles.messageText,
                  phase === PHASES.SCARED && styles.scaredText,
                ]}
              >
                {message}
              </Text>

              {phase === PHASES.INITIAL && (
                <Text style={styles.tapHint}>
                  Apasă pe nor pentru quiz sau pe sabie pentru a-l ucide
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Belzy */}
          <Image
            source={belzyImage}
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
  contentWrapper: {
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
  swordButton: {
    position: "absolute",
    top: rem(80),
    right: rem(30),
    width: rem(70),
    height: rem(70),
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: rem(35),
    borderWidth: 3,
    borderColor: "rgba(255, 200, 100, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    shadowColor: "#ffcc00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  swordActiveIcon: {
    width: rem(45),
    height: rem(45),
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
    color: "#333",
    textAlign: "center",
    lineHeight: rem(24),
  },
  scaredText: {
    color: "#dc2626",
  },
  tapHint: {
    fontSize: rem(11),
    color: "#666",
    textAlign: "center",
    marginTop: rem(10),
    fontStyle: "italic",
  },
});

export default BelzySwordScene;
