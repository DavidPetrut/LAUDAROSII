/**
 * My Schedule (membru) — pending (grupate pe plan: Accept All / Accept / Decline / Split) + confirmed
 * (play + times). Buton Add Blockout + Email Leader + icon Calendar. Tap card → planul (Teams).
 */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess, showConfirm, showInfo } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcIconButton, PcAvatar } from "../../components";
import { usePc, usePcNav } from "../../navigation/PcContext";
import { TimesSheet } from "./TimesSheet";

export function MyScheduleScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const { setActiveTab } = usePcNav();
  // Tap pe card → comută bara de jos pe „Plans" ȘI deschide planul (unde ești programat).
  const openPlan = (planId) => { setActiveTab("Plans"); navigation.navigate("PcPlan", { planId }); };
  const [data, setData] = useState({ pending: [], confirmed: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // planId în curs
  const [timesFor, setTimesFor] = useState(null); // grup pt. Times sheet

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await pcApi.schedule.my()); }
    catch (e) { showError(e?.message || "Eroare la program."); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const planRespond = async (planId, action) => {
    setBusy(planId);
    try { await pcApi.schedule.planRespond(planId, action); showSuccess(action === "accept" ? "Confirmat" : "Refuzat"); load(); }
    catch (e) { showError(e?.message || "Nu s-a putut."); }
    finally { setBusy(null); }
  };
  const acceptAll = () => showConfirm("Accept all", "Confirmi toate programările în așteptare?", async () => {
    try { const r = await pcApi.schedule.acceptAll(); showSuccess(`Confirmate: ${r.modified || 0}`); load(); }
    catch (e) { showError(e?.message || "Eroare."); }
  });

  const Card = ({ g, pending }) => (
    <View style={styles.card}>
      <Pressable onPress={() => openPlan(g.planId)}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{g.dateLabel}</Text>
            <Text style={styles.sub}>{g.serviceTypeName}</Text>
          </View>
          {!pending && (
            <PcIconButton icon="play-circle-outline" size={26} color={pcColors.textSecondary} onPress={() => navigation.navigate("PcMediaPlayer", { planId: g.planId })} style={{ marginRight: 8 }} />
          )}
          <PcIconButton icon="time-outline" size={24} color={pcColors.textSecondary} onPress={() => setTimesFor(g)} />
        </View>

        <View style={styles.positions}>
          {g.positions.map((p) => (
            <View key={String(p.assignmentId)} style={styles.posRow}>
              <Ionicons name={p.status === "confirmed" ? "checkmark-circle" : "help-circle"} size={20} color={p.status === "confirmed" ? pcColors.primary : pcColors.orange} />
              <Text style={styles.posText} numberOfLines={1}>
                <Text style={styles.posName}>{p.positionName}</Text>
                {p.teamName ? <Text style={styles.posTeam}>  {p.teamName}</Text> : null}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>

      {pending && (
        <View style={styles.cardActions}>
          <Pressable onPress={() => navigation.navigate("PcPlan", { planId: g.planId })} hitSlop={6}><Text style={styles.split}>SPLIT</Text></Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => planRespond(g.planId, "decline")} disabled={busy === g.planId} hitSlop={6}><Text style={styles.decline}>DECLINE</Text></Pressable>
          {busy === g.planId ? <ActivityIndicator color={pcColors.primary} style={{ marginLeft: 20 }} /> : <Pressable onPress={() => planRespond(g.planId, "accept")} hitSlop={6} style={{ marginLeft: 20 }}><Text style={styles.accept}>ACCEPT</Text></Pressable>}
        </View>
      )}
    </View>
  );

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>My Schedule</Text>
        <View style={styles.headerIcons}>
          <PcIconButton icon="calendar-outline" color={pcColors.textSecondary} onPress={() => navigation.navigate("PcCalendar")} style={{ marginLeft: 16 }} />
          <PcIconButton icon="chatbox-outline" onPress={() => {}} style={{ marginLeft: 16 }} />
          <PcIconButton icon="notifications-outline" dot onPress={() => {}} style={{ marginLeft: 18 }} />
          <Pressable onPress={() => me?.person?.id && navigation.navigate("PcProfile", { personId: me.person.id })} hitSlop={6} style={{ marginLeft: 18 }}>
            <PcAvatar uri={me?.person?.avatar} initials={me?.person?.initials || ""} size={32} />
          </Pressable>
        </View>
      </View>

      <View style={styles.topBtns}>
        <Pressable style={styles.topBtn} onPress={() => navigation.navigate("PcBlockoutEditor")}>
          <Ionicons name="calendar-clear-outline" size={18} color={pcColors.primary} />
          <Text style={styles.topBtnTxt}>Add Blockout</Text>
        </Pressable>
        <Pressable style={styles.topBtn} onPress={() => showInfo("Email My Leader = felie ulterioară (se leagă de liderul echipei + emailService).")}>
          <Ionicons name="mail-outline" size={18} color={pcColors.primary} />
          <Text style={styles.topBtnTxt}>Email Leader</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
          {data.pending.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.section}>PENDING  {data.pending.length}</Text>
                <Pressable style={styles.acceptAllBtn} onPress={acceptAll}><Text style={styles.acceptAllTxt}>ACCEPT ALL</Text></Pressable>
              </View>
              {data.pending.map((g) => <Card key={String(g.planId)} g={g} pending />)}
            </>
          )}
          {data.confirmed.length > 0 && (
            <>
              <Text style={[styles.section, { marginTop: 18 }]}>CONFIRMED  {data.confirmed.length}</Text>
              {data.confirmed.map((g) => <Card key={String(g.planId)} g={g} />)}
            </>
          )}
          {data.pending.length === 0 && data.confirmed.length === 0 && <Text style={styles.empty}>Nicio programare momentan.</Text>}
        </ScrollView>
      )}

      <TimesSheet visible={!!timesFor} onClose={() => setTimesFor(null)} times={timesFor?.times || []} />
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 24, fontWeight: "700" },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  topBtns: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pcColors.bgHeader },
  topBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: pcColors.card, borderRadius: 10, paddingVertical: 14 },
  topBtnTxt: { color: pcColors.primary, fontSize: 14, fontWeight: "700" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  section: { color: pcColors.textSecondary, fontWeight: "800", letterSpacing: 0.5, fontSize: 13 },
  acceptAllBtn: { backgroundColor: pcColors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  acceptAllTxt: { color: "#0A0A0A", fontWeight: "800", fontSize: 13 },
  card: { backgroundColor: pcColors.card, borderRadius: 12, padding: 14, marginBottom: 14 },
  cardHead: { flexDirection: "row", alignItems: "center" },
  date: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700" },
  sub: { color: pcColors.textSecondary, fontSize: 14, marginTop: 1 },
  positions: { marginTop: 10, gap: 8 },
  posRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  posText: { flex: 1 },
  posName: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "700" },
  posTeam: { color: pcColors.textSecondary, fontSize: 14 },
  cardActions: { flexDirection: "row", alignItems: "center", marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pcColors.divider },
  split: { color: pcColors.textMuted, fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  decline: { color: pcColors.textMuted, fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  accept: { color: pcColors.primary, fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 50 },
});

export default MyScheduleScreen;
