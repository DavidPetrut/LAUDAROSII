import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { colors } from "../../../../public/styles/global";
import { DevotionalIcon } from "./DevotionalIcon";
import { IconPicker } from "./IconPicker";
import { ColorSwatches } from "./ColorSwatches";
import { TaskEditorModal } from "./TaskEditorModal";
import { devotionalsApi } from "./devotionalsApi";

const DAYS = [
  { label: "Lu", wd: 2 },
  { label: "Ma", wd: 3 },
  { label: "Mi", wd: 4 },
  { label: "Jo", wd: 5 },
  { label: "Vi", wd: 6 },
  { label: "Sâ", wd: 7 },
  { label: "Du", wd: 1 },
];

const SUGGESTIONS = [
  { title: "Rugăciune", icon: "hands-pray", iconSet: "material", durationMin: 15 },
  { title: "Închinare", icon: "musical-notes-outline", iconSet: "ionicons", durationMin: 10 },
  { title: "Citirea Cuvântului", icon: "book-outline", iconSet: "ionicons", durationMin: 10 },
  { title: "Mulțumire", icon: "happy-outline", iconSet: "ionicons", durationMin: 5 },
  { title: "Meditație", icon: "meditation", iconSet: "material", durationMin: 10 },
  { title: "Mijlocire", icon: "people-outline", iconSet: "ionicons", durationMin: 10 },
];

/**
 * Ecran de construire/editare a unui devotional: nume, iconita, culoare, zilele
 * programate si lista de task-uri (adaugate din sugestii sau custom).
 */
export const BuilderView = ({ initial, onSaved, onCancel }) => {
  const [name, setName] = useState(initial?.name || "");
  const [icon, setIcon] = useState({ set: initial?.iconSet || "ionicons", name: initial?.icon || "book-outline" });
  const [color, setColor] = useState(initial?.color || "#10b981");
  const [weekdays, setWeekdays] = useState(initial?.schedule?.weekdays || []);
  const [tasks, setTasks] = useState(initial?.tasks || []);
  const [iconPicker, setIconPicker] = useState(false);
  const [taskEditor, setTaskEditor] = useState({ open: false, index: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleDay = (wd) =>
    setWeekdays((prev) => (prev.includes(wd) ? prev.filter((x) => x !== wd) : [...prev, wd]));

  const addSuggestion = (s) => setTasks((prev) => [...prev, { ...s, color }]);
  const removeTask = (i) => setTasks((prev) => prev.filter((_, idx) => idx !== i));

  const saveTask = (task) => {
    setTasks((prev) => {
      if (taskEditor.index === null) return [...prev, task];
      const copy = [...prev];
      copy[taskEditor.index] = task;
      return copy;
    });
    setTaskEditor({ open: false, index: null });
  };

  const canSave = name.trim().length > 0 && tasks.length > 0;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    const payload = {
      name: name.trim(),
      icon: icon.name,
      iconSet: icon.set,
      color,
      tasks,
      schedule: { weekdays },
    };
    try {
      const res = initial
        ? await devotionalsApi.update(initial._id, payload)
        : await devotionalsApi.create(payload);
      onSaved(res.devotional);
    } catch (e) {
      setError(e.message || "Nu am putut salva.");
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.builderHeaderRow}>
        <TouchableOpacity
          style={[styles.taskIconBtn, { backgroundColor: color + "22", borderColor: color }]}
          onPress={() => setIconPicker(true)}
        >
          <DevotionalIcon set={icon.set} name={icon.name} size={30} color={color} />
        </TouchableOpacity>
        <TextInput
          style={[styles.inputBox, { flex: 1 }]}
          value={name}
          onChangeText={setName}
          placeholder="Nume devotional"
          placeholderTextColor={colors.textMuted}
          maxLength={60}
        />
      </View>

      <Text style={styles.stepLabel}>Culoare</Text>
      <ColorSwatches value={color} onChange={setColor} />

      <Text style={styles.stepLabel}>Zile (opțional)</Text>
      <View style={styles.chipsRow}>
        {DAYS.map((d) => (
          <TouchableOpacity
            key={d.wd}
            style={[styles.dayChip, weekdays.includes(d.wd) && { backgroundColor: color, borderColor: color }]}
            onPress={() => toggleDay(d.wd)}
          >
            <Text style={[styles.chipText, weekdays.includes(d.wd) && styles.chipTextActive]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.stepLabel}>Momente</Text>
      {tasks.map((t, i) => (
        <View key={`${t.title}-${i}`} style={styles.taskRow}>
          <View style={[styles.taskDot, { backgroundColor: (t.color || color) + "22" }]}>
            <DevotionalIcon set={t.iconSet} name={t.icon} size={20} color={t.color || color} />
          </View>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setTaskEditor({ open: true, index: i })}>
            <Text style={styles.taskTitle}>{t.title}</Text>
            <Text style={styles.taskMeta}>{t.durationMin} min</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => removeTask(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.stepLabel}>Adaugă rapid</Text>
      <View style={styles.chipsRow}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity key={s.title} style={styles.suggestionChip} onPress={() => addSuggestion(s)}>
            <DevotionalIcon set={s.iconSet} name={s.icon} size={16} color={colors.textSecondary} />
            <Text style={styles.suggestionText}>{s.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.addCustomBtn} onPress={() => setTaskEditor({ open: true, index: null })}>
        <Ionicons name="add" size={20} color={color} />
        <Text style={[styles.addCustomText, { color }]}>Task personalizat</Text>
      </TouchableOpacity>

      {!!error && <Text style={styles.errorNote}>{error}</Text>}

      <TouchableOpacity
        style={[styles.startBtn, !canSave && styles.startBtnDisabled]}
        onPress={save}
        disabled={!canSave || saving}
        activeOpacity={0.9}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.startBtnText}>{initial ? "Salvează" : "Creează devotional"}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipBtn} onPress={onCancel}>
        <Text style={styles.skipBtnText}>Anulează</Text>
      </TouchableOpacity>

      <IconPicker
        visible={iconPicker}
        color={color}
        selected={icon}
        onSelect={(set, name) => {
          setIcon({ set, name });
          setIconPicker(false);
        }}
        onClose={() => setIconPicker(false)}
      />
      <TaskEditorModal
        visible={taskEditor.open}
        initial={taskEditor.index !== null ? tasks[taskEditor.index] : null}
        baseColor={color}
        onSave={saveTask}
        onClose={() => setTaskEditor({ open: false, index: null })}
      />
    </ScrollView>
  );
};

export default BuilderView;
