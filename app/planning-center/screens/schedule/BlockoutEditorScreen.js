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
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
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
  const [conflictAction, setConflictAction] = useState("ignore"); // ignore | decline
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Validare client: start <= end.
  const rangeValid = startDate && endDate && endDate >= startDate;

  const checkConflicts = useCallback(async () => {
    if (!rangeValid) { setConflicts([]); return; }
    setChecking(true);
    try { setConflicts((await pcApi.schedule.conflicts(startDate, endDate)).conflicts || []); }
    catch (e) { /* silent */ }
    finally { setChecking(false); }
  }, [startDate, endDate, rangeValid]);
  useEffect(() => { checkConflicts(); }, [checkConflicts]);

  // dacă endDate < startDate după schimbare, aliniază
  useEffect(() => { if (endDate < startDate) setEndDate(startDate); }, [startDate]); // eslint-disable-line

  const save = async () => {
    if (!rangeValid) return showError("Interval invalid: data de final trebuie să fie ≥ data de început.");
    setSaving(true);
    try {
      await pcApi.schedule.createBlockouts([{ startDate, endDate, allDay, repeat, reason }]);
      // Conflicte: dacă userul a ales „Decline", refuză programările din interval.
      if (conflictAction === "decline" && conflicts.length) {
        await Promise.all(conflicts.filter((c) => c.status === "unconfirmed" || c.status === "confirmed").map((c) => pcApi.schedule.respond(c.assignmentId, "decline", "Blockout").catch(() => {})));
      }
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
        <Pressable onPress={save} hitSlop={10} disabled={saving || !rangeValid}>
          {saving ? <ActivityIndicator color={pcColors.primary} /> : <Ionicons name="save-outline" size={24} color={rangeValid ? pcColors.primary : pcColors.textMuted} />}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {/* Conflicte */}
        {conflicts.length > 0 && (
          <View style={styles.conflictBox}>
            <View style={styles.conflictHead}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="warning" size={18} color={pcColors.orange} />
                <Text style={styles.conflictTitle}>{conflicts.length} {conflicts.length === 1 ? "Conflict" : "Conflicts"}</Text>
              </View>
              <View style={styles.segment}>
                <Pressable onPress={() => setConflictAction("decline")} style={[styles.segBtn, conflictAction === "decline" && styles.segOn]}><Text style={[styles.segTxt, conflictAction === "decline" && styles.segTxtOn]}>Decline</Text></Pressable>
                <Pressable onPress={() => setConflictAction("ignore")} style={[styles.segBtn, conflictAction === "ignore" && styles.segOn]}><Text style={[styles.segTxt, conflictAction === "ignore" && styles.segTxtOn]}>Ignore</Text></Pressable>
              </View>
            </View>
            {conflicts.map((c) => (
              <View key={String(c.assignmentId)} style={styles.conflictRow}>
                <Ionicons name={c.status === "confirmed" ? "checkmark-circle" : "help-circle"} size={16} color={c.status === "confirmed" ? pcColors.primary : pcColors.orange} />
                <Text style={styles.conflictTxt} numberOfLines={1}>{c.dateLabel}  {c.label}</Text>
              </View>
            ))}
            <Text style={styles.conflictNote}>{conflictAction === "decline" ? "Programările din interval vor fi refuzate la salvare." : "Programările rămân; blockout-ul se salvează oricum."}</Text>
          </View>
        )}
        {checking && <Text style={styles.checking}>Verific conflicte…</Text>}

        <View style={styles.row}>
          <Text style={styles.lbl}>All Day</Text>
          <Switch value={allDay} onValueChange={setAllDay} trackColor={{ true: pcColors.primary, false: pcColors.inputBorder }} thumbColor="#fff" />
        </View>

        <Text style={styles.fieldLbl}>Start</Text>
        <PcDateField value={startDate} onChange={setStartDate} />
        <Text style={styles.fieldLbl}>End</Text>
        <PcDateField value={endDate} onChange={setEndDate} />
        {!rangeValid && <Text style={styles.err}>Data de final trebuie să fie ≥ data de început.</Text>}

        <Text style={styles.fieldLbl}>Repeat</Text>
        <PcSelect value={repeat} options={REPEATS} onChange={setRepeat} />

        <Text style={styles.fieldLbl}>Reason</Text>
        <TextInput style={styles.reason} value={reason} onChangeText={setReason} placeholder="Motiv (opțional)" placeholderTextColor={pcColors.textMuted} multiline textAlignVertical="top" />
      </ScrollView>
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  conflictBox: { borderWidth: 1, borderColor: pcColors.orange, borderRadius: 12, padding: 12, marginBottom: 18, backgroundColor: "rgba(245,166,35,0.06)" },
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
