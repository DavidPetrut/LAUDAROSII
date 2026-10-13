/** My Schedule → Calendar (personal). Mini calendar lunar cu puncte (verde=programat, roșu=blockout)
 *  + Add blockouts + Subscribe (webcal = seam) + listă pe zile. „Same look ca pe browser". */
import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showInfo, showConfirm } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcIconButton } from "../../components";

const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export function CalendarScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [data, setData] = useState({ scheduled: [], blockoutDays: [], blockouts: [] });
  const [loading, setLoading] = useState(true);
  const [selDay, setSelDay] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await pcApi.schedule.calendar(year, month)); }
    catch (e) { showError(e?.message || "Eroare la calendar."); }
    finally { setLoading(false); }
  }, [year, month]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const scheduledDays = useMemo(() => new Set((data.scheduled || []).map((s) => s.date)), [data]);
  const blockoutDays = useMemo(() => new Set(data.blockoutDays || []), [data]);

  const prevMonth = () => { setSelDay(null); if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { setSelDay(null); if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  const firstWd = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const dayStr = (d) => `${year}-${pad(month)}-${pad(d)}`;
  const listItems = (selDay ? (data.scheduled || []).filter((s) => s.date === selDay) : (data.scheduled || []));

  const delBlockout = (b) => showConfirm("Șterge blockout?", b.label, async () => {
    try { await pcApi.schedule.deleteBlockout(b.id); load(); } catch (e) { showError(e?.message || "Eroare."); }
  });

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <PcIconButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>My Schedule</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
          {/* Month header */}
          <View style={styles.monthHead}>
            <Text style={styles.monthTitle}>{MONTHS[month - 1]} {year}</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <PcIconButton icon="chevron-back" size={20} color={pcColors.textSecondary} onPress={prevMonth} />
              <PcIconButton icon="ellipse" size={8} color={pcColors.textMuted} onPress={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }} style={{ marginHorizontal: 4 }} />
              <PcIconButton icon="chevron-forward" size={20} color={pcColors.textSecondary} onPress={nextMonth} />
            </View>
          </View>

          {/* Weekday row */}
          <View style={styles.wdRow}>{WD.map((w) => <Text key={w} style={styles.wd}>{w}</Text>)}</View>

          {/* Grid */}
          <View style={styles.grid}>
            {cells.map((d, i) => {
              if (d === null) return <View key={i} style={styles.cell} />;
              const ds = dayStr(d);
              const isToday = ds === todayStr();
              const sched = scheduledDays.has(ds);
              const block = blockoutDays.has(ds);
              const sel = ds === selDay;
              return (
                <Pressable key={i} style={styles.cell} onPress={() => setSelDay(sel ? null : ds)}>
                  <View style={[styles.dayCircle, isToday && styles.today, sel && styles.selected]}>
                    <Text style={[styles.dayTxt, isToday && { fontWeight: "800" }]}>{d}</Text>
                  </View>
                  <View style={styles.dots}>
                    {sched && <View style={[styles.dot, { backgroundColor: pcColors.primary }]} />}
                    {block && <View style={[styles.dot, { backgroundColor: pcColors.danger }]} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.actBtn} onPress={() => navigation.navigate("PcBlockoutEditor", { startDate: selDay })}>
              <Ionicons name="add" size={18} color={pcColors.primary} /><Text style={styles.actTxt}>Add blockouts</Text>
            </Pressable>
            <Pressable style={styles.actBtn} onPress={() => showInfo("Subscribe (webcal/Google Calendar) = felie ulterioară (feed iCal).")}>
              <Ionicons name="share-outline" size={18} color={pcColors.textSecondary} /><Text style={[styles.actTxt, { color: pcColors.textSecondary }]}>Subscribe</Text>
            </Pressable>
          </View>

          {/* Blockouts list */}
          {(data.blockouts || []).length > 0 && (
            <>
              <Text style={styles.section}>BLOCKOUTS</Text>
              {data.blockouts.map((b) => (
                <View key={String(b.id)} style={styles.blockRow}>
                  <Ionicons name="calendar-clear" size={18} color={pcColors.danger} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.blockLabel}>{b.label}{b.repeat !== "none" ? ` · ${b.repeat}` : ""}</Text>
                    {!!b.reason && <Text style={styles.blockReason}>{b.reason}</Text>}
                  </View>
                  <PcIconButton icon="trash-outline" size={18} color={pcColors.textMuted} onPress={() => delBlockout(b)} />
                </View>
              ))}
            </>
          )}

          {/* Scheduled list */}
          <Text style={styles.section}>{selDay ? selDay : "PROGRAMAT LUNA ACEASTA"}</Text>
          {listItems.length === 0 ? <Text style={styles.empty}>Nimic{selDay ? " în această zi" : ""}.</Text> : listItems.map((s) => (
            <Pressable key={s.date + String(s.planId)} style={styles.schRow} onPress={() => navigation.navigate("PcPlan", { planId: s.planId })}>
              <Ionicons name={s.status === "confirmed" ? "checkmark-circle" : "help-circle"} size={20} color={s.status === "confirmed" ? pcColors.primary : pcColors.orange} />
              <View style={{ flex: 1 }}>
                <Text style={styles.schDate}>{s.date}</Text>
                <Text style={styles.schName}>{s.serviceTypeName}</Text>
                <Text style={styles.schPos}>{(s.positions || []).map((p) => p.positionName).join(", ")}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  monthHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  monthTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700" },
  wdRow: { flexDirection: "row" },
  wd: { flex: 1, textAlign: "center", color: pcColors.textMuted, fontSize: 11, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "flex-start", paddingTop: 4 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  today: { backgroundColor: pcColors.input },
  selected: { borderWidth: 1.5, borderColor: pcColors.primary },
  dayTxt: { color: pcColors.textPrimary, fontSize: 14 },
  dots: { flexDirection: "row", gap: 3, marginTop: 2, height: 6 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  actBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 10, paddingVertical: 12 },
  actTxt: { color: pcColors.primary, fontSize: 14, fontWeight: "700" },
  section: { color: pcColors.textSecondary, fontWeight: "800", letterSpacing: 0.5, fontSize: 13, marginTop: 24, marginBottom: 10 },
  blockRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: pcColors.card, borderRadius: 10, padding: 12, marginBottom: 8 },
  blockLabel: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "600" },
  blockReason: { color: pcColors.textSecondary, fontSize: 13, marginTop: 2 },
  schRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: pcColors.card, borderRadius: 10, padding: 12, marginBottom: 8 },
  schDate: { color: pcColors.textMuted, fontSize: 12, fontWeight: "700" },
  schName: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "700", marginTop: 1 },
  schPos: { color: pcColors.textSecondary, fontSize: 13, marginTop: 2 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginVertical: 10 },
});

export default CalendarScreen;
