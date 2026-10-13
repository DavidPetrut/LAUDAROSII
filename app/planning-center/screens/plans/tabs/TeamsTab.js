/** TEAMS tab — echipe My/Other + status + Needed + Add People + Send emails (scheduling). */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { showError, showSuccess, showInfo } from "../../../../global/functions";
import { pcApi } from "../../../api/pcApi";
import { pcColors } from "../../../theme";
import { PcButton, PcAvatar, PcBottomSheet } from "../../../components";
import { usePc } from "../../../navigation/PcContext";
import { AddPeopleSheet, SchedulePersonSheet } from "../SchedulePersonSheet";

const ACTIONS = [
  { key: "add", label: "Add People", icon: "person-add-outline" },
  { key: "import", label: "Import Template", icon: "duplicate-outline" },
  { key: "needed", label: "Needed Positions", icon: "help-circle-outline" },
  { key: "email", label: "Email or Text", icon: "mail-outline" },
  { key: "chat", label: "Chat", icon: "chatbubble-outline" },
  { key: "attendance", label: "Take Attendance", icon: "checkbox-outline" },
];

function StatusDot({ status }) {
  if (status === "confirmed") return <Ionicons name="checkmark" size={18} color={pcColors.primary} />;
  if (status === "declined") return <Ionicons name="close" size={18} color={pcColors.danger} />;
  return <Ionicons name="help" size={16} color={pcColors.orange} />;
}

function TeamCard({ team, onMenu, onSend, onAddNeeded, sending }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.teamName}>{team.name}</Text>
        <View style={styles.counts}>
          <Text style={[styles.count, { color: pcColors.primary }]}>✓{team.counts.confirmed}</Text>
          <Text style={[styles.count, { color: pcColors.danger }]}>✗{team.counts.declined}</Text>
          <Text style={[styles.count, { color: pcColors.orange }]}>?{team.counts.unconfirmed}</Text>
          <Pressable onPress={() => onMenu(team)} hitSlop={8}>
            <Ionicons name="chevron-down-circle-outline" size={22} color={pcColors.textMuted} />
          </Pressable>
        </View>
      </View>
      {team.unsentEmails > 0 && (
        <View style={styles.unsentBar}>
          <Text style={styles.unsentTxt}>{team.unsentEmails} email-uri netrimise</Text>
          <Pressable onPress={() => onSend(team)} disabled={sending} hitSlop={8}>
            <Text style={styles.sendTxt}>{sending ? "..." : "Trimite"}</Text>
          </Pressable>
        </View>
      )}
      {team.groups.map((g, gi) => (
        <View key={gi}>
          {!!g.positionName && <Text style={styles.posLabel}>{g.positionName.toUpperCase()}</Text>}
          {g.people.map((p, pi) =>
            p.needed ? (
              <Pressable key={pi} style={styles.personRow} onPress={() => onAddNeeded(team.teamId, g.positionId)}>
                <View style={styles.neededBadge}><Text style={styles.neededNum}>1</Text></View>
                <Text style={styles.neededTxt}>Needed</Text>
                <Ionicons name="add" size={18} color={pcColors.primary} />
              </Pressable>
            ) : (
              <View key={pi} style={styles.personRow}>
                <PcAvatar uri={p.avatar} initials={p.initials} size={30} />
                <Text style={styles.personName}>{p.name}</Text>
                <StatusDot status={p.status} />
              </View>
            )
          )}
        </View>
      ))}
    </View>
  );
}

export function TeamsTab({ planId }) {
  const { me } = usePc();
  const canSchedule = !!me?.capabilities?.schedule;
  const [data, setData] = useState({ myTeams: [], otherTeams: [] });
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(null); // { team }
  const [sending, setSending] = useState(false);

  const [schedulable, setSchedulable] = useState(null);
  const [addSheet, setAddSheet] = useState(null); // { scopeTeamId, scopePositionId }
  const [scheduleSheet, setScheduleSheet] = useState(null); // { person, scopeTeamId, scopePositionId }

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await pcApi.plans.teams(planId)); }
    catch (e) { showError(e?.message || "Eroare la echipe."); }
    finally { setLoading(false); }
  }, [planId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ensureSchedulable = async () => {
    if (schedulable) return schedulable;
    const s = await pcApi.plans.schedulable(planId);
    setSchedulable(s);
    return s;
  };

  const openAdd = async (scopeTeamId, scopePositionId) => {
    setMenu(null);
    try { await ensureSchedulable(); setAddSheet({ scopeTeamId, scopePositionId }); }
    catch (e) { showError("Nu s-a putut încărca lista."); }
  };

  const onPicked = (person) => {
    const scope = addSheet || {};
    setAddSheet(null);
    setScheduleSheet({ person, scopeTeamId: scope.scopeTeamId, scopePositionId: scope.scopePositionId });
  };

  const onSaved = async () => { setSchedulable(null); await load(); };

  const sendEmails = async (team) => {
    setSending(true);
    try {
      const res = await pcApi.plans.sendScheduleEmails(planId, team?.teamId);
      showSuccess(res.sent > 0 ? `${res.sent} email-uri trimise` : "Niciun email de trimis (verifică SMTP)");
      load();
    } catch (e) { showError(e?.message || "Nu s-au putut trimite."); }
    finally { setSending(false); }
  };

  if (loading) return <ActivityIndicator color={pcColors.primary} style={{ marginTop: 30 }} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topActions}>
        <PcButton title="Email or Text" variant="outline" icon="mail-outline" onPress={() => canSchedule ? sendEmails(null) : showInfo("Doar schedulerii")} style={styles.topBtn} textStyle={{ fontSize: 14 }} />
        <PcButton title="Chat" variant="outline" icon="chatbubble-outline" onPress={() => showInfo("Chat — în curând")} style={styles.topBtn} textStyle={{ fontSize: 14 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
        {data.myTeams.length > 0 && <Text style={styles.groupTitle}>MY TEAMS</Text>}
        {data.myTeams.map((t) => <TeamCard key={String(t.teamId)} team={t} onMenu={(tm) => setMenu({ team: tm })} onSend={sendEmails} onAddNeeded={(tid, pid) => canSchedule ? openAdd(tid, pid) : showInfo("Doar schedulerii")} sending={sending} />)}
        {data.otherTeams.length > 0 && <Text style={styles.groupTitle}>OTHER TEAMS</Text>}
        {data.otherTeams.map((t) => <TeamCard key={String(t.teamId)} team={t} onMenu={(tm) => setMenu({ team: tm })} onSend={sendEmails} onAddNeeded={(tid, pid) => canSchedule ? openAdd(tid, pid) : showInfo("Doar schedulerii")} sending={sending} />)}
        {data.myTeams.length === 0 && data.otherTeams.length === 0 && <Text style={styles.empty}>Nicio echipă pe acest plan.</Text>}
      </ScrollView>

      {canSchedule && (
        <Pressable style={styles.fab} onPress={() => openAdd(null, null)}>
          <Ionicons name="add" size={30} color="#0A0A0A" />
        </Pressable>
      )}

      {/* Team action menu */}
      <PcBottomSheet visible={!!menu} onClose={() => setMenu(null)} maxHeightPct={0.6}>
        <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
          {ACTIONS.map((a) => (
            <Pressable key={a.key} style={styles.menuRow} onPress={() => {
              const team = menu?.team;
              setMenu(null);
              if (a.key === "add") openAdd(team?.teamId, null);
              else if (a.key === "email") sendEmails(team);
              else showInfo("Acțiune — în curând");
            }}>
              <Ionicons name={a.icon} size={22} color={pcColors.textPrimary} />
              <Text style={styles.menuTxt}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </PcBottomSheet>

      <AddPeopleSheet visible={!!addSheet} onClose={() => setAddSheet(null)} planId={planId} onPicked={onPicked} />
      <SchedulePersonSheet
        visible={!!scheduleSheet}
        onClose={() => setScheduleSheet(null)}
        planId={planId}
        person={scheduleSheet?.person}
        schedulable={schedulable}
        scopeTeamId={scheduleSheet?.scopeTeamId}
        scopePositionId={scheduleSheet?.scopePositionId}
        onSaved={onSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topActions: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  topBtn: { flex: 1, paddingVertical: 10 },
  groupTitle: { color: pcColors.textSecondary, fontWeight: "700", letterSpacing: 0.5, marginBottom: 10, marginTop: 6 },
  card: { backgroundColor: pcColors.card, borderRadius: 12, padding: 14, marginBottom: 14 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  teamName: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700" },
  counts: { flexDirection: "row", alignItems: "center", gap: 10 },
  count: { fontSize: 13, fontWeight: "700" },
  unsentBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(245,166,35,0.12)", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 8 },
  unsentTxt: { color: pcColors.orange, fontSize: 13, fontWeight: "600" },
  sendTxt: { color: pcColors.primary, fontSize: 14, fontWeight: "700" },
  posLabel: { color: pcColors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  personName: { color: pcColors.textPrimary, fontSize: 15, flex: 1 },
  neededBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: pcColors.orange, alignItems: "center", justifyContent: "center" },
  neededNum: { color: "#0A0A0A", fontWeight: "800" },
  neededTxt: { color: pcColors.orange, fontSize: 15, fontWeight: "600", flex: 1 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 30 },
  fab: { position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: pcColors.primary, alignItems: "center", justifyContent: "center", elevation: 6 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 15, paddingHorizontal: 12 },
  menuTxt: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
});

export default TeamsTab;
