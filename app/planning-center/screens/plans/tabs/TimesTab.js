/** TIMES tab — Service / Rehearsal / Other times. */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showInfo } from "../../../../global/functions";
import { pcApi } from "../../../api/pcApi";
import { pcColors } from "../../../theme";
import { PcButton } from "../../../components";

function TimeRow({ t }) {
  return (
    <View style={styles.row}>
      {t.weekday ? (
        <View style={styles.badge}><Text style={styles.badgeTxt}>{t.weekday}</Text></View>
      ) : <View style={styles.badge} />}
      <View style={{ flex: 1 }}>
        {!!t.name && <Text style={styles.name}>{t.name}</Text>}
        <Text style={styles.range}>{t.range}</Text>
        <Text style={styles.date}>{t.date}</Text>
      </View>
    </View>
  );
}

export function TimesTab({ planId }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState({ service: [], rehearsal: [], other: [] });
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await pcApi.plans.times(planId)); }
    catch (e) { showError(e?.message || "Eroare la ore."); }
    finally { setLoading(false); }
  }, [planId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ActivityIndicator color={pcColors.primary} style={{ marginTop: 30 }} />;

  const Section = ({ title, rows }) =>
    rows.length ? (
      <>
        <Text style={styles.section}>{title}</Text>
        {rows.map((t) => <TimeRow key={String(t.id)} t={t} />)}
      </>
    ) : null;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
      <Section title="SERVICE TIMES" rows={data.service} />
      <Section title="REHEARSAL TIMES" rows={data.rehearsal} />
      <Section title="OTHER TIMES" rows={data.other} />
      {!data.service.length && !data.rehearsal.length && !data.other.length && (
        <Text style={styles.empty}>Nicio oră setată.</Text>
      )}
      <PcButton title="Add" variant="outline" icon="add" onPress={() => showInfo("Adăugare oră — vine cu „Create a service")} style={{ marginTop: 20, alignSelf: "flex-start", paddingHorizontal: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { color: pcColors.textSecondary, fontWeight: "700", letterSpacing: 0.5, marginTop: 18, marginBottom: 8, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  badge: { width: 46, height: 46, borderRadius: 23, backgroundColor: pcColors.primary, alignItems: "center", justifyContent: "center" },
  badgeTxt: { color: "#0A0A0A", fontWeight: "800", fontSize: 13 },
  name: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  range: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
  date: { color: pcColors.primary, fontSize: 13, marginTop: 2 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 30 },
});

export default TimesTab;
