import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { devotionalStyles as styles } from "../devotionalStyles";

/**
 * Widget fin de sub ceas: un singur buton "Pauză". La apasare se pune pauza si
 * apar, pe acelasi rand, "Reia" si "Stop". "Reia" revine la un singur buton si
 * continua; "Stop" iese din sesiune (cu fade-out gestionat de parinte).
 */
export const PlayerControls = ({ paused, onPause, onResume, onStop }) => {
  if (!paused) {
    return (
      <TouchableOpacity style={styles.ctrlPause} onPress={onPause} activeOpacity={0.85}>
        <Text style={styles.ctrlPauseIcon}>❚❚</Text>
        <Text style={styles.ctrlPauseLabel}>Pauză</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.ctrlRow}>
      <TouchableOpacity style={styles.ctrlResume} onPress={onResume} activeOpacity={0.85}>
        <Text style={styles.ctrlResumeText}>▶ Reia</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.ctrlStop} onPress={onStop} activeOpacity={0.85}>
        <Text style={styles.ctrlStopText}>■ Stop</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PlayerControls;
