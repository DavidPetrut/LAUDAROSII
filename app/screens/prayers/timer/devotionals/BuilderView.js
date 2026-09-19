import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Switch } from "react-native";
import { devotionalStyles as styles } from "../devotionalStyles";
import { TaskEditorModal } from "./TaskEditorModal";
import { TaskTimeline } from "./TaskTimeline";
import { DevotionalHeaderImage } from "./DevotionalHeaderImage";
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

/**
 * Ecran de construire/editare devotional: imagine + nume, culoare de accent,
 * momente ca timeline vertical si programul (zile + repetabil) la final.
 */
export const BuilderView = ({ initial, onSaved, onCancel }) => {
  const [name, setName] = useState(initial?.name || "");
  const [image, setImage] = useState(initial?.image || "");
  const color = initial?.color || "#10b981";
  const [weekdays, setWeekdays] = useState(initial?.schedule?.weekdays || []);
  const [repeatWeekly, setRepeatWeekly] = useState(initial?.schedule?.repeatWeekly !== false);
  const [tasks, setTasks] = useState(initial?.tasks || []);
  const [taskEditor, setTaskEditor] = useState({ open: false, index: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showMissing, setShowMissing] = useState(false);

  const toggleDay = (wd) =>
    setWeekdays((prev) => (prev.includes(wd) ? prev.filter((x) => x !== wd) : [...prev, wd]));

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
  const missing = [
    ...(name.trim().length === 0 ? ["Adaugă un nume devotionalului"] : []),
    ...(tasks.length === 0 ? ["Adaugă minim un moment"] : []),
  ];

  const attemptSave = () => {
    if (saving) return;
    if (!canSave) {
      setShowMissing(true);
      return;
    }
    save();
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    const payload = {
      name: name.trim(),
      image,
      color,
      tasks,
      schedule: { weekdays, repeatWeekly },
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
      <DevotionalHeaderImage image={image} name={name} onChangeName={setName} onPickImage={setImage} />

      <Text style={styles.stepLabel}>Momente</Text>
      <TaskTimeline
        tasks={tasks}
        accent={color}
        onEdit={(i) => setTaskEditor({ open: true, index: i })}
        onRemove={removeTask}
        onAdd={() => setTaskEditor({ open: true, index: null })}
      />

      <Text style={styles.stepLabel}>Zile</Text>
      <View style={styles.daysRow}>
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

      <View style={styles.repeatRow}>
        <View>
          <Text style={styles.repeatTitle}>Repetabil</Text>
          <Text style={styles.repeatDesc}>Se repetă în fiecare săptămână</Text>
        </View>
        <Switch
          value={repeatWeekly}
          onValueChange={setRepeatWeekly}
          trackColor={{ true: color, false: "rgba(255,255,255,0.2)" }}
          thumbColor="#fff"
        />
      </View>

      {!!error && <Text style={styles.errorNote}>{error}</Text>}

      {showMissing && !canSave && (
        <View style={styles.missingCard}>
          <Text style={styles.missingTitle}>Ca să creezi devotionalul, mai ai de făcut:</Text>
          {missing.map((m) => (
            <Text key={m} style={styles.missingItem}>• {m}</Text>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.startBtn, !canSave && styles.startBtnDisabled]}
        onPress={attemptSave}
        disabled={saving}
        activeOpacity={0.9}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.startBtnText}>{initial ? "Salvează" : "Creează devotional"}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipBtn} onPress={onCancel}>
        <Text style={styles.skipBtnText}>Anulează</Text>
      </TouchableOpacity>

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
