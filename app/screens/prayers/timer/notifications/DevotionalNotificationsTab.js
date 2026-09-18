import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
import { devotionalStyles as styles } from "../devotionalStyles";
import { devotionalReminders } from "./devotionalNotifications";

// eticheta -> weekday expo (Duminica=1 ... Sambata=7)
const DAYS = [
  { label: "Lu", wd: 2 },
  { label: "Ma", wd: 3 },
  { label: "Mi", wd: 4 },
  { label: "Jo", wd: 5 },
  { label: "Vi", wd: 6 },
  { label: "Sâ", wd: 7 },
  { label: "Du", wd: 1 },
];
const MINUTES = [0, 15, 30, 45];
const pad = (n) => n.toString().padStart(2, "0");
const wdLabel = (wd) => DAYS.find((d) => d.wd === wd)?.label || "";

/**
 * Tab intern: creare de memento-uri devotional repetabile (ore + zile). Sunt
 * notificari mobile programate care duc in ecranul Devotional cand sunt apasate.
 */
export const DevotionalNotificationsTab = () => {
  const [list, setList] = useState([]);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState([]);

  useEffect(() => {
    devotionalReminders.list().then(setList);
  }, []);

  const toggleDay = (wd) =>
    setDays((prev) => (prev.includes(wd) ? prev.filter((x) => x !== wd) : [...prev, wd]));

  const stepHour = (delta) => setHour((h) => (h + delta + 24) % 24);

  const canAdd = days.length > 0;

  const add = async () => {
    if (!canAdd) return;
    const next = await devotionalReminders.add({ hour, minute, weekdays: days });
    setList(next);
    setDays([]);
  };

  const remove = async (id) => setList(await devotionalReminders.remove(id));

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.introCard}>
        <Text style={styles.introTitle}>Memento-uri devotional</Text>
        <Text style={styles.introDesc}>
          Notificări repetabile pe telefon care te aduc aici, la timpul ales.
        </Text>
      </View>

      {Platform.OS === "web" && (
        <Text style={styles.helperNote}>
          Notificările programate funcționează pe aplicația mobilă.
        </Text>
      )}

      <Text style={styles.stepLabel}>Ora</Text>
      <View style={styles.timeRow}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => stepHour(-1)}>
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.timeValue}>
          {pad(hour)}:{pad(minute)}
        </Text>
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

      <Text style={styles.stepLabel}>Zile (repetabil săptămânal)</Text>
      <View style={styles.chipsRow}>
        {DAYS.map((d) => (
          <TouchableOpacity
            key={d.wd}
            style={[styles.dayChip, days.includes(d.wd) && styles.chipActive]}
            onPress={() => toggleDay(d.wd)}
          >
            <Text style={[styles.chipText, days.includes(d.wd) && styles.chipTextActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.startBtn, !canAdd && styles.startBtnDisabled]}
        onPress={add}
        disabled={!canAdd}
        activeOpacity={0.9}
      >
        <Text style={styles.startBtnText}>Adaugă memento</Text>
      </TouchableOpacity>

      {list.length > 0 && <Text style={styles.stepLabel}>Memento-urile tale</Text>}
      {list.map((r) => (
        <View key={r.id} style={styles.reminderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTime}>
              {pad(r.hour)}:{pad(r.minute)}
            </Text>
            <Text style={styles.reminderDays}>
              {[...r.weekdays].sort().map(wdLabel).join(" · ")}
            </Text>
          </View>
          <TouchableOpacity onPress={() => remove(r.id)} style={styles.reminderDelete}>
            <Text style={styles.reminderDeleteText}>Șterge</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};

export default DevotionalNotificationsTab;
