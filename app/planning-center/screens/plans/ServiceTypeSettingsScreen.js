/**
 * Service Type Settings (din poza web → mobil dark). Partea construită: Frequency + Item Row Colors.
 * Restul (Note categories / Public View / Control LIVE / Limited File Visibility) = seam.
 */
import React, { useState, useCallback } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess, showInfo } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcSelect, PcCheckbox, PcSectionTitle, PcBottomSheet } from "../../components";

const RECUR = [
  { value: "randomly", label: "Randomly" }, { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" }, { value: "everyWeekday", label: "Every Weekday" },
  { value: "everyOtherWeek", label: "Every Other Week" }, { value: "monthly", label: "Monthly" },
];
const PALETTE = ["#86C13F", "#5AA9F6", "#B794F6", "#F27BA0", "#4FD1C5", "#F6C453", "#F6A86B", "#EF4444", "#9AA0A6", ""];
const TYPES = ["header", "song", "media"];
const WD_OPTS = [{ value: "", label: "—" }, { value: "0", label: "Duminică" }, { value: "1", label: "Luni" }, { value: "2", label: "Marți" }, { value: "3", label: "Miercuri" }, { value: "4", label: "Joi" }, { value: "5", label: "Vineri" }, { value: "6", label: "Sâmbătă" }];
const WOM_OPTS = [{ value: "0", label: "Fiecare" }, { value: "1", label: "Prima" }, { value: "2", label: "A doua" }, { value: "3", label: "A treia" }, { value: "4", label: "A patra" }, { value: "-1", label: "Ultima" }];

export function ServiceTypeSettingsScreen({ route, navigation }) {
  const { serviceTypeId } = route.params || {};
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [useColors, setUseColors] = useState(true);
  const [rows, setRows] = useState([]);
  const [colorFor, setColorFor] = useState(null); // index pt. palette sheet
  // Recurență + Repetiție template
  const [recDay, setRecDay] = useState("");
  const [recWeek, setRecWeek] = useState("0");
  const [reh, setReh] = useState({ enabled: false, dayOffset: "1", start: "", end: "", visibleToTeamIds: [], visibleCapability: "" });
  const [teams, setTeams] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const st = await pcApi.serviceTypes.get(serviceTypeId);
      setName(st.name || "");
      setFrequency(st.frequency || "weekly");
      setUseColors(st.useCustomRowColors !== false);
      setRows(st.itemRowColors || []);
      setRecDay(st.recurringDayOfWeek === 0 || st.recurringDayOfWeek ? String(st.recurringDayOfWeek) : "");
      setRecWeek(String(st.recurringWeekOfMonth || 0));
      const t = st.rehearsalTemplate || {};
      setReh({ enabled: !!t.enabled, dayOffset: String(Number.isFinite(t.dayOffset) ? t.dayOffset : 1), start: t.start || "", end: t.end || "", visibleToTeamIds: (t.visibleToTeamIds || []).map(String), visibleCapability: t.visibleCapability || "" });
      try { const r = await pcApi.teams.manage(serviceTypeId); setTeams((r?.teams || []).map((x) => ({ id: String(x.id), name: x.name }))); } catch {}
    } catch (e) { showError(e?.message || "Eroare la setări."); }
    finally { setLoading(false); }
  }, [serviceTypeId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleRehTeam = (id) => setReh((s) => ({ ...s, visibleToTeamIds: s.visibleToTeamIds.includes(id) ? s.visibleToTeamIds.filter((x) => x !== id) : [...s.visibleToTeamIds, id] }));

  const setRow = (i, patch) => setRows((a) => a.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const save = async () => {
    setSaving(true);
    try {
      await pcApi.serviceTypes.update(serviceTypeId, {
        frequency, useCustomRowColors: useColors,
        itemRowColors: rows.filter((r) => r.match && r.match.trim()),
        recurringDayOfWeek: recDay === "" ? null : parseInt(recDay, 10),
        recurringWeekOfMonth: parseInt(recWeek, 10) || 0,
        rehearsalTemplate: { ...reh, dayOffset: parseInt(reh.dayOffset, 10) || 0 },
      });
      showSuccess("Setări salvate");
      navigation.goBack();
    } catch (e) { showError(e?.message || "Nu s-au putut salva."); }
    finally { setSaving(false); }
  };

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={26} color={pcColors.primary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Settings</Text>
          {!!name && <Text style={styles.headerSub}>{name}</Text>}
        </View>
        <Pressable onPress={save} hitSlop={10} disabled={saving}>
          <Text style={styles.save}>{saving ? "..." : "SAVE"}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: 10 }}>
          <View style={styles.block}>
            <Text style={styles.label}>Frequency</Text>
            <PcSelect value={frequency} options={RECUR} onChange={setFrequency} />
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Ziua slujbei</Text>
            <PcSelect value={recDay} options={WD_OPTS} onChange={setRecDay} />
            {frequency === "monthly" && (
              <>
                <Text style={[styles.label, { marginTop: 12 }]}>Săptămâna</Text>
                <PcSelect value={recWeek} options={WOM_OPTS} onChange={setRecWeek} />
              </>
            )}
            <Text style={styles.hint}>Ziua recurentă = sugestie de dată la planuri/ore.</Text>
          </View>

          <View style={styles.block}>
            <Pressable style={styles.toggleRow2} onPress={() => setReh((s) => ({ ...s, enabled: !s.enabled }))}>
              <PcCheckbox checked={reh.enabled} onPress={() => setReh((s) => ({ ...s, enabled: !s.enabled }))} size={22} />
              <Text style={styles.toggleTxt}>Are repetiție (se creează automat la plan nou)</Text>
            </Pressable>
            {reh.enabled && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.label}>Cu câte zile înainte</Text>
                <TextInput style={styles.inp} value={String(reh.dayOffset)} onChangeText={(v) => setReh((s) => ({ ...s, dayOffset: v.replace(/[^0-9]/g, "") }))} keyboardType="number-pad" placeholder="1" placeholderTextColor={pcColors.textMuted} />
                <View style={styles.timeRow}>
                  <View style={{ flex: 1 }}><Text style={styles.label}>De la</Text><TextInput style={styles.inp} value={reh.start} onChangeText={(v) => setReh((s) => ({ ...s, start: v }))} placeholder="18:00" placeholderTextColor={pcColors.textMuted} /></View>
                  <View style={{ flex: 1 }}><Text style={styles.label}>Până la</Text><TextInput style={styles.inp} value={reh.end} onChangeText={(v) => setReh((s) => ({ ...s, end: v }))} placeholder="20:00" placeholderTextColor={pcColors.textMuted} /></View>
                </View>
                <Text style={[styles.label, { marginTop: 12 }]}>Cine vede repetiția</Text>
                <View style={styles.chips}>
                  {teams.length === 0 && <Text style={styles.hint}>Nicio echipă</Text>}
                  {teams.map((t) => (
                    <Pressable key={t.id} onPress={() => toggleRehTeam(t.id)} style={[styles.chip, reh.visibleToTeamIds.includes(t.id) && styles.chipOn]}>
                      <Text style={[styles.chipTxt, reh.visibleToTeamIds.includes(t.id) && styles.chipTxtOn]}>{t.name}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.hint}>{reh.visibleToTeamIds.length ? "Doar echipele bifate (+ cine editează Order) văd ora." : "Fără restricție → toți cei programați văd ora."}</Text>
              </View>
            )}
          </View>

          <View style={styles.rowBetween}>
            <PcSectionTitle style={{ marginBottom: 0 }}>Item Row Colors</PcSectionTitle>
            <Pressable onPress={() => setRows((a) => [...a, { match: "", label: "Nou", color: "#86C13F" }])} hitSlop={8}>
              <Text style={styles.add}>+ Add</Text>
            </Pressable>
          </View>
          <Pressable style={styles.toggleRow} onPress={() => setUseColors((v) => !v)}>
            <PcCheckbox checked={useColors} onPress={() => setUseColors((v) => !v)} size={22} />
            <Text style={styles.toggleTxt}>Use custom item row colors</Text>
          </Pressable>

          {rows.map((r, i) => {
            const isType = TYPES.includes(String(r.match).toLowerCase());
            return (
              <View key={i} style={styles.colorRow}>
                <Pressable onPress={() => setColorFor(i)} style={[styles.swatch, { backgroundColor: r.color || "transparent", borderColor: r.color ? r.color : pcColors.chipBorder }]}>
                  {!r.color && <Ionicons name="ban-outline" size={16} color={pcColors.textMuted} />}
                </Pressable>
                {isType ? (
                  <Text style={styles.ruleLabel}>{r.label || r.match}</Text>
                ) : (
                  <TextInput style={styles.ruleInput} value={r.match} onChangeText={(v) => setRow(i, { match: v, label: v })} placeholder="keyword (ex. announcements)" placeholderTextColor={pcColors.textMuted} autoCapitalize="none" />
                )}
                {!isType && (
                  <Pressable onPress={() => setRows((a) => a.filter((_, idx) => idx !== i))} hitSlop={6}>
                    <Ionicons name="trash-outline" size={20} color={pcColors.textMuted} />
                  </Pressable>
                )}
              </View>
            );
          })}

          {/* Seam sections */}
          <PcSectionTitle style={{ marginTop: 24 }}>Alte setări (în curând)</PcSectionTitle>
          {["Note categories", "Public View (Schedule Publish)", "Control LIVE", "Limited File Visibility"].map((s) => (
            <Pressable key={s} style={styles.seamRow} onPress={() => showInfo(`${s} — în curând`)}>
              <Text style={styles.seamTxt}>{s}</Text>
              <Ionicons name="chevron-forward" size={18} color={pcColors.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Palette sheet */}
      <PcBottomSheet visible={colorFor !== null} onClose={() => setColorFor(null)} maxHeightPct={0.4}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={styles.sheetTitle}>Culoare rând</Text>
          <View style={styles.paletteWrap}>
            {PALETTE.map((c) => (
              <Pressable
                key={c || "none"}
                style={[styles.paletteSwatch, { backgroundColor: c || "transparent", borderColor: c || pcColors.chipBorder }]}
                onPress={() => { setRow(colorFor, { color: c }); setColorFor(null); }}
              >
                {!c && <Ionicons name="ban-outline" size={18} color={pcColors.textMuted} />}
              </Pressable>
            ))}
          </View>
        </View>
      </PcBottomSheet>
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700" },
  headerSub: { color: pcColors.textSecondary, fontSize: 13, marginTop: 1 },
  save: { color: pcColors.primary, fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
  block: { paddingHorizontal: 16, paddingBottom: 12 },
  label: { color: pcColors.textSecondary, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  add: { color: pcColors.primary, fontWeight: "700", fontSize: 15 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  toggleRow2: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  toggleTxt: { color: pcColors.textPrimary, fontSize: 15, flex: 1 },
  hint: { color: pcColors.textMuted, fontSize: 12, marginTop: 8, lineHeight: 17 },
  inp: { color: pcColors.textPrimary, fontSize: 16, backgroundColor: pcColors.bgInput || "#1c222b", borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: pcColors.chipBorder, paddingHorizontal: 12, paddingVertical: 9, marginTop: 2 },
  timeRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 6 },
  chipOn: { backgroundColor: pcColors.primary, borderColor: pcColors.primary },
  chipTxt: { color: pcColors.textSecondary, fontSize: 13 },
  chipTxtOn: { color: "#fff", fontWeight: "700" },
  colorRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  ruleLabel: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600", flex: 1 },
  ruleInput: { color: pcColors.textPrimary, fontSize: 16, flex: 1, paddingVertical: 4 },
  seamRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  seamTxt: { color: pcColors.textSecondary, fontSize: 16 },
  sheetTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 14 },
  paletteWrap: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  paletteSwatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});

export default ServiceTypeSettingsScreen;
