/** Edit Sequence — din aranjament (permanent) SAU dintr-un plan (one-time + toggle „Update Arrangement").
 *  Labels default + custom („New Label"), reordonare (↑/↓), duplicate/delete pe rând.
 *  ⚠️ Drag-and-drop + swipe-left gesturi = seam (necesită react-native-gesture-handler + reanimated + build);
 *     aici reordonarea e cu ↑/↓ iar acțiunile rapide sunt iconițe pe rând (funcțional echivalent). */
import React, { useState, useCallback } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcIconButton, PcBottomSheet, PcButton } from "../../components";

const DEFAULT_LABELS = [
  "Intro", "Verse", "Verse 1", "Verse 2", "Verse 3", "Pre-Chorus", "Chorus",
  "Chorus 1", "Chorus 2", "Post-Chorus", "Bridge", "Instrumental", "Interlude",
  "Tag", "Vamp", "Turnaround", "Breakdown", "Refrain", "Channel", "Ending", "Outro",
];

export function SequenceEditorScreen({ navigation, route }) {
  const { mode, songId, arrangementId, planId, itemId } = route.params || {};
  const insets = useSafeAreaInsets();
  const [seq, setSeq] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [updateArr, setUpdateArr] = useState(false); // plan mode toggle

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "plan") {
        const it = await pcApi.plans.item(planId, itemId);
        let s = Array.isArray(it.sequence) ? it.sequence : [];
        if (s.length === 0 && (it.arrangementId || arrangementId) && it.songId) {
          try { const arr = await pcApi.songs.arrangement(it.songId, it.arrangementId || arrangementId); s = arr.sequence || []; } catch (_) {}
        }
        setSeq(s);
      } else {
        const arr = await pcApi.songs.arrangement(songId, arrangementId);
        setSeq(arr.sequence || []);
      }
    } catch (e) { showError(e?.message || "Eroare la secvență."); }
    finally { setLoading(false); }
  }, [mode, songId, arrangementId, planId, itemId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const move = (i, dir) => setSeq((arr) => {
    const j = i + dir; if (j < 0 || j >= arr.length) return arr;
    const next = [...arr]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });
  const duplicate = (i) => setSeq((arr) => [...arr.slice(0, i + 1), arr[i], ...arr.slice(i + 1)]);
  const remove = (i) => setSeq((arr) => arr.filter((_, k) => k !== i));
  const addLabel = (label) => { setSeq((arr) => [...arr, label]); setAddOpen(false); setCustom(""); };

  const save = async () => {
    setSaving(true);
    try {
      if (mode === "plan") await pcApi.plans.updateItem(planId, itemId, { sequence: seq, updateArrangementSequence: updateArr });
      else await pcApi.songs.updateArrangement(songId, arrangementId, { sequence: seq });
      navigation.goBack();
    } catch (e) { showError(e?.message || "Nu s-a putut salva."); }
    finally { setSaving(false); }
  };

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <PcIconButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Sequence</Text>
        <Pressable onPress={save} hitSlop={10} disabled={saving}>
          {saving ? <ActivityIndicator color={pcColors.primary} /> : <Text style={styles.save}>Save</Text>}
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
          {mode === "plan" && (
            <Pressable style={styles.toggleRow} onPress={() => setUpdateArr((v) => !v)}>
              <Ionicons name={updateArr ? "checkbox" : "square-outline"} size={22} color={updateArr ? pcColors.primary : pcColors.textMuted} />
              <Text style={styles.toggleTxt}>Update Arrangement Sequence (salvează permanent, nu doar pe acest plan)</Text>
            </Pressable>
          )}

          {seq.length === 0 && <Text style={styles.empty}>Nicio secțiune încă. Atinge „+" pentru a adăuga.</Text>}

          {seq.map((label, i) => (
            <View key={`${label}-${i}`} style={styles.row}>
              <Text style={styles.rowIdx}>{i + 1}</Text>
              <Text style={styles.rowLabel}>{label}</Text>
              <View style={styles.rowActions}>
                <PcIconButton icon="chevron-up" size={20} color={i === 0 ? pcColors.textMuted : pcColors.textSecondary} onPress={() => move(i, -1)} />
                <PcIconButton icon="chevron-down" size={20} color={i === seq.length - 1 ? pcColors.textMuted : pcColors.textSecondary} onPress={() => move(i, 1)} />
                <PcIconButton icon="copy-outline" size={18} color={pcColors.textSecondary} onPress={() => duplicate(i)} />
                <PcIconButton icon="trash-outline" size={18} color={pcColors.danger} onPress={() => remove(i)} />
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Pressable style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => setAddOpen(true)}>
        <Ionicons name="add" size={30} color="#0A0A0A" />
      </Pressable>

      <PcBottomSheet visible={addOpen} onClose={() => setAddOpen(false)} maxHeightPct={0.75}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <Text style={styles.sheetTitle}>Adaugă secțiune</Text>
          <View style={styles.labelGrid}>
            {DEFAULT_LABELS.map((l) => (
              <Pressable key={l} style={styles.labelChip} onPress={() => addLabel(l)}>
                <Text style={styles.labelTxt}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.orLbl}>New Label (custom)</Text>
          <View style={styles.customRow}>
            <TextInput style={styles.customIn} value={custom} onChangeText={setCustom} placeholder="Nume secțiune" placeholderTextColor={pcColors.textMuted} />
            <PcButton title="Confirmă" onPress={() => custom.trim() && addLabel(custom.trim())} disabled={!custom.trim()} />
          </View>
        </View>
      </PcBottomSheet>
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  save: { color: pcColors.primary, fontSize: 16, fontWeight: "700", paddingHorizontal: 8 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, paddingVertical: 6 },
  toggleTxt: { color: pcColors.textPrimary, fontSize: 13, flex: 1, lineHeight: 18 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 30 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: pcColors.card, borderRadius: 10, paddingLeft: 14, paddingRight: 4, paddingVertical: 4, marginBottom: 8 },
  rowIdx: { color: pcColors.textMuted, fontSize: 13, width: 22 },
  rowLabel: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600", flex: 1 },
  rowActions: { flexDirection: "row", alignItems: "center" },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: pcColors.primary, alignItems: "center", justifyContent: "center", elevation: 6 },
  sheetTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  labelGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  labelChip: { backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  labelTxt: { color: pcColors.textPrimary, fontSize: 14, fontWeight: "600" },
  orLbl: { color: pcColors.textSecondary, fontSize: 13, marginTop: 18, marginBottom: 8 },
  customRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  customIn: { flex: 1, color: pcColors.textPrimary, fontSize: 16, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 48 },
});

export default SequenceEditorScreen;
