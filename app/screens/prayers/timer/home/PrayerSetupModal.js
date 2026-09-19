import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { devotionalStyles as styles } from "../devotionalStyles";

const DURATIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "Nelimitat", value: null },
];

/**
 * Popup pentru "Incepe rugaciunea": alegi intai durata, apoi genul muzicii, apoi
 * "Incepe". Intoarce configuratia catre parinte (minutes null = nelimitat).
 */
export const PrayerSetupModal = ({ visible, program, onStart, onClose }) => {
  const [minutes, setMinutes] = useState(15);
  const [category, setCategory] = useState(null);

  const tracksFor = (cat) =>
    (program?.playlist || []).filter((t) => t.category === cat && t.url);
  const noTracks = category && tracksFor(category).length === 0;

  const start = () => {
    if (!category || noTracks) return;
    onStart({ minutes, withMusic: true, category });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Începe rugăciunea</Text>

          <Text style={styles.stepLabel}>Cât timp?</Text>
          <View style={styles.optRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d.label}
                style={[styles.optCard, minutes === d.value && styles.optCardActive]}
                onPress={() => setMinutes(d.value)}
                activeOpacity={0.85}
              >
                <Text style={[styles.optCardText, minutes === d.value && styles.optCardTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.stepLabel}>Muzică</Text>
          <View style={styles.optRow}>
            <TouchableOpacity
              style={[styles.optCard, category === "instrumental" && styles.optCardActive]}
              onPress={() => setCategory("instrumental")}
              activeOpacity={0.85}
            >
              <Text style={[styles.optCardText, category === "instrumental" && styles.optCardTextActive]}>
                Instrumental
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optCard, category === "lyrics" && styles.optCardActive]}
              onPress={() => setCategory("lyrics")}
              activeOpacity={0.85}
            >
              <Text style={[styles.optCardText, category === "lyrics" && styles.optCardTextActive]}>
                Cu versuri
              </Text>
            </TouchableOpacity>
          </View>
          {noTracks && (
            <Text style={styles.helperNote}>Nicio melodie în această categorie încă.</Text>
          )}

          <TouchableOpacity
            style={[styles.startBtn, (!category || noTracks) && styles.startBtnDisabled]}
            onPress={start}
            disabled={!category || noTracks}
            activeOpacity={0.9}
          >
            <Text style={styles.startBtnText}>Începe</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default PrayerSetupModal;
