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

function CountChip({ icon, n, color }) {
  return (
    <View style={[styles.countChip, { borderColor: color }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.countChipTxt, { color }]}>{n}</Text>
    </View>
  );
}

// Avatar cu badge de status suprapus (bifă verde = confirmat, ? portocaliu = în așteptare).
function PersonAvatar({ p }) {
  return (
    <View>
      <PcAvatar uri={p.avatar} initials={p.initials} size={36} />
      {p.status === "confirmed" && <View style={styles.badge}><Ionicons name="checkmark" size={10} color="#0A0A0A" /></View>}
      {p.status === "unconfirmed" && <View style={[styles.badge, { backgroundColor: pcColors.orange }]}><Ionicons name="help" size={9} color="#0A0A0A" /></View>}
    </View>
  );
}

function TeamCard({ team, onMenu, onSend, onAddNeeded, sending }) {
  const empty = !team.groups || team.groups.length === 0;
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
        <Pressable onPress={() => onMenu(team)} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={22} color={pcColors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.countsRow}>
        <CountChip icon="checkmark" n={team.counts.confirmed} color={pcColors.primary} />
        <CountChip icon="close" n={team.counts.declined} color={pcColors.danger} />
        <CountChip icon="help" n={team.counts.unconfirmed} color={pcColors.orange} />
      </View>
      {team.unsentEmails > 0 && (
        <Pressable style={styles.unsentBar} onPress={() => onSend(team)} disabled={sending}>
          <Text style={styles.unsentTxt}>{team.unsentEmails} email-uri netrimise</Text>
          <Text style={styles.sendTxt}>{sending ? "..." : "Trimite"}</Text>
        </Pressable>
      )}
      {empty ? (
        <Text style={styles.cardEmpty}>Nimeni programat încă.{"\n"}Folosește butonul + ca să adaugi.</Text>
      ) : team.groups.map((g, gi) => (
        <View key={gi}>
          {!!g.positionName && <View style={styles.posBar}><Text style={styles.posLabel}>{g.positionName.toUpperCase()}</Text></View>}
          {g.people.map((p, pi) =>
            p.needed ? (
              <Pressable key={pi} style={styles.personRow} onPress={() => onAddNeeded(team.teamId, g.positionId)}>
                <View style={styles.neededBadge}><Ionicons name="add" size={18} color="#0A0A0A" /></View>
                <Text style={styles.neededTxt}>Needed</Text>
              </Pressable>
            ) : (
              <View key={pi} style={styles.personRow}>
                <PersonAvatar p={p} />
                <Text style={styles.personName} numberOfLines={1}>{p.name}</Text>
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
  groupTitle: { color: pcColors.textSecondary, fontWeight: "700", letterSpacing: 0.5, marginBottom: 10, marginTop: 6, fontSize: 12 },
  // Card pe fundal negru, cu header-e de poziție ca strip-uri (ca în PCO).
  card: { backgroundColor: "#141416", borderRadius: 12, marginBottom: 14, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: pcColors.divider, paddingBottom: 4 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 },
  teamName: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "800", flex: 1, marginRight: 10 },
  countsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 6 },
  countChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  countChipTxt: { fontSize: 13, fontWeight: "800" },
  unsentBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(245,166,35,0.12)", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginHorizontal: 12, marginBottom: 6 },
  unsentTxt: { color: pcColors.orange, fontSize: 13, fontWeight: "600" },
  sendTxt: { color: pcColors.primary, fontSize: 14, fontWeight: "700" },
  posBar: { backgroundColor: "#26262A", paddingHorizontal: 14, paddingVertical: 7, marginTop: 2 },
  posLabel: { color: pcColors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  personName: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600", flex: 1 },
  badge: { position: "absolute", right: -2, bottom: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: pcColors.primary, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#141416" },
  neededBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: pcColors.orange, alignItems: "center", justifyContent: "center" },
  neededTxt: { color: pcColors.orange, fontSize: 15, fontWeight: "700", flex: 1 },
  cardEmpty: { color: pcColors.textMuted, fontSize: 14, paddingHorizontal: 14, paddingVertical: 16, lineHeight: 20 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 30 },
  fab: { position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: pcColors.primary, alignItems: "center", justifyContent: "center", elevation: 6 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 15, paddingHorizontal: 12 },
  menuTxt: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
});

export default TeamsTab;
