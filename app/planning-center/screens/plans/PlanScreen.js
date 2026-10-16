/**
 * Plan page (§9 plan) — header + titlu + prev/next + 3-dot + chip-uri asignări + tab-uri
 * ORDER/TEAMS/TIMES/NOTES/FILES. Identic cu screenshot-urile (mobil dark+verde).
 */
import React, { useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showInfo } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcAvatar, PcIconButton, PcUnderlineTabs, PcBottomSheet, PcButton } from "../../components";
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
  { key: "duplicate", label: "Repetă pe săptămâni (template)", icon: "copy-outline" },
  { key: "rename", label: "Rename plan", icon: "create-outline" },
  { key: "print", label: "Print report", icon: "print-outline" },
  { key: "live", label: "Services LIVE", icon: "radio-outline" },
  { key: "stand", label: "Open in Music Stand", icon: "musical-notes-outline" },
  { key: "copy", label: "Copy plan link", icon: "link-outline" },
];

const WEEK_OPTIONS = [2, 4, 8, 12, 26, 52];

export function PlanScreen({ route, navigation }) {
  const { planId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const [head, setHead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ORDER");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupWeeks, setDupWeeks] = useState(4);
  const [dupTeams, setDupTeams] = useState(true);
  const [dupBusy, setDupBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setHead(await pcApi.plans.get(planId)); }
    catch (e) { showError(e?.message || "Eroare la plan."); }
    finally { setLoading(false); }
  }, [planId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goPlan = (id) => id && navigation.replace("PcPlan", { planId: id });
  const [respondingId, setRespondingId] = useState(null); // assignmentId în curs

  // Accept/Decline PE FIECARE poziție (assignment). Lovește aceeași rută per-assignment ca din
  // Schedule → statusul se sincronizează cu My Schedule.
  const respondAssignment = useCallback(async (assignmentId, action) => {
    if (!assignmentId || respondingId) return;
    setRespondingId(assignmentId);
    try {
      await pcApi.schedule.respond(assignmentId, action);
      await load();
      showInfo(action === "accept" ? "Ai confirmat poziția." : "Ai refuzat poziția.");
    } catch (e) { showError(e?.message || "Eroare la răspuns."); }
    finally { setRespondingId(null); }
  }, [respondingId, load]);

  // Confirmare înainte de accept/decline — dialog NATIV (întunecat pe Android), nu modalul alb.
  const confirmRespond = useCallback((a, action) => {
    Alert.alert(
      action === "accept" ? "Accept" : "Decline",
      action === "accept" ? "Ești sigur că accepți această poziție?" : "Ești sigur că refuzi această poziție?",
      [
        { text: "Anulează", style: "cancel" },
        { text: "Da", onPress: () => respondAssignment(a.assignmentId, action) },
      ],
    );
  }, [respondAssignment]);

  const doDuplicate = useCallback(async () => {
    if (dupBusy) return;
    setDupBusy(true);
    try {
      const r = await pcApi.plans.duplicate(planId, { weeks: dupWeeks, includeTeams: dupTeams });
      setDupOpen(false);
      showInfo(`Am creat ${r?.created || dupWeeks} planuri (câte unul pe săptămână).`);
    } catch (e) { showError(e?.message || "Eroare la duplicare."); }
    finally { setDupBusy(false); }
  }, [dupBusy, planId, dupWeeks, dupTeams]);

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
      {head.myAssignments?.map((a, i) => {
        const pending = !a.confirmed && !a.declined;
        const busyRow = respondingId && respondingId === a.assignmentId;
        const iconBg = a.confirmed ? pcColors.primary : a.declined ? pcColors.danger : pcColors.orange;
        const iconName = a.confirmed ? "checkmark" : a.declined ? "close" : "help";
        return (
          <View key={a.assignmentId || i} style={styles.assignCard}>
            <View style={styles.assignTop}>
              <View style={[styles.assignIcon, { backgroundColor: iconBg }]}>
                <Ionicons name={iconName} size={18} color="#fff" />
              </View>
              <Text style={styles.assignName} numberOfLines={1}>
                {a.label}{a.team ? <Text style={styles.assignTeam}>  ({a.team})</Text> : null}
              </Text>
            </View>
            {pending && (
              <View style={styles.assignActions}>
                {busyRow ? (
                  <ActivityIndicator color={pcColors.primary} />
                ) : (
                  <>
                    <Pressable onPress={() => confirmRespond(a, "decline")} hitSlop={8}>
                      <Text style={styles.declineTxt}>DECLINE</Text>
                    </Pressable>
                    <Pressable onPress={() => confirmRespond(a, "accept")} hitSlop={8} style={{ marginLeft: 28 }}>
                      <Text style={styles.acceptTxt}>ACCEPT</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  ) : null;

  const tabsBarNode = <PcUnderlineTabs tabs={TABS} value={tab} onChange={setTab} scrollable />;

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
      ) : tab === "ORDER" ? (
        // ORDER: scroll unic — titlul se ridică, bara de tab-uri devine sticky sub header (ca în PCO).
        <OrderTab planId={planId} navigation={navigation} head={planHeadNode} tabsBar={tabsBarNode} />
      ) : (
        // Celelalte tab-uri (conținut scurt): titlu + tab-uri fixe deasupra conținutului.
        <>
          {planHeadNode}
          {tabsBarNode}
          <View style={{ flex: 1 }}>
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
            <Pressable
              key={m.key}
              style={styles.menuRow}
              onPress={() => { setMenuOpen(false); if (m.key === "duplicate") setDupOpen(true); else showInfo(`${m.label} — în curând`); }}
            >
              <Ionicons name={m.icon} size={22} color={pcColors.textPrimary} />
              <Text style={styles.menuTxt}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      </PcBottomSheet>

      {/* Template: repetă planul pe N săptămâni (order + opțional echipe) */}
      <PcBottomSheet visible={dupOpen} onClose={() => setDupOpen(false)} maxHeightPct={0.6}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={styles.dupTitle}>Repetă acest plan</Text>
          <Text style={styles.dupSub}>Creez câte un plan identic (order{dupTeams ? " + echipe" : ""}) în fiecare săptămână, pornind de la săptămâna următoare.</Text>
          <Text style={styles.dupLabel}>Câte săptămâni?</Text>
          <View style={styles.weekRow}>
            {WEEK_OPTIONS.map((w) => (
              <Pressable key={w} style={[styles.weekChip, dupWeeks === w && styles.weekChipOn]} onPress={() => setDupWeeks(w)}>
                <Text style={[styles.weekTxt, dupWeeks === w && styles.weekTxtOn]}>{w}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.teamsRow} onPress={() => setDupTeams((v) => !v)}>
            <Ionicons name={dupTeams ? "checkbox" : "square-outline"} size={24} color={dupTeams ? pcColors.primary : pcColors.textMuted} />
            <Text style={styles.teamsTxt}>Copiază și echipele (ca cerere nouă, de confirmat)</Text>
          </Pressable>
          <PcButton title={dupBusy ? "Se creează…" : `Creează ${dupWeeks} planuri`} onPress={doDuplicate} disabled={dupBusy} style={{ marginTop: 16 }} />
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
  assignCard: { backgroundColor: "#202024", borderRadius: 6, paddingVertical: 12, paddingHorizontal: 12, marginTop: 10 },
  assignTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  assignIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  assignName: { flex: 1, color: pcColors.textPrimary, fontSize: 16, fontWeight: "800" },
  assignTeam: { color: pcColors.textMuted, fontSize: 15, fontWeight: "500" },
  assignActions: { flexDirection: "row", alignItems: "center", marginTop: 10, paddingLeft: 44 },
  declineTxt: { color: pcColors.textMuted, fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  acceptTxt: { color: pcColors.primary, fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 15, paddingHorizontal: 12 },
  menuTxt: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
  dupTitle: { color: pcColors.textPrimary, fontSize: 19, fontWeight: "800", marginBottom: 6 },
  dupSub: { color: pcColors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  dupLabel: { color: pcColors.textSecondary, fontSize: 13, fontWeight: "700", letterSpacing: 0.5, marginBottom: 10 },
  weekRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  weekChip: { minWidth: 52, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, alignItems: "center" },
  weekChipOn: { backgroundColor: pcColors.tabActivePill, borderColor: pcColors.primary },
  weekTxt: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  weekTxtOn: { color: pcColors.primary },
  teamsRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, marginTop: 6 },
  teamsTxt: { color: pcColors.textPrimary, fontSize: 15, flex: 1 },
});

export default PlanScreen;
