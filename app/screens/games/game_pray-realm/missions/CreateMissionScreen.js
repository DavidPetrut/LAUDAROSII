import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";
import { rem } from "../constants/dimensions";

/**
 * Ecran pentru crearea unei misiuni noi
 */
// Opțiuni preset pentru durata misiunii
const DURATION_OPTIONS = [
  { label: "1 zi", days: 1 },
  { label: "3 zile", days: 3 },
  { label: "7 zile", days: 7 },
  { label: "14 zile", days: 14 },
];

const CreateMissionScreen = ({ visible, onClose, onSubmit }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState(100);
  const [durationDays, setDurationDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const REWARD_OPTIONS = [80, 100, 150];
  const TITLE_SUGGESTIONS = [
    "Nevoie de ajutor",
    "Curățenie Bise",
    "Gătit Sâmbătă",
  ];

  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const getHoursUntilExpiry = () => {
    const now = new Date();
    const diff = Math.ceil((expiresAt - now) / (1000 * 60 * 60));
    return Math.max(0, diff);
  };

  const handleSubmit = async () => {
    // Validări
    if (!title.trim()) {
      setError("Titlul este obligatoriu");
      return;
    }
    if (title.length > 18) {
      setError("Titlul poate avea maxim 18 caractere");
      return;
    }
    if (!description.trim()) {
      setError("Descrierea este obligatorie");
      return;
    }
    if (description.length > 180) {
      setError("Descrierea poate avea maxim 180 caractere");
      return;
    }
    if (expiresAt <= new Date()) {
      setError("Data expirării trebuie să fie în viitor");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const result = await onSubmit?.({
        title: title.trim(),
        description: description.trim(),
        reward,
        expiresAt: expiresAt.toISOString(),
      });

      if (result?.success) {
        // Reset form
        setTitle("");
        setDescription("");
        setReward(100);
        setDurationDays(7);
        onClose?.();
      } else {
        setError(result?.error || "Eroare la crearea misiunii");
      }
    } catch (err) {
      setError(err.message || "Eroare la crearea misiunii");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Creează Misiune Nouă</Text>
          </View>

          {/* Error message */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Titlu */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Titlu Misiune <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.hint}>
              Maxim 18 caractere. Exemple: {TITLE_SUGGESTIONS.join(", ")}
            </Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Titlu scurt (1-3 cuvinte)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              maxLength={18}
            />
            <Text style={styles.charCount}>{title.length}/18</Text>
          </View>

          {/* Descriere */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Descriere <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.hint}>
              Maxim 180 caractere. Descrie ce trebuie să facă participanții.
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descrierea detaliată a misiunii..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              maxLength={180}
              multiline
              numberOfLines={4}
            />
            <Text style={styles.charCount}>{description.length}/180</Text>
          </View>

          {/* Reward */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Câștig Alabastru</Text>
            <View style={styles.rewardOptions}>
              {REWARD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.rewardButton,
                    reward === option && styles.rewardButtonActive,
                  ]}
                  onPress={() => setReward(option)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.rewardButtonText,
                      reward === option && styles.rewardButtonTextActive,
                    ]}
                  >
                    🏺 {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Durata misiunii */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Durata Misiunii</Text>
            <View style={styles.durationOptions}>
              {DURATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.days}
                  style={[
                    styles.durationButton,
                    durationDays === option.days && styles.durationButtonActive,
                  ]}
                  onPress={() => setDurationDays(option.days)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.durationButtonText,
                      durationDays === option.days &&
                        styles.durationButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.expiryPreview}>
              Expiră:{" "}
              {expiresAt.toLocaleDateString("ro-RO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              ({getHoursUntilExpiry()} ore)
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Se postează..." : "🚀 Postează Misiune"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f19",
  },
  scrollContent: {
    padding: rem(20),
    paddingTop: rem(50),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rem(24),
  },
  backButton: {
    padding: rem(8),
    marginRight: rem(12),
  },
  backButtonText: {
    color: "#fff",
    fontSize: rem(24),
  },
  headerTitle: {
    color: "#fbbf24",
    fontSize: rem(20),
    fontWeight: "800",
    letterSpacing: 1,
  },
  errorText: {
    color: "#ef4444",
    fontSize: rem(14),
    marginBottom: rem(16),
    padding: rem(12),
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: rem(8),
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  inputGroup: {
    marginBottom: rem(20),
  },
  label: {
    color: "#fff",
    fontSize: rem(14),
    fontWeight: "600",
    marginBottom: rem(6),
  },
  required: {
    color: "#ef4444",
  },
  hint: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: rem(11),
    marginBottom: rem(8),
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: rem(12),
    padding: rem(14),
    color: "#fff",
    fontSize: rem(15),
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  textArea: {
    minHeight: rem(100),
    textAlignVertical: "top",
  },
  charCount: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: rem(11),
    textAlign: "right",
    marginTop: rem(4),
  },
  rewardOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: rem(10),
  },
  rewardButton: {
    flex: 1,
    padding: rem(14),
    borderRadius: rem(12),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
    alignItems: "center",
  },
  rewardButtonActive: {
    backgroundColor: "rgba(139, 92, 246, 0.3)",
    borderColor: "#8b5cf6",
  },
  rewardButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: rem(14),
    fontWeight: "600",
  },
  rewardButtonTextActive: {
    color: "#fff",
  },
  durationOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rem(8),
  },
  durationButton: {
    paddingHorizontal: rem(16),
    paddingVertical: rem(10),
    borderRadius: rem(10),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  durationButtonActive: {
    backgroundColor: "rgba(139, 92, 246, 0.3)",
    borderColor: "#8b5cf6",
  },
  durationButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: rem(13),
    fontWeight: "600",
  },
  durationButtonTextActive: {
    color: "#fff",
  },
  expiryPreview: {
    color: "#fbbf24",
    fontSize: rem(12),
    marginTop: rem(10),
    fontStyle: "italic",
  },
  submitButton: {
    backgroundColor: "#8b5cf6",
    padding: rem(16),
    borderRadius: rem(14),
    marginTop: rem(20),
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: rem(16),
    fontWeight: "700",
  },
});

export default CreateMissionScreen;
