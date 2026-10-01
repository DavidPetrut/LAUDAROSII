import React from "react";
import { Modal, Pressable, View, Text, TouchableOpacity } from "react-native";
import { devotionalStyles as styles } from "../devotionalStyles";

const CHOICES = [
  { key: "none", label: "Fără" },
  { key: "instrumental", label: "Instrumental" },
  { key: "lyrics", label: "Cu versuri" },
];

// Selector rapid de muzica pentru un moment (quick-access din popover-ul de actiuni).
export const MusicChooserModal = ({ visible, value, accent = "#10b981", onSave, onClose }) => {
  const current = value?.enabled ? value.category : "none";
  const pick = (key) => {
    onSave(
      key === "none"
        ? { enabled: false, category: value?.category || "instrumental" }
        : { enabled: true, category: key }
    );
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuBackdrop} onPress={onClose}>
        <Pressable style={styles.colorSheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Muzică în acest moment</Text>
          <View style={styles.musicRow}>
            {CHOICES.map((opt) => {
              const active = current === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.musicOpt, active && styles.musicOptActive, active && { borderColor: accent, backgroundColor: accent }]}
                  onPress={() => pick(opt.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.musicOptText, active && styles.musicOptTextActive]} numberOfLines={1}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default MusicChooserModal;
