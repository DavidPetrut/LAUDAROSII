import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable } from "react-native";
import { devotionalStyles as styles } from "../devotionalStyles";
import { colors } from "../../../../public/styles/global";
import { DevotionalIcon } from "./DevotionalIcon";
import { IconPicker } from "./IconPicker";

const DURATIONS = [5, 10, 15, 20, 30];

/**
 * Editor pentru un task din devotional: titlu, iconita (din picker) si durata.
 */
export const TaskEditorModal = ({ visible, initial, baseColor = "#10b981", onSave, onClose }) => {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState({ set: "ionicons", name: "flower-outline" });
  const [durationMin, setDurationMin] = useState(10);
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title || "");
      setIcon({ set: initial?.iconSet || "ionicons", name: initial?.icon || "flower-outline" });
      setDurationMin(initial?.durationMin || 10);
    }
  }, [visible, initial]);

  const save = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      icon: icon.name,
      iconSet: icon.set,
      color: baseColor,
      durationMin,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{initial ? "Editează task" : "Task nou"}</Text>

          <View style={styles.taskEditRow}>
            <TouchableOpacity
              style={[styles.taskIconBtn, { backgroundColor: baseColor + "22", borderColor: baseColor }]}
              onPress={() => setPicker(true)}
            >
              <DevotionalIcon set={icon.set} name={icon.name} size={26} color={baseColor} />
            </TouchableOpacity>
            <TextInput
              style={[styles.inputBox, { flex: 1 }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Rugăciune de mulțumire"
              placeholderTextColor={colors.textMuted}
              maxLength={60}
            />
          </View>

          <Text style={styles.stepLabel}>Durată</Text>
          <View style={styles.chipsRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, durationMin === d && styles.chipActive]}
                onPress={() => setDurationMin(d)}
              >
                <Text style={[styles.chipText, durationMin === d && styles.chipTextActive]}>{d} min</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.startBtn, !title.trim() && styles.startBtnDisabled]}
            onPress={save}
            disabled={!title.trim()}
            activeOpacity={0.9}
          >
            <Text style={styles.startBtnText}>Salvează</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>

      <IconPicker
        visible={picker}
        color={baseColor}
        selected={icon}
        onSelect={(set, name) => {
          setIcon({ set, name });
          setPicker(false);
        }}
        onClose={() => setPicker(false)}
      />
    </Modal>
  );
};

export default TaskEditorModal;
