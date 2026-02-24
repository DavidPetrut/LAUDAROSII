import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { colors, spacing } from "../../../public/styles/global";

const PROGRAMS = [
  {
    id: "just-pray",
    name: "Just Pray",
    emoji: "🙏",
    description: "Rugaciune cu muzica ambientala",
    durations: [10, 15, 30],
    musicUrl: "https://www.youtube.com/watch?v=vJX0QMfMof4",
  },
  {
    id: "worship",
    name: "Worship",
    emoji: "🎵",
    description: "Lauda și închinare",
    hasOptions: true,
    durations: [15, 30],
    playlist: [
      "https://www.youtube.com/watch?v=Ng0Hw4MXOx0",
      "https://www.youtube.com/watch?v=879VY-tA1pY",
      "https://www.youtube.com/watch?v=H5duAw3t3mM",
    ],
  },
];

/**
 * Selector pentru programele de rugaciune
 */
export const ProgramSelector = ({ onStartProgram }) => {
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [withMusic, setWithMusic] = useState(true);

  const handleProgramPress = (program) => {
    setSelectedProgram(program);
    setShowModal(true);
  };

  const handleStartProgram = (duration) => {
    const musicUrl =
      selectedProgram.hasOptions && withMusic
        ? selectedProgram.playlist[
            Math.floor(Math.random() * selectedProgram.playlist.length)
          ]
        : selectedProgram.musicUrl;

    onStartProgram({
      name: selectedProgram.name,
      duration,
      musicUrl: withMusic ? musicUrl : null,
    });
    setShowModal(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Programe de rugaciune</Text>

      {PROGRAMS.map((prog) => (
        <TouchableOpacity
          key={prog.id}
          style={styles.programCard}
          onPress={() => handleProgramPress(prog)}
        >
          <Text style={styles.programEmoji}>{prog.emoji}</Text>
          <View style={styles.programInfo}>
            <Text style={styles.programName}>{prog.name}</Text>
            <Text style={styles.programDesc}>{prog.description}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedProgram?.emoji} {selectedProgram?.name}
            </Text>

            {selectedProgram?.hasOptions && (
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[styles.optionBtn, withMusic && styles.optionActive]}
                  onPress={() => setWithMusic(true)}
                >
                  <Text style={styles.optionText}>🎵 Cu melodie</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionBtn, !withMusic && styles.optionActive]}
                  onPress={() => setWithMusic(false)}
                >
                  <Text style={styles.optionText}>🔇 Fara melodie</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.durationLabel}>Alege durata:</Text>
            <View style={styles.durationRow}>
              {selectedProgram?.durations.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={styles.durationBtn}
                  onPress={() => handleStartProgram(d)}
                >
                  <Text style={styles.durationText}>{d} min</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelText}>Anuleaza</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: spacing.lg },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  programCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  programEmoji: { fontSize: 32, marginRight: spacing.md },
  programInfo: { flex: 1 },
  programName: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  programDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  optionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  optionBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  optionActive: { backgroundColor: "#10b981" },
  optionText: { fontSize: 14, fontWeight: "600" },
  durationLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  durationRow: { flexDirection: "row", gap: spacing.sm },
  durationBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  durationText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  cancelBtn: { marginTop: spacing.lg, alignItems: "center" },
  cancelText: { color: colors.textMuted, fontSize: 16 },
});
