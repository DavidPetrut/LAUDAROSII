/** Times (din poză): Service Times + Rehearsal Times pt. un plan la care ești programat. */
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { pcColors } from "../../theme";
import { PcBottomSheet } from "../../components";

const weekdayBadge = (dateLabel) => (dateLabel || "").split(",")[0]?.toUpperCase().slice(0, 3) || "•";

export function TimesSheet({ visible, onClose, times = [] }) {
  const service = times.filter((t) => t.type === "service");
  const rehearsal = times.filter((t) => t.type !== "service");
  return (
    <PcBottomSheet visible={visible} onClose={onClose} maxHeightPct={0.7}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <Text style={styles.title}>Times</Text>
        <ScrollView style={{ maxHeight: 440 }}>
          {service.length > 0 && <Text style={styles.group}>SERVICE TIMES</Text>}
          {service.map((t, i) => <TimeCard key={`s${i}`} t={t} color={pcColors.primary} />)}
          {rehearsal.length > 0 && <Text style={[styles.group, { marginTop: 18 }]}>REHEARSAL TIMES</Text>}
          {rehearsal.map((t, i) => <TimeCard key={`r${i}`} t={t} color="#4F9CF9" />)}
          {times.length === 0 && <Text style={styles.empty}>Nicio oră.</Text>}
        </ScrollView>
      </View>
    </PcBottomSheet>
  );
}

function TimeCard({ t, color }) {
  return (
    <View style={styles.card}>
      <View style={[styles.badge, { backgroundColor: color }]}><Text style={styles.badgeTxt}>{weekdayBadge(t.dateLabel)}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.range}>{t.range || "—"}</Text>
        <Text style={styles.meta}><Text style={{ color }}>{t.dateLabel}</Text>  {t.name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  group: { color: pcColors.textSecondary, fontSize: 13, fontWeight: "800", letterSpacing: 0.5, marginBottom: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: pcColors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  badge: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  badgeTxt: { color: "#0A0A0A", fontWeight: "800", fontSize: 13 },
  range: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "800" },
  meta: { color: pcColors.textSecondary, fontSize: 13, marginTop: 2 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginVertical: 20 },
});

export default TimesSheet;
