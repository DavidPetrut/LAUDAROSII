import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform } from "react-native";
import { devotionalStyles as styles } from "../devotionalStyles";
import { colors } from "../../../../public/styles/global";
import {
  devotionalReminders,
  TITLE_MAX,
  BODY_MAX,
} from "./devotionalNotifications";

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

// notificari gata scrise, de ales rapid dintr-o lista
const PRESETS = [
  { key: "prayer", label: "Rugăciune", title: "Timp de rugăciune", body: "Oprește-te un moment și vorbește cu Dumnezeu." },
  { key: "worship", label: "Închinare", title: "Timp de închinare", body: "Un moment de laudă și mulțumire." },
  { key: "reading", label: "Citire", title: "Citirea Cuvântului", body: "Deschide Biblia și lasă-te condus de El." },
  { key: "thanks", label: "Mulțumire", title: "Recunoștință", body: "Amintește-ți trei lucruri pentru care ești recunoscător." },
];
const MAX_REMINDERS = 10;
const pad = (n) => n.toString().padStart(2, "0");
const wdLabel = (wd) => DAYS.find((d) => d.wd === wd)?.label || "";

/**
 * Tab intern: memento-uri devotional repetabile. Userul alege un text gata scris
 * (presets) SAU scrie unul propriu (cu limita), apoi ora si zilele. Sunt
 * notificari mobile programate care duc in ecranul Devotional cand sunt apasate.
 */
export const DevotionalNotificationsTab = () => {
  const [list, setList] = useState([]);
  const [presetKey, setPresetKey] = useState("prayer");
  const [customTitle, setCustomTitle] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState([]);

  useEffect(() => {
    devotionalReminders.list().then(setList);
  }, []);

  const isCustom = presetKey === "custom";
  const toggleDay = (wd) =>
    setDays((prev) => (prev.includes(wd) ? prev.filter((x) => x !== wd) : [...prev, wd]));
  const stepHour = (delta) => setHour((h) => (h + delta + 24) % 24);

  const customValid = !isCustom || customTitle.trim().length > 0;
  const canAdd = days.length > 0 && customValid && list.length < MAX_REMINDERS;

  const add = async () => {
    if (!canAdd) return;
    const preset = PRESETS.find((p) => p.key === presetKey);
    const next = await devotionalReminders.add({
      title: isCustom ? customTitle : preset.title,
      body: isCustom ? customBody : preset.body,
      hour,
      minute,
      weekdays: days,
    });
    setList(next);
    setDays([]);
    setCustomTitle("");
    setCustomBody("");
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

      <Text style={styles.stepLabel}>Mesaj</Text>
      <View style={styles.chipsRow}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.chip, presetKey === p.key && styles.chipActive]}
            onPress={() => setPresetKey(p.key)}
          >
            <Text style={[styles.chipText, presetKey === p.key && styles.chipTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.chip, isCustom && styles.chipActive]}
          onPress={() => setPresetKey("custom")}
        >
          <Text style={[styles.chipText, isCustom && styles.chipTextActive]}>✎ Personalizat</Text>
        </TouchableOpacity>
      </View>

      {isCustom ? (
        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <Text style={styles.inputLabel}>Titlu</Text>
            <Text style={styles.charCount}>{customTitle.length}/{TITLE_MAX}</Text>
          </View>
          <TextInput
            style={styles.inputBox}
            value={customTitle}
            onChangeText={setCustomTitle}
            placeholder="Ex: Timp cu Dumnezeu"
            placeholderTextColor={colors.textMuted}
            maxLength={TITLE_MAX}
          />
          <View style={[styles.inputHeader, { marginTop: 12 }]}>
            <Text style={styles.inputLabel}>Mesaj</Text>
            <Text style={styles.charCount}>{customBody.length}/{BODY_MAX}</Text>
          </View>
          <TextInput
            style={[styles.inputBox, styles.inputMultiline]}
            value={customBody}
            onChangeText={setCustomBody}
            placeholder="Ex: Oprește-te un moment pentru rugăciune."
            placeholderTextColor={colors.textMuted}
            maxLength={BODY_MAX}
            multiline
          />
        </View>
      ) : (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>{PRESETS.find((p) => p.key === presetKey)?.title}</Text>
          <Text style={styles.previewBody}>{PRESETS.find((p) => p.key === presetKey)?.body}</Text>
        </View>
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

      {list.length >= MAX_REMINDERS && (
        <Text style={styles.helperNote}>Ai atins limita de {MAX_REMINDERS} memento-uri.</Text>
      )}

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
            {!!r.title && (
              <Text style={styles.reminderTitle} numberOfLines={1}>
                {r.title}
              </Text>
            )}
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
