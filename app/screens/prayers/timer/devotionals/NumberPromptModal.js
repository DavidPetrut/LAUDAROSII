import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable } from "react-native";
import { devotionalStyles as styles } from "../devotionalStyles";

/**
 * Popup mic pentru introducerea manuala a unui numar (ex: minute custom). Valideaza
 * in intervalul dat si intoarce valoarea la confirmare.
 */
export const NumberPromptModal = ({ visible, title, unit = "", initial = 0, min = 1, max = 999, onConfirm, onClose }) => {
  const [text, setText] = useState("");

  useEffect(() => {
    if (visible) setText(initial ? String(initial) : "");
  }, [visible, initial]);

  const confirm = () => {
    const n = parseInt(text, 10);
    if (!Number.isInteger(n) || n < min || n > max) return;
    onConfirm(n);
  };

  const n = parseInt(text, 10);
  const valid = Number.isInteger(n) && n >= min && n <= max;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuBackdrop} onPress={onClose}>
        <Pressable style={styles.colorSheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <View style={styles.numRow}>
            <TextInput
              style={styles.numInput}
              value={text}
              onChangeText={(t) => setText(t.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              placeholder={`${min}–${max}`}
              placeholderTextColor="rgba(229,231,235,0.4)"
              maxLength={4}
              autoFocus
            />
            {!!unit && <Text style={styles.numUnit}>{unit}</Text>}
          </View>
          <TouchableOpacity style={[styles.startBtn, !valid && styles.startBtnDisabled]} onPress={confirm} disabled={!valid}>
            <Text style={styles.startBtnText}>OK</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default NumberPromptModal;
