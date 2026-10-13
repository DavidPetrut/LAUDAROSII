/**
 * Plan page (§9 plan) — header + titlu + prev/next + 3-dot + chip-uri asignări + tab-uri
 * ORDER/TEAMS/TIMES/NOTES/FILES. Identic cu screenshot-urile (mobil dark+verde).
 */
import React, { useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showInfo } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcAvatar, PcIconButton, PcUnderlineTabs, PcBottomSheet } from "../../components";
import { usePc } from "../../navigation/PcContext";
import { OrderTab } from "./tabs/OrderTab";
import { TeamsTab } from "./tabs/TeamsTab";
import { TimesTab } from "./tabs/TimesTab";
import { NotesTab } from "./tabs/NotesTab";
import { FilesTab } from "./tabs/FilesTab";
import { RehearseTab } from "../rehearse/RehearseTab";

const TABS = [
  { key: "ORDER", label: "ORDER" },
  { key: "TEAMS", label: "TEAMS" },
  { key: "REHEARSE", label: "REHEARSE" },
  { key: "TIMES", label: "TIMES" },
  { key: "NOTES", label: "NOTES" },
  { key: "FILES", label: "FILES" },
];

const MENU = [
  { key: "rename", label: "Rename plan", icon: "create-outline" },
  { key: "print", label: "Print report", icon: "print-outline" },
  { key: "live", label: "Services LIVE", icon: "radio-outline" },
  { key: "stand", label: "Open in Music Stand", icon: "musical-notes-outline" },
  { key: "copy", label: "Copy plan link", icon: "link-outline" },
];

export function PlanScreen({ route, navigation }) {
  const { planId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const [head, setHead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ORDER");
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setHead(await pcApi.plans.get(planId)); }
    catch (e) { showError(e?.message || "Eroare la plan."); }
    finally { setLoading(false); }
  }, [planId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goPlan = (id) => id && navigation.replace("PcPlan", { planId: id });

  // Blocul titlu + prev/next + dată + chip-uri asignare. Pe ORDER îl dăm ca `head` scrollabil
  // (se ridică la scroll); pe celelalte tab-uri îl afișăm fix deasupra conținutului.
  const planHeadNode = head ? (
    <View style={styles.planHead}>
      <Text style={styles.planTitle}>{head.title}</Text>
      <View style={styles.navRow}>
        <Pressable style={styles.circleBtn} onPress={() => goPlan(head.prevId)} disabled={!head.prevId}>
          <Ionicons name="chevron-back" size={20} color={head.prevId ? pcColors.primary : pcColors.textMuted} />
        </Pressable>
        <Pressable style={styles.circleBtn} onPress={() => goPlan(head.nextId)} disabled={!head.nextId}>
          <Ionicons name="chevron-forward" size={20} color={head.nextId ? pcColors.primary : pcColors.textMuted} />
        </Pressable>
        <Text style={styles.date}>{head.dateLabel}</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={10}>
          <Ionicons name="ellipsis-vertical" size={22} color={pcColors.primary} />
        </Pressable>
      </View>
      {head.myAssignments?.map((a, i) => (
        <View key={i} style={styles.assignChip}>
          <Ionicons
            name={a.confirmed ? "checkmark-circle" : a.declined ? "close-circle" : "help-circle"}
            size={26}
            color={a.confirmed ? pcColors.primary : a.declined ? pcColors.danger : pcColors.orange}
          />
          <Text style={styles.assignTxt}>
            {a.label}{a.team ? <Text style={styles.assignTeam}>  ({a.team})</Text> : null}
          </Text>
        </View>
      ))}
    </View>
  ) : null;

  return (
    <PcScreen>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={pcColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Plan</Text>
        <View style={styles.headerIcons}>
          <PcIconButton icon="chatbox-outline" onPress={() => {}} style={{ marginLeft: 14 }} />
          <PcIconButton icon="notifications-outline" dot onPress={() => {}} style={{ marginLeft: 14 }} />
          <Pressable
            onPress={() => me?.person?.id && navigation.navigate("PcProfile", { personId: me.person.id })}
            hitSlop={8}
            style={{ marginLeft: 14 }}
          >
            <PcAvatar uri={me?.person?.avatar} initials={me?.person?.initials || ""} size={32} />
          </Pressable>
        </View>
      </View>

      {loading || !head ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Tab-urile rămân FIXE sub header-ul „Plan". Titlul + data se scrollează (vezi head). */}
          <PcUnderlineTabs tabs={TABS} value={tab} onChange={setTab} scrollable />

          <View style={{ flex: 1 }}>
            {tab === "ORDER" && <OrderTab planId={planId} navigation={navigation} head={planHeadNode} />}
            {tab !== "ORDER" && planHeadNode}
            {tab === "TEAMS" && <TeamsTab planId={planId} />}
            {tab === "REHEARSE" && <RehearseTab planId={planId} navigation={navigation} />}
            {tab === "TIMES" && <TimesTab planId={planId} />}
            {tab === "NOTES" && <NotesTab planId={planId} />}
            {tab === "FILES" && <FilesTab planId={planId} />}
          </View>
        </>
      )}

      {/* 3-dot menu */}
      <PcBottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} maxHeightPct={0.5}>
        <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
          {MENU.map((m) => (
            <Pressable key={m.key} style={styles.menuRow} onPress={() => { setMenuOpen(false); showInfo(`${m.label} — în curând`); }}>
              <Ionicons name={m.icon} size={22} color={pcColors.textPrimary} />
              <Text style={styles.menuTxt}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      </PcBottomSheet>
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", flex: 1, marginLeft: 12 },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  planHead: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  planTitle: { color: pcColors.textPrimary, fontSize: 26, fontWeight: "800" },
  navRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1E1E20", alignItems: "center", justifyContent: "center" },
  date: { color: pcColors.textSecondary, fontSize: 18, marginLeft: 4 },
  assignChip: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1C2714", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 10, marginTop: 10 },
  assignTxt: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "700" },
  assignTeam: { color: pcColors.textMuted, fontWeight: "500" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 15, paddingHorizontal: 12 },
  menuTxt: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
});

export default PlanScreen;
