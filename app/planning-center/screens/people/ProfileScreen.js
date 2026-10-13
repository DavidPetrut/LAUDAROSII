/** Profil persoană (§9 [PROFILE]) — folosește primitivele globale (PcUnderlineTabs/PcButton/PcSegmented). */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcAvatar, PcUnderlineTabs, PcButton, PcSegmented, PcDivider } from "../../components";

const TABS = [
  { key: "SCHEDULE", label: "SCHEDULE", icon: "calendar-check", lib: "mci" },
  { key: "BLOCKOUTS", label: "BLOCKOUTS", icon: "close-circle", lib: "ion" },
  { key: "MESSAGES", label: "MESSAGES", icon: "mail", lib: "ion" },
];

export function ProfileScreen({ route, navigation }) {
  const { personId } = route.params || {};
  const insets = useSafeAreaInsets();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("SCHEDULE");
  const [schedule, setSchedule] = useState([]);
  const [blockouts, setBlockouts] = useState([]);
  const [messages, setMessages] = useState({ unread: [], received: [], sent: [] });
  const [msgTab, setMsgTab] = useState("UNREAD");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, b, m] = await Promise.all([
        pcApi.people.get(personId),
        pcApi.people.schedule(personId),
        pcApi.people.blockouts(personId),
        pcApi.people.messages(personId),
      ]);
      setPerson(p);
      setSchedule(s.schedule || []);
      setBlockouts(b.blockouts || []);
      setMessages(m || { unread: [], received: [], sent: [] });
    } catch (e) {
      showError(e?.message || "Nu s-a putut încărca profilul.");
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markAllRead = async () => {
    try { await pcApi.people.markMessagesRead(personId); load(); } catch (e) { /* silent */ }
  };

  const primaryEmail = person?.emails?.find((e) => e.primary)?.address || person?.emails?.[0]?.address;
  const primaryPhone = person?.phones?.find((p) => p.primary)?.number || person?.phones?.[0]?.number;

  return (
    <PcScreen>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={26} color={pcColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => navigation.navigate("PcEditContact", { personId })} hitSlop={10}>
            <Ionicons name="pencil" size={22} color={pcColors.primary} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => {}}>
            <Ionicons name="ellipsis-vertical" size={22} color={pcColors.primary} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.identity}>
            <PcAvatar uri={person?.avatar} initials={person?.initials} size={96} />
            <Text style={styles.name}>{person?.fullName}</Text>
            {!!primaryEmail && <Text style={styles.contact}>{primaryEmail}</Text>}
            {!!primaryPhone && <Text style={styles.contact}>{primaryPhone}</Text>}
            <View style={styles.actionBtns}>
              <PcButton
                variant="outline"
                icon="people"
                title={`TEAMS  ${person?.teamsCount ?? 0}`}
                onPress={() => navigation.navigate("PcMyTeams", { personId })}
                style={{ flex: 1 }}
              />
              <PcButton
                variant="outline"
                icon="pricetag"
                title={`TAGS  ${person?.tagsCount ?? 0}`}
                onPress={() => navigation.navigate("PcPersonTags", { personId, personName: person?.fullName })}
                style={{ flex: 1 }}
              />
            </View>
          </View>

          <PcUnderlineTabs tabs={TABS} value={tab} onChange={setTab} style={{ backgroundColor: "#141416" }} />

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
            {tab === "SCHEDULE" &&
              (schedule.length === 0 ? (
                <Text style={styles.emptyMid}>Nicio programare viitoare.</Text>
              ) : (
                schedule.map((it, i) => (
                  <Pressable key={i} style={styles.schedRow} onPress={() => it.planId && navigation.navigate("PcPlan", { planId: it.planId })}>
                    <Ionicons
                      name={it.status === "confirmed" ? "checkmark-circle-outline" : "help-circle-outline"}
                      size={26}
                      color={it.status === "confirmed" ? pcColors.primary : pcColors.orange}
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.schedDate}>{it.dateLabel}</Text>
                      <Text style={styles.schedSub}>{it.serviceTypeName}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={pcColors.textMuted} />
                  </Pressable>
                ))
              ))}

            {tab === "BLOCKOUTS" &&
              (blockouts.length === 0 ? (
                <View style={styles.blockoutEmpty}>
                  <Text style={styles.blockoutEmptyTxt}>You have no{"\n"}upcoming blockouts</Text>
                  <PcButton variant="outline" title="ADD A BLOCKOUT" onPress={() => navigation.navigate("PcBlockoutEditor")} style={{ marginTop: 24, paddingHorizontal: 32 }} />
                </View>
              ) : (
                <>
                  {blockouts.map((b) => (
                    <View key={String(b.id)} style={styles.schedRow}>
                      <Ionicons name="calendar-clear-outline" size={24} color={pcColors.danger} />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.schedDate}>{b.label}{b.repeat !== "none" ? ` · ${b.repeat}` : ""}</Text>
                        {!!b.reason && <Text style={styles.schedSub}>{b.reason}</Text>}
                      </View>
                    </View>
                  ))}
                  <PcButton variant="outline" title="ADD A BLOCKOUT" onPress={() => navigation.navigate("PcBlockoutEditor")} style={{ margin: 16, paddingHorizontal: 32 }} />
                </>
              ))}

            {tab === "MESSAGES" && (
              <>
                <View style={styles.msgTop}>
                  <PcSegmented
                    options={[{ key: "UNREAD", label: `UNREAD${messages.unread.length ? ` ${messages.unread.length}` : ""}` }, { key: "RECEIVED", label: "RECEIVED" }, { key: "SENT", label: "SENT" }]}
                    value={msgTab} onChange={setMsgTab} style={{ flex: 1 }}
                  />
                </View>
                {msgTab === "UNREAD" && messages.unread.length > 0 && (
                  <Pressable onPress={markAllRead} style={styles.markAll}><Text style={styles.markAllTxt}>Mark all as read</Text></Pressable>
                )}
                {(() => {
                  const list = msgTab === "UNREAD" ? messages.unread : msgTab === "RECEIVED" ? messages.received : messages.sent;
                  if (list.length === 0) return <Text style={styles.emptyMid}>Niciun mesaj.</Text>;
                  return list.map((m) => (
                    <View key={String(m.id)} style={styles.msgRow}>
                      {!m.read && m.direction === "received" && <View style={styles.msgDot} />}
                      <View style={{ flex: 1, marginLeft: m.read || m.direction === "sent" ? 18 : 0 }}>
                        <Text style={styles.msgSubject} numberOfLines={1}>{m.subject}</Text>
                        <Text style={styles.msgDate}>{m.direction === "sent" ? "Sent" : "Received"} on {m.dateLabel}</Text>
                      </View>
                    </View>
                  ));
                })()}
              </>
            )}
          </ScrollView>

          {/* Bottom bar Help / Settings */}
          <View style={[styles.bottomBar, { paddingBottom: (insets.bottom || 8) + 8 }]}>
            <Pressable style={styles.bottomItem} onPress={() => {}}>
              <Ionicons name="help-circle-outline" size={22} color={pcColors.primary} />
              <Text style={styles.bottomTxt}>HELP</Text>
            </Pressable>
            <Pressable style={styles.bottomItem} onPress={() => navigation.navigate("PcSettings")}>
              <Ionicons name="settings-outline" size={22} color={pcColors.primary} />
              <Text style={styles.bottomTxt}>SETTINGS</Text>
            </Pressable>
          </View>
        </>
      )}
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", flex: 1, marginLeft: 12 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 18 },
  identity: { alignItems: "center", paddingVertical: 20, backgroundColor: "#141416" },
  actionBtns: { flexDirection: "row", gap: 12, marginTop: 18, alignSelf: "stretch", paddingHorizontal: 16 },
  name: { color: pcColors.textPrimary, fontSize: 24, fontWeight: "700", marginTop: 14, textAlign: "center", paddingHorizontal: 20 },
  contact: { color: pcColors.textSecondary, fontSize: 15, marginTop: 4 },
  schedRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  schedDate: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700" },
  schedSub: { color: pcColors.textSecondary, fontSize: 15, marginTop: 2 },
  emptyMid: { color: pcColors.textMuted, textAlign: "center", marginTop: 40 },
  msgTop: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 16 },
  markAll: { alignSelf: "flex-end", paddingHorizontal: 16, paddingVertical: 10 },
  markAllTxt: { color: pcColors.primary, fontSize: 14, fontWeight: "700" },
  msgRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  msgDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: pcColors.orange, marginRight: 10 },
  msgSubject: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  msgDate: { color: pcColors.textMuted, fontSize: 13, marginTop: 3 },
  blockoutEmpty: { alignItems: "center", marginTop: 50 },
  blockoutEmptyTxt: { color: pcColors.textSecondary, fontSize: 20, fontWeight: "700", textAlign: "center", lineHeight: 28 },
  bottomBar: { flexDirection: "row", backgroundColor: pcColors.bgHeader, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pcColors.divider, paddingTop: 12 },
  bottomItem: { flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  bottomTxt: { color: pcColors.primary, fontWeight: "700", letterSpacing: 0.5 },
});

export default ProfileScreen;
