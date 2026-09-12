import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { modalStyles as styles } from "./styles";
import { BulbToggle, TestReportButton } from "../../global/components";

const TAG_AFTER = require("../../public/icons/after_tag.png");

const MOODS = [
  { key: "nelinistit", label: "Ma simt nelinistit" },
  { key: "astept", label: "Aștept un răspuns" },
  { key: "eliberare", label: "Nevoie de eliberare" },
  { key: "voia_lui", label: "Accept Voia Lui" },
  { key: "persistent", label: "Persistent" },
];

export const AddPrayerModal = ({
  visible,
  onClose,
  newPrayer,
  setNewPrayer,
  isUrgent,
  setIsUrgent,
  selectedMood,
  setSelectedMood,
  onSubmit,
  submitting,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalContent}>
          <TestReportButton style={{ left: undefined, right: 46, top: 6 }} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Adauga un motiv</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Textarea cu counter integrat */}
            <View style={styles.textareaWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Scrie aici…"
                placeholderTextColor="#64748b"
                value={newPrayer}
                onChangeText={setNewPrayer}
                multiline
                maxLength={500}
              />
              <Text style={styles.charCountInside}>{newPrayer.length}/500</Text>
            </View>

            {/* Toggle urgent modern cu BulbToggle */}
            <View style={styles.urgentToggleRow}>
              <View style={styles.urgentLabelContainer}>
                {isUrgent && (
                  <Image source={TAG_AFTER} style={styles.urgentTagImage} />
                )}
                <Text
                  style={[
                    styles.urgentLabel,
                    isUrgent && styles.urgentLabelActive,
                  ]}
                >
                  {isUrgent ? "URGENT!" : "ESTE URGENTA?"}
                </Text>
              </View>
              <BulbToggle
                value={isUrgent}
                onValueChange={setIsUrgent}
                size="small"
                activeColor="#dc2626"
                activeGlowColor="#ef4444"
                sparkColor="#f87171"
                trackColor="#e5e7eb"
                activeTrackColor="#f87171"
                activeBorderColor="#dc2626"
                bulbColor="#9ca3af"
                activeBulbColor="#ef4444"
              />
            </View>

            <Text style={styles.sectionLabel}>Comunica o stare</Text>
            <View style={styles.moodsContainer}>
              {MOODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[
                    styles.moodBtn,
                    selectedMood === m.key && styles.moodActive,
                  ]}
                  onPress={() =>
                    setSelectedMood(selectedMood === m.key ? null : m.key)
                  }
                >
                  <Text
                    style={[
                      styles.moodText,
                      selectedMood === m.key && styles.moodTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Buton Adaugă - success, dreapta jos */}
          <View style={styles.submitRow}>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitDisabled]}
              onPress={onSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitText}>
                {submitting ? "Se adaugă..." : "Salveaza"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
