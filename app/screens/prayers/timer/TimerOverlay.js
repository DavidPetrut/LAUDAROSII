import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Audio } from "expo-av";

const { width, height } = Dimensions.get("window");
const isLandscape = width > height;

/**
 * Overlay full-screen pentru timer activ
 * Design orizontal cu cifre mari și bold
 */
export const TimerOverlay = ({ timeDisplay, onStop, program }) => {
  const soundRef = useRef(null);

  useEffect(() => {
    if (program?.musicUrl) {
      playMusic(program.musicUrl);
    }
    return () => stopMusic();
  }, [program]);

  const playMusic = async (url) => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, isLooping: true }
      );
      soundRef.current = sound;
    } catch (e) {
      console.log("Audio error:", e);
    }
  };

  const stopMusic = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const handleStop = async () => {
    await stopMusic();
    onStop();
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
        <Text style={styles.stopIcon}>■</Text>
      </TouchableOpacity>

      <Text style={styles.timerText}>{timeDisplay}</Text>

      {program && <Text style={styles.programName}>{program.name}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#171717",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  stopBtn: {
    position: "absolute",
    top: 40,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  stopIcon: {
    fontSize: 24,
    color: "#fff",
  },
  timerText: {
    fontSize: 120,
    fontFamily: "Raleway",
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 8,
  },
  programName: {
    position: "absolute",
    bottom: 60,
    fontSize: 20,
    fontFamily: "Raleway",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 4,
  },
});
