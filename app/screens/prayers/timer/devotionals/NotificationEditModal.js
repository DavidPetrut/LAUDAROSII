import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { devotionalStyles as styles } from "../devotionalStyles";
import { DEFAULT_NOTIF_MESSAGE } from "./devotionalNotify";

const MINUTES = [0, 15, 30, 45];
const MSG_MAX = 160;
const pad = (n) => n.toString().padStart(2, "0");

/**
 * Popup pentru notificarea devotionalului: mesajul afisat pe telefon + ora la care
 * sa fie trimis. Mesajul are un default informativ si o limita rezonabila.
 */
export const NotificationEditModal = ({ visible, value, onSave, onClose }) => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (visible) {
      setMessage(value?.message || DEFAULT_NOTIF_MESSAGE);
      setHour(Number.isInteger(value?.hour) ? value.hour : 8);
      setMinute(Number.isInteger(value?.minute) ? value.minute : 0);
    }
  }, [visible, value]);

  const stepHour = (delta) => setHour((h) => (h + delta + 24) % 24);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Notificarea devotionalului</Text>

          <View style={styles.inputHeader}>
            <Text style={styles.inputLabel}>Mesaj</Text>
            <Text style={styles.charCount}>{message.length}/{MSG_MAX}</Text>
          </View>
          <TextInput
            style={[styles.inputBox, styles.inputMultiline]}
            value={message}
            onChangeText={setMessage}
            placeholder={DEFAULT_NOTIF_MESSAGE}
            placeholderTextColor="rgba(229,231,235,0.4)"
            maxLength={MSG_MAX}
            multiline
          />

          <Text style={styles.stepLabel}>Ora notificării</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => stepHour(-1)}>
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.timeValue}>{pad(hour)}:{pad(minute)}</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => stepHour(1)}>
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipsRow}>
            {MINUTES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, minute === m && styles.chipActive]}
                onPress={() => setMinute(m)}
              >
                <Text style={[styles.chipText, minute === m && styles.chipTextActive]}>:{pad(m)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => onSave({ message: message.trim() || DEFAULT_NOTIF_MESSAGE, hour, minute })}
            activeOpacity={0.9}
          >
            <Text style={styles.startBtnText}>Salvează notificarea</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default NotificationEditModal;
