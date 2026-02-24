import React, { useRef, useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { GameImages } from "../assets";

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");

// Fazele cinematicului
const PHASES = {
  FADE_IN: "FADE_IN",
  INTRO: "INTRO",
  VIDEO: "VIDEO",
  FADE_OUT: "FADE_OUT",
};

/**
 * SwordCinematic - Video cinematic când ucizi pe Belzy cu sabia
 * Include ecran intro cu credite înainte de video
 */
const SwordCinematic = ({ visible, onComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const introTextAnim = useRef(new Animated.Value(0)).current;
  const videoRef = useRef(null);
  const [phase, setPhase] = useState(PHASES.FADE_IN);

  useEffect(() => {
    if (visible) {
      setPhase(PHASES.FADE_IN);
      introTextAnim.setValue(0);

      // Fade to black
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setPhase(PHASES.INTRO);

        // Animație fade-in pentru textul intro
        Animated.timing(introTextAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          // După 3 secunde, trecem la video
          setTimeout(() => {
            // Fade out textul intro
            Animated.timing(introTextAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }).start(() => {
              setPhase(PHASES.VIDEO);
            });
          }, 3000);
        });
      });
    } else {
      fadeAnim.setValue(0);
      introTextAnim.setValue(0);
    }
  }, [visible]);

  // Când video-ul se termină
  const handleVideoEnd = useCallback(
    ({ didJustFinish }) => {
      if (didJustFinish) {
        setPhase(PHASES.FADE_OUT);

        // Fade out (back to game)
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }).start(() => {
          onComplete?.();
        });
      }
    },
    [onComplete, fadeAnim]
  );

  const handleVideoError = useCallback(
    (error) => {
      console.error("Video error:", error);
      onComplete?.();
    },
    [onComplete]
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.blackOverlay} />

        {/* Ecran intro cu credite - apare înainte de video */}
        {phase === PHASES.INTRO && (
          <Animated.View
            style={[styles.introContainer, { opacity: introTextAnim }]}
          >
            <Text style={styles.introTitle}>A FILM BY</Text>
            <Text style={styles.introDirector}>DAVID PETRUT</Text>
            <Text style={styles.introRights}>All Rights Reserved</Text>
          </Animated.View>
        )}

        {/* Video player - landscape centrat și scalat să încapă tot */}
        {phase === PHASES.VIDEO && (
          <View style={styles.videoWrapper}>
            <Video
              ref={videoRef}
              source={GameImages.swordSceneVideo}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={true}
              isLooping={false}
              isMuted={false}
              onPlaybackStatusUpdate={handleVideoEnd}
              onError={handleVideoError}
            />
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  blackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "black",
  },
  introContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  introTitle: {
    fontSize: 14,
    fontWeight: "300",
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: 4,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  introDirector: {
    fontSize: 28,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 2,
    marginBottom: 24,
    textAlign: "center",
  },
  introRights: {
    fontSize: 11,
    fontWeight: "300",
    color: "rgba(255, 255, 255, 0.4)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  videoWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  video: {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
  },
});

export default SwordCinematic;
