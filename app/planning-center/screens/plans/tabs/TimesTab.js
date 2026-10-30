/** TIMES tab — Slujire / Repetiție / Alte ore. Editabil (add/edit/delete) dacă ai editOrder. */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Pressable, TextInput } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../../global/functions";
import { pcApi } from "../../../api/pcApi";
import { pcColors } from "../../../theme";
import { PcButton, PcBottomSheet } from "../../../components";

const HHMM = /^\d{1,2}:\d{2}$/;
const TYPE_LABEL = { service: "Slujire", rehearsal: "Repetiție", other: "Alt timp" };

function TimeRow({ t, onPress }) {
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap style={styles.row} onPress={onPress}>
      {t.weekday ? (
        <View style={[styles.badge, t.weekdayColor && { backgroundColor: t.weekdayColor }]}><Text style={styles.badgeTxt}>{t.weekday}</Text></View>
      ) : <View style={styles.badge} />}
      <View style={{ flex: 1 }}>
        {!!t.name && <Text style={styles.name}>{t.name}</Text>}
        <Text style={styles.range}>{t.range}</Text>
        <Text style={styles.date}>{t.date}</Text>
      </View>
    </Wrap>
  );
}

export function TimesTab({ planId }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState({ service: [], rehearsal: [], other: [], canEdit: false, timePresets: [] });
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null); // { time } | { type } | null

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await pcApi.plans.times(planId)); }
    catch (e) { showError(e?.message || "Eroare la ore."); }
    finally { setLoading(false); }
  }, [planId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const canEdit = !!data.canEdit;
  const hasTpl = !!(data.rehearsalTemplate && data.rehearsalTemplate.enabled);

  async function applyTemplate() {
    try { await pcApi.plans.applyRehearsalTemplate(planId); showSuccess("Repetiție setată din template."); load(); }
    catch (e) { showError(e?.message || "Eroare."); }
  }

  if (loading) return <ActivityIndicator color={pcColors.primary} style={{ marginTop: 30 }} />;

  const Section = ({ type, title, rows }) => (
    <>
      <View style={styles.secHead}>
        <Text style={styles.section}>{title}</Text>
        {canEdit && <Pressable onPress={() => setEdit({ type })} hitSlop={8}><Text style={styles.add}>+ Adaugă</Text></Pressable>}
      </View>
      {rows.map((t) => <TimeRow key={String(t.id)} t={t} onPress={canEdit ? () => setEdit({ time: t }) : null} />)}
      {!rows.length && (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyTxt}>—</Text>
          {type === "rehearsal" && canEdit && hasTpl && <Pressable onPress={applyTemplate}><Text style={styles.tpl}>↺ din template</Text></Pressable>}
        </View>
      )}
    </>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
      <Section type="service" title="SLUJIRE" rows={data.service} />
      <Section type="rehearsal" title="REPETIȚIE" rows={data.rehearsal} />
      <Section type="other" title="ALTE ORE" rows={data.other} />

      {edit && (
        <TimeEditSheet
          planId={planId} edit={edit} meta={data}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); load(); }}
        />
      )}
    </ScrollView>
  );
}

function TimeEditSheet({ planId, edit, meta, onClose, onSaved }) {
  const time = edit.time || null;
  const type = time?.type || edit.type || "rehearsal";
  const defName = time?.name ?? (type === "service" ? (meta.defaultServiceName || "") : type === "rehearsal" ? "Repetiție" : "");
  const defDate = time?.dateISO || (type === "service" ? (meta.suggestedServiceDate || "") : type === "rehearsal" ? (meta.suggestedRehearsalDate || meta.suggestedServiceDate || "") : (meta.suggestedServiceDate || ""));
  const presets = Array.isArray(meta.timePresets) ? meta.timePresets.filter((p) => p && p.start) : [];

  const [name, setName] = useState(defName);
  const [date, setDate] = useState(defDate);
  const [start, setStart] = useState(time?.startTime || (type === "rehearsal" && meta.rehearsalTemplate?.start) || "");
  const [end, setEnd] = useState(time?.endTime || (type === "rehearsal" && meta.rehearsalTemplate?.end) || "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return showError("Dată invalidă (YYYY-MM-DD).");
    if (!HHMM.test(start)) return showError("Ora de început HH:MM (ex. 18:00).");
    if (end && !HHMM.test(end)) return showError("Ora de final HH:MM.");
    setBusy(true);
    try {
      const payload = { type, name, date, startTime: start, endTime: end };
      if (time) await pcApi.plans.updateTime(planId, time.id, payload);
      else await pcApi.plans.addTime(planId, payload);
      onSaved();
    } catch (e) { showError(e?.message || "Eroare la salvare."); setBusy(false); }
  }
  async function del() {
    setBusy(true);
    try { await pcApi.plans.deleteTime(planId, time.id); onSaved(); }
    catch (e) { showError(e?.message || "Eroare."); setBusy(false); }
  }

  return (
    <PcBottomSheet visible onClose={onClose} maxHeightPct={0.8}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={ss.title}>{time ? "Editează" : "Adaugă"} · {TYPE_LABEL[type]}</Text>

        <Text style={ss.lbl}>Nume</Text>
        <TextInput style={ss.inp} value={name} onChangeText={setName} placeholder={TYPE_LABEL[type]} placeholderTextColor={pcColors.textMuted} />

        <Text style={ss.lbl}>Dată (YYYY-MM-DD)</Text>
        <TextInput style={ss.inp} value={date} onChangeText={setDate} placeholder="2026-11-01" placeholderTextColor={pcColors.textMuted} autoCapitalize="none" />

        {presets.length > 0 && (
          <View style={ss.chips}>
            {presets.map((p, i) => {
              const on = start === p.start && end === p.end;
              return (
                <Pressable key={i} onPress={() => { setStart(p.start || ""); setEnd(p.end || ""); }} style={[ss.chip, on && ss.chipOn]}>
                  <Text style={[ss.chipTxt, on && ss.chipTxtOn]}>{p.label} {p.start}{p.end ? `–${p.end}` : ""}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={ss.timeRow}>
          <View style={{ flex: 1 }}><Text style={ss.lbl}>De la</Text><TextInput style={ss.inp} value={start} onChangeText={setStart} placeholder="18:00" placeholderTextColor={pcColors.textMuted} keyboardType="numbers-and-punctuation" /></View>
          <View style={{ flex: 1 }}><Text style={ss.lbl}>Până la</Text><TextInput style={ss.inp} value={end} onChangeText={setEnd} placeholder="20:00" placeholderTextColor={pcColors.textMuted} keyboardType="numbers-and-punctuation" /></View>
        </View>

        <View style={ss.actions}>
          {time && <PcButton title="Șterge" variant="outline" onPress={del} disabled={busy} style={{ marginRight: "auto" }} />}
          <PcButton title={busy ? "..." : "Salvează"} onPress={save} disabled={busy} />
        </View>
      </ScrollView>
    </PcBottomSheet>
  );
}

const styles = StyleSheet.create({
  secHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, marginBottom: 8 },
  section: { color: pcColors.textSecondary, fontWeight: "700", letterSpacing: 0.5, fontSize: 13 },
  add: { color: pcColors.primary, fontWeight: "700", fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  badge: { width: 46, height: 46, borderRadius: 23, backgroundColor: pcColors.primary, alignItems: "center", justifyContent: "center" },
  badgeTxt: { color: "#0A0A0A", fontWeight: "800", fontSize: 13 },
  name: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  range: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
  date: { color: pcColors.primary, fontSize: 13, marginTop: 2 },
  emptyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  emptyTxt: { color: pcColors.textMuted, fontSize: 14 },
  tpl: { color: pcColors.primary, fontSize: 13, fontWeight: "600" },
});

const ss = StyleSheet.create({
  title: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  lbl: { color: pcColors.textSecondary, fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 4 },
  inp: { color: pcColors.textPrimary, fontSize: 16, backgroundColor: pcColors.bgInput || "#1c222b", borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: pcColors.chipBorder, paddingHorizontal: 12, paddingVertical: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  chipOn: { backgroundColor: pcColors.primary, borderColor: pcColors.primary },
  chipTxt: { color: pcColors.textSecondary, fontSize: 13 },
  chipTxtOn: { color: "#fff", fontWeight: "700" },
  timeRow: { flexDirection: "row", gap: 12 },
  actions: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 22 },
});

export default TimesTab;
