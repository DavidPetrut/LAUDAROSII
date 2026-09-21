import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as d } from "../timer/devotionalStyles";
import { BulbToggle } from "../../../global/components";

const MOODS = [
  { key: "nelinistit", label: "Nelinistit" },
  { key: "astept", label: "Aștept răspuns" },
  { key: "eliberare", label: "Eliberare" },
  { key: "voia_lui", label: "Voia Lui" },
  { key: "persistent", label: "Persistent" },
];

/**
 * Modal intunecat de adaugare motiv de rugaciune, in stilul modalului "moment nou"
 * din devotionale (fundal inchis, input lizibil, chip-uri de stare). Se reseteaza
 * de fiecare data cand se deschide.
 */
export const PrayerFormModal = ({ visible, onClose, onSubmit, submitting, title = "Adaugă un motiv" }) => {
  const [text, setText] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [mood, setMood] = useState(null);

  useEffect(() => {
    if (visible) {
      setText("");
      setIsUrgent(false);
      setMood(null);
    }
  }, [visible]);

  const canSave = text.trim().length > 0 && !submitting;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={d.sheetBackdrop} onPress={onClose}>
        <Pressable style={d.sheet} onPress={(e) => e.stopPropagation?.()}>
          <View style={d.sheetHandle} />
          <Text style={d.sheetTitle}>{title}</Text>

          <View style={d.inputCard}>
            <View style={d.inputHeader}>
              <Text style={d.inputLabel}>Motivul</Text>
              <Text style={d.charCount}>{text.length}/500</Text>
            </View>
            <TextInput
              style={[d.inputBox, d.inputMultiline]}
              placeholder="Scrie aici…"
              placeholderTextColor="rgba(229,231,235,0.4)"
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
            />
          </View>

          <View style={d.repeatRow}>
            <View style={{ flex: 1 }}>
              <Text style={d.repeatTitle}>Este urgentă?</Text>
              <Text style={d.repeatDesc}>Apare marcată cu prioritate</Text>
            </View>
            <BulbToggle
              value={isUrgent}
              onValueChange={setIsUrgent}
              size="small"
              activeColor="#dc2626"
              activeGlowColor="#ef4444"
              sparkColor="#f87171"
              trackColor="rgba(255,255,255,0.2)"
              activeTrackColor="#f87171"
              activeBorderColor="#dc2626"
              bulbColor="#9ca3af"
              activeBulbColor="#ef4444"
            />
          </View>

          <Text style={d.stepLabel}>Comunică o stare</Text>
          <View style={d.chipsRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[d.chip, mood === m.key && d.chipActive]}
                onPress={() => setMood(mood === m.key ? null : m.key)}
              >
                <Text style={[d.chipText, mood === m.key && d.chipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[d.startBtn, !canSave && d.startBtnDisabled]}
            onPress={() => canSave && onSubmit(text.trim(), isUrgent, mood)}
            disabled={!canSave}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={d.startBtnText}>Salvează</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={d.skipBtn} onPress={onClose}>
            <Text style={d.skipBtnText}>Anulează</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default PrayerFormModal;
