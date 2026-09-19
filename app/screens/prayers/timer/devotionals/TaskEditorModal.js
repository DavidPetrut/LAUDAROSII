import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable } from "react-native";
import { devotionalStyles as styles } from "../devotionalStyles";
import { DevotionalIcon } from "./DevotionalIcon";
import { IconPicker } from "./IconPicker";
import { ColorSwatches } from "./ColorSwatches";

const DURATIONS = [5, 10, 15, 20, 30];

/**
 * Editor pentru un task: titlu, iconita (din picker), culoare proprie (modala) si
 * durata. Fiecare task isi are propria culoare, independent de devotional.
 */
export const TaskEditorModal = ({ visible, initial, baseColor = "#10b981", onSave, onClose }) => {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState({ set: "ionicons", name: "flower-outline" });
  const [color, setColor] = useState(baseColor);
  const [durationMin, setDurationMin] = useState(10);
  const [picker, setPicker] = useState(false);
  const [colorPicker, setColorPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title || "");
      setIcon({ set: initial?.iconSet || "ionicons", name: initial?.icon || "flower-outline" });
      setColor(initial?.color || baseColor);
      setDurationMin(initial?.durationMin || 10);
    }
  }, [visible, initial, baseColor]);

  const save = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), icon: icon.name, iconSet: icon.set, color, durationMin });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{initial ? "Editează moment" : "Moment nou"}</Text>

          <View style={styles.taskEditRow}>
            <TouchableOpacity
              style={[styles.taskIconBtn, { backgroundColor: color + "22", borderColor: color }]}
              onPress={() => setPicker(true)}
            >
              <DevotionalIcon set={icon.set} name={icon.name} size={26} color={color} />
            </TouchableOpacity>
            <TextInput
              style={[styles.inputBox, { flex: 1 }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Rugăciune de mulțumire"
              placeholderTextColor="rgba(229,231,235,0.4)"
              maxLength={60}
            />
            <TouchableOpacity
              style={[styles.taskColorBtn, { backgroundColor: color }]}
              onPress={() => setColorPicker(true)}
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
        color={color}
        selected={icon}
        onSelect={(set, name) => {
          setIcon({ set, name });
          setPicker(false);
        }}
        onClose={() => setPicker(false)}
      />

      <Modal visible={colorPicker} transparent animationType="fade" onRequestClose={() => setColorPicker(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setColorPicker(false)}>
          <View style={styles.colorSheet}>
            <Text style={styles.sheetTitle}>Culoarea momentului</Text>
            <ColorSwatches value={color} onChange={(c) => { setColor(c); setColorPicker(false); }} />
          </View>
        </Pressable>
      </Modal>
    </Modal>
  );
};

export default TaskEditorModal;
