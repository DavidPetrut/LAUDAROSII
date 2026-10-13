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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const st = await pcApi.serviceTypes.get(serviceTypeId);
      setName(st.name || "");
      setFrequency(st.frequency || "weekly");
      setUseColors(st.useCustomRowColors !== false);
      setRows(st.itemRowColors || []);
    } catch (e) { showError(e?.message || "Eroare la setări."); }
    finally { setLoading(false); }
  }, [serviceTypeId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setRow = (i, patch) => setRows((a) => a.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const save = async () => {
    setSaving(true);
    try {
      await pcApi.serviceTypes.update(serviceTypeId, {
        frequency, useCustomRowColors: useColors,
        itemRowColors: rows.filter((r) => r.match && r.match.trim()),
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
  toggleTxt: { color: pcColors.textPrimary, fontSize: 15 },
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
