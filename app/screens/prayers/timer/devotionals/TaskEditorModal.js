import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { DevotionalIcon } from "./DevotionalIcon";
import { IconPicker } from "./IconPicker";
import { ColorSwatches } from "./ColorSwatches";
import { NumberPromptModal } from "./NumberPromptModal";

const DURATIONS = [5, 10, 15];
const DEFAULT_DESC = "Alege ce se potrivește pentru acest moment.";

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
 * Editor pentru un moment: iconita, titlu, culoare si durata. Optiunile avansate
 * (muzica + optiuni de template) stau intr-o modala deschisa din butonul de setari.
 */
export const TaskEditorModal = ({ visible, initial, baseColor = "#10b981", templateMode = false, onSave, onClose }) => {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState({ set: "ionicons", name: "flower-outline" });
  const [color, setColor] = useState(baseColor);
  const [durationMin, setDurationMin] = useState(10);
  const [music, setMusic] = useState({ enabled: false, category: "instrumental" });
  const [chooseMusic, setChooseMusic] = useState(false);
  const [chooseList, setChooseList] = useState(false);
  const [description, setDescription] = useState("");
  const [picker, setPicker] = useState(false);
  const [colorPicker, setColorPicker] = useState(false);
  const [durationPrompt, setDurationPrompt] = useState(false);
  const [settings, setSettings] = useState(false);
  const [descPrompt, setDescPrompt] = useState({ open: false, target: null, text: "" });

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title || "");
      setIcon({ set: initial?.iconSet || "ionicons", name: initial?.icon || "flower-outline" });
      setColor(initial?.color || baseColor);
      setDurationMin(initial?.durationMin || 10);
      setMusic(initial?.music || { enabled: false, category: "instrumental" });
      setChooseMusic(!!initial?.chooseMusic);
      setChooseList(!!initial?.chooseList);
      setDescription(initial?.description || "");
      setSettings(false);
    }
  }, [visible, initial, baseColor]);

  const applySuggestion = (s) => {
    setTitle(s.title);
    setIcon({ set: s.iconSet, name: s.icon });
    setDurationMin(s.durationMin);
  };

  const save = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      icon: icon.name,
      iconSet: icon.set,
      color,
      durationMin,
      music,
      chooseMusic,
      chooseList,
      description: description.trim(),
    });
  };

  const hasAdvanced = music.enabled || chooseMusic || chooseList;

  // La pornirea unui switch de "userul alege", cere o descriere (Adauga/Renunta).
  const onToggleChoose = (target, value) => {
    if (!value) {
      if (target === "music") setChooseMusic(false);
      else setChooseList(false);
      return;
    }
    setDescPrompt({ open: true, target, text: description || DEFAULT_DESC });
  };

  const confirmDesc = () => {
    if (descPrompt.target === "music") setChooseMusic(true);
    else setChooseList(true);
    setDescription(descPrompt.text.trim());
    setDescPrompt({ open: false, target: null, text: "" });
  };

  const cancelDesc = () => setDescPrompt({ open: false, target: null, text: "" });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: "86%" }]} onPress={() => {}}>
          <View style={styles.sheetHandle} />

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
              style={[styles.taskGearBtn, hasAdvanced && styles.taskGearBtnActive]}
              onPress={() => setSettings(true)}
            >
              <Ionicons name="settings-outline" size={18} color={hasAdvanced ? color : "rgba(229,231,235,0.7)"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.taskColorBtn, { backgroundColor: color }]}
              onPress={() => setColorPicker(true)}
            />
          </View>

          {!initial && (
            <>
              <Text style={styles.stepLabel}>Momente rapide</Text>
              <ScrollView
                style={styles.suggestScroll}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
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
          <View style={styles.durRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.durBox, durationMin === d && styles.durBoxActive]}
                onPress={() => setDurationMin(d)}
              >
                <Text style={[styles.durBoxText, durationMin === d && styles.durBoxTextActive]}>{d} min</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.durBox, !DURATIONS.includes(durationMin) && styles.durBoxActive]}
              onPress={() => setDurationPrompt(true)}
            >
              <Text style={[styles.durBoxText, !DURATIONS.includes(durationMin) && styles.durBoxTextActive]}>
                {DURATIONS.includes(durationMin) ? "custom" : `${durationMin} min`}
              </Text>
            </TouchableOpacity>
          </View>

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

      <Modal visible={settings} transparent animationType="fade" onRequestClose={() => setSettings(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setSettings(false)}>
          <Pressable style={styles.colorSheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Setări moment</Text>

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

            {templateMode && (
              <>
                <Text style={styles.stepLabel}>Template</Text>
                <View style={styles.repeatRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.repeatTitle}>Userul alege muzica</Text>
                    <Text style={styles.repeatDesc}>La import, userul își alege muzica</Text>
                  </View>
                  <Switch value={chooseMusic} onValueChange={(v) => onToggleChoose("music", v)} trackColor={{ true: color, false: "rgba(255,255,255,0.2)" }} thumbColor="#fff" />
                </View>
                <View style={styles.repeatRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.repeatTitle}>Userul alege lista</Text>
                    <Text style={styles.repeatDesc}>La import, userul își alege lista de rugăciuni</Text>
                  </View>
                  <Switch value={chooseList} onValueChange={(v) => onToggleChoose("list", v)} trackColor={{ true: color, false: "rgba(255,255,255,0.2)" }} thumbColor="#fff" />
                </View>
                {!!description && (chooseMusic || chooseList) && (
                  <Text style={styles.noteSoft} numberOfLines={2}>Descriere: {description}</Text>
                )}
              </>
            )}

            <TouchableOpacity style={[styles.startBtn, { marginTop: 16 }]} onPress={() => setSettings(false)} activeOpacity={0.9}>
              <Text style={styles.startBtnText}>Gata</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={descPrompt.open} transparent animationType="fade" onRequestClose={cancelDesc}>
        <Pressable style={styles.menuBackdrop} onPress={cancelDesc}>
          <Pressable style={styles.colorSheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Adaugă o descriere</Text>
            <Text style={styles.repeatDesc}>Apare la user când configurează acest moment la import.</Text>
            <TextInput
              style={[styles.inputBox, styles.inputMultiline, { marginTop: 12 }]}
              value={descPrompt.text}
              onChangeText={(t) => setDescPrompt((p) => ({ ...p, text: t }))}
              placeholder={DEFAULT_DESC}
              placeholderTextColor="rgba(229,231,235,0.4)"
              multiline
              maxLength={300}
            />
            <TouchableOpacity style={[styles.startBtn, { marginTop: 16 }]} onPress={confirmDesc} activeOpacity={0.9}>
              <Text style={styles.startBtnText}>Adaugă</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={cancelDesc}>
              <Text style={styles.skipBtnText}>Renunță</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
};

export default TaskEditorModal;
