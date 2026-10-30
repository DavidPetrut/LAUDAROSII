/** New Blockout Date (din poze): All Day + Start/End + Repeat + Reason + panou Conflicte (Decline/Ignore).
 *  Validare pe ambele părți (client + server): interval valid, dedup concurent pe server. */
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, ScrollView, Pressable, Switch, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcIconButton, PcDateField, PcSelect } from "../../components";

const pad = (n) => String(n).padStart(2, "0");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const REPEATS = [
  { value: "none", label: "Fără" },
  { value: "weekly", label: "Săptămânal" },
  { value: "monthly", label: "Lunar" },
  { value: "yearly", label: "Anual" },
];

export function BlockoutEditorScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const initial = route.params?.startDate || today();
  const [allDay, setAllDay] = useState(true);
  const [startDate, setStartDate] = useState(initial);
  const [endDate, setEndDate] = useState(initial);
  const [repeat, setRepeat] = useState("none");
  const [reason, setReason] = useState("");
  const [conflicts, setConflicts] = useState([]);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Repeat exclusiv cu intervalul: când se repetă, e o SINGURĂ dată de bază (fără end).
  const isRepeat = repeat !== "none";
  const rangeValid = isRepeat ? !!startDate : (startDate && endDate && endDate >= startDate);
  const hasConflict = conflicts.length > 0;          // REGULĂ: orice conflict blochează salvarea
  const canSave = rangeValid && !hasConflict && !saving;

  const checkConflicts = useCallback(async () => {
    if (!rangeValid) { setConflicts([]); return; }
    setChecking(true);
    const endEff = isRepeat ? startDate : endDate;
    try { setConflicts((await pcApi.schedule.conflicts(startDate, endEff)).conflicts || []); }
    catch (e) { /* silent */ }
    finally { setChecking(false); }
  }, [startDate, endDate, rangeValid, isRepeat]);
  useEffect(() => { checkConflicts(); }, [checkConflicts]);

  // dacă endDate < startDate după schimbare, aliniază
  useEffect(() => { if (endDate < startDate) setEndDate(startDate); }, [startDate]); // eslint-disable-line

  const save = async () => {
    if (!rangeValid) return showError(isRepeat ? "Alege data de bază." : "Interval invalid: data de final trebuie să fie ≥ data de început.");
    if (hasConflict) return showError("Ai conflicte în interval — nu poți salva. Rezolvă din programul tău sau vorbește cu planificatorul.");
    setSaving(true);
    try {
      await pcApi.schedule.createBlockouts([{ startDate, endDate: isRepeat ? startDate : endDate, allDay, repeat, reason }]);
      showSuccess("Blockout salvat.");
      navigation.goBack();
    } catch (e) { showError(e?.message || "Nu s-a putut salva."); }
    finally { setSaving(false); }
  };

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <PcIconButton icon="close" color={pcColors.primary} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>New Blockout Date</Text>
        <Pressable onPress={save} hitSlop={10} disabled={!canSave}>
          {saving ? <ActivityIndicator color={pcColors.primary} /> : <Ionicons name="save-outline" size={24} color={canSave ? pcColors.primary : pcColors.textMuted} />}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {/* Conflicte */}
        {/* Conflicte — VIEW ONLY. Dacă există, blockout-ul NU se poate salva (regula David). */}
        {conflicts.length > 0 && (
          <View style={styles.conflictBox}>
            <View style={styles.conflictHead}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="warning" size={18} color={pcColors.danger} />
                <Text style={styles.conflictTitle}>{conflicts.length} {conflicts.length === 1 ? "conflict" : "conflicte"} — nu poți salva</Text>
              </View>
            </View>
            {conflicts.map((c) => (
              <View key={String(c.assignmentId)} style={styles.conflictRow}>
                <Ionicons name={c.status === "confirmed" ? "checkmark-circle" : "help-circle"} size={16} color={c.status === "confirmed" ? pcColors.primary : pcColors.orange} />
                <Text style={styles.conflictTxt} numberOfLines={1}>{c.dateLabel}  {c.serviceTypeName || ""}{c.positionName ? ` · ${c.positionName}` : (c.label ? `  ${c.label}` : "")}</Text>
              </View>
            ))}
            <Text style={styles.conflictNote}>Ești deja programat în interval. Blockout-ul nu se poate pune peste o programare — rezolvă din programul tău sau vorbește cu planificatorul.</Text>
          </View>
        )}
        {checking && <Text style={styles.checking}>Verific conflicte…</Text>}

        <View style={styles.row}>
          <Text style={styles.lbl}>All Day</Text>
          <Switch value={allDay} onValueChange={setAllDay} trackColor={{ true: pcColors.primary, false: pcColors.inputBorder }} thumbColor="#fff" />
        </View>

        {/* Repeat SUS, exclusiv cu intervalul (regula David) */}
        <Text style={styles.fieldLbl}>Repeat</Text>
        <PcSelect value={repeat} options={REPEATS} onChange={setRepeat} />

        {isRepeat ? (
          <>
            <Text style={styles.fieldLbl}>Dată de bază (se repetă {REPEATS.find((r) => r.value === repeat)?.label.toLowerCase()})</Text>
            <PcDateField value={startDate} onChange={setStartDate} />
          </>
        ) : (
          <>
            <Text style={styles.fieldLbl}>Start</Text>
            <PcDateField value={startDate} onChange={setStartDate} />
            <Text style={styles.fieldLbl}>End</Text>
            <PcDateField value={endDate} onChange={setEndDate} />
            {!rangeValid && <Text style={styles.err}>Data de final trebuie să fie ≥ data de început.</Text>}
          </>
        )}

        <Text style={styles.fieldLbl}>Reason</Text>
        <TextInput style={styles.reason} value={reason} onChangeText={setReason} placeholder="Motiv (opțional)" placeholderTextColor={pcColors.textMuted} multiline textAlignVertical="top" />
      </ScrollView>
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  conflictBox: { borderWidth: 1, borderColor: pcColors.danger, borderRadius: 12, padding: 12, marginBottom: 18, backgroundColor: "rgba(229,83,75,0.07)" },
  conflictHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  conflictTitle: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "700" },
  segment: { flexDirection: "row", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: pcColors.chipBorder },
  segBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  segOn: { backgroundColor: pcColors.orange },
  segTxt: { color: pcColors.textSecondary, fontSize: 12, fontWeight: "700" },
  segTxtOn: { color: "#0A0A0A" },
  conflictRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  conflictTxt: { color: pcColors.textSecondary, fontSize: 13, flex: 1 },
  conflictNote: { color: pcColors.textMuted, fontSize: 12, marginTop: 8, fontStyle: "italic" },
  checking: { color: pcColors.textMuted, fontSize: 12, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  lbl: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
  fieldLbl: { color: pcColors.textSecondary, fontSize: 13, marginTop: 16, marginBottom: 6 },
  err: { color: pcColors.danger, fontSize: 12, marginTop: 6 },
  reason: { color: pcColors.textPrimary, fontSize: 16, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, padding: 12, minHeight: 80, marginBottom: 20 },
});

export default BlockoutEditorScreen;
