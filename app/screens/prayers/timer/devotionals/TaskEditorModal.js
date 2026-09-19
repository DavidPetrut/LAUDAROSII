import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { devotionalStyles as styles } from "../devotionalStyles";
import { DevotionalIcon } from "./DevotionalIcon";
import { IconPicker } from "./IconPicker";
import { ColorSwatches } from "./ColorSwatches";
import { NumberPromptModal } from "./NumberPromptModal";

const DURATIONS = [5, 10, 15];

// momente gata facute, oferite doar cand adaugi un moment nou
const SUGGESTIONS = [
  { title: "Rugăciune", icon: "hands-pray", iconSet: "material", durationMin: 15 },
  { title: "Închinare", icon: "musical-notes-outline", iconSet: "ionicons", durationMin: 10 },
  { title: "Citirea Cuvântului", icon: "book-outline", iconSet: "ionicons", durationMin: 10 },
  { title: "Mulțumire", icon: "happy-outline", iconSet: "ionicons", durationMin: 5 },
  { title: "Meditație", icon: "meditation", iconSet: "material", durationMin: 10 },
  { title: "Mijlocire", icon: "people-outline", iconSet: "ionicons", durationMin: 10 },
];

/**
 * Editor pentru un moment: titlu, iconita, culoare proprie si durata. La adaugarea
 * unui moment nou ofera si sugestii gata facute (populeaza campurile la apasare).
 */
export const TaskEditorModal = ({ visible, initial, baseColor = "#10b981", onSave, onClose }) => {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState({ set: "ionicons", name: "flower-outline" });
  const [color, setColor] = useState(baseColor);
  const [durationMin, setDurationMin] = useState(10);
  const [music, setMusic] = useState({ enabled: false, category: "instrumental" });
  const [picker, setPicker] = useState(false);
  const [colorPicker, setColorPicker] = useState(false);
  const [durationPrompt, setDurationPrompt] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title || "");
      setIcon({ set: initial?.iconSet || "ionicons", name: initial?.icon || "flower-outline" });
      setColor(initial?.color || baseColor);
      setDurationMin(initial?.durationMin || 10);
      setMusic(initial?.music || { enabled: false, category: "instrumental" });
    }
  }, [visible, initial, baseColor]);

  const applySuggestion = (s) => {
    setTitle(s.title);
    setIcon({ set: s.iconSet, name: s.icon });
    setDurationMin(s.durationMin);
  };

  const save = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), icon: icon.name, iconSet: icon.set, color, durationMin, music });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
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

          {!initial && (
            <>
              <Text style={styles.stepLabel}>Momente rapide</Text>
              <ScrollView style={styles.suggestList} keyboardShouldPersistTaps="handled">
                {SUGGESTIONS.map((s) => (
                  <TouchableOpacity key={s.title} style={styles.suggestRow} onPress={() => applySuggestion(s)} activeOpacity={0.8}>
                    <View style={[styles.suggestIcon, { backgroundColor: baseColor + "22" }]}>
                      <DevotionalIcon set={s.iconSet} name={s.icon} size={20} color={baseColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestMeta}>{s.durationMin} min</Text>
                      <Text style={styles.suggestName}>{s.title}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

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
            <TouchableOpacity
              style={[styles.chip, !DURATIONS.includes(durationMin) && styles.chipActive]}
              onPress={() => setDurationPrompt(true)}
            >
              <Text style={[styles.chipText, !DURATIONS.includes(durationMin) && styles.chipTextActive]}>
                {DURATIONS.includes(durationMin) ? "custom" : `${durationMin} min`}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.repeatRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.repeatTitle}>Adaugă muzică</Text>
              <Text style={styles.repeatDesc}>Redată în timpul acestui moment</Text>
            </View>
            <Switch
              value={music.enabled}
              onValueChange={(v) => setMusic((m) => ({ ...m, enabled: v }))}
              trackColor={{ true: color, false: "rgba(255,255,255,0.2)" }}
              thumbColor="#fff"
            />
          </View>
          {music.enabled && (
            <View style={[styles.optRow, { marginTop: 8 }]}>
              <TouchableOpacity
                style={[styles.optCard, music.category === "instrumental" && styles.optCardActive]}
                onPress={() => setMusic((m) => ({ ...m, category: "instrumental" }))}
              >
                <Text style={[styles.optCardText, music.category === "instrumental" && styles.optCardTextActive]}>Instrumental</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optCard, music.category === "lyrics" && styles.optCardActive]}
                onPress={() => setMusic((m) => ({ ...m, category: "lyrics" }))}
              >
                <Text style={[styles.optCardText, music.category === "lyrics" && styles.optCardTextActive]}>Cu versuri</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.startBtn, !title.trim() && styles.startBtnDisabled]}
            onPress={save}
            disabled={!title.trim()}
            activeOpacity={0.9}
          >
            <Text style={styles.startBtnText}>{initial ? "Salvează" : "Adaugă"}</Text>
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

      <NumberPromptModal
        visible={durationPrompt}
        title="Durată (minute)"
        unit="min"
        initial={durationMin}
        min={1}
        max={180}
        onConfirm={(n) => { setDurationMin(n); setDurationPrompt(false); }}
        onClose={() => setDurationPrompt(false)}
      />
    </Modal>
  );
};

export default TaskEditorModal;
