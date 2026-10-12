/** Profil persoană (§9 [PROFILE]) — IDENTIC: avatar + TEAMS + Schedule/Blockouts/Messages + Help/Settings. */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcAvatar } from "../../components";

const TABS = [
  { key: "SCHEDULE", icon: "calendar-check", lib: "mci" },
  { key: "BLOCKOUTS", icon: "close-circle", lib: "ion" },
  { key: "MESSAGES", icon: "mail", lib: "ion" },
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
      setMessages({ unread: m.unread || [], received: m.received || [], sent: m.sent || [] });
    } catch (e) {
      showError(e?.message || "Nu s-a putut încărca profilul.");
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => { load(); }, [load]);

  const primaryEmail = person?.emails?.find((e) => e.primary)?.address || person?.emails?.[0]?.address;
  const primaryPhone = person?.phones?.find((p) => p.primary)?.number || person?.phones?.[0]?.number;

  const TabIcon = ({ icon, lib, color }) =>
    lib === "mci" ? <MaterialCommunityIcons name={icon} size={22} color={color} /> : <Ionicons name={icon} size={22} color={color} />;

  return (
    <View style={styles.container}>
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
            <Pressable style={styles.teamsBtn} onPress={() => navigation.navigate("PcMyTeams", { personId })}>
              <Ionicons name="people" size={18} color={pcColors.primary} />
              <Text style={styles.teamsTxt}>TEAMS </Text>
              <Text style={styles.teamsCount}>{person?.teamsCount ?? 0}</Text>
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {TABS.map((t) => {
              const on = tab === t.key;
              return (
                <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
                  <TabIcon icon={t.icon} lib={t.lib} color={on ? pcColors.primary : pcColors.textMuted} />
                  <Text style={[styles.tabTxt, { color: on ? pcColors.primary : pcColors.textMuted }]}>{t.key}</Text>
                  {on && <View style={styles.tabUnderline} />}
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
            {tab === "SCHEDULE" && (
              schedule.length === 0 ? (
                <Text style={styles.emptyMid}>Nicio programare viitoare.</Text>
              ) : (
                schedule.map((it, i) => (
                  <View key={i} style={styles.schedRow}>
                    <Ionicons
                      name={it.status === "confirmed" ? "checkmark-circle-outline" : "help-circle-outline"}
                      size={26}
                      color={it.status === "confirmed" ? pcColors.primary : pcColors.orange}
                    />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.schedDate}>{it.dateLabel}</Text>
                      <Text style={styles.schedSub}>{it.serviceTypeName}</Text>
                    </View>
                  </View>
                ))
              )
            )}

            {tab === "BLOCKOUTS" && (
              blockouts.length === 0 ? (
                <View style={styles.blockoutEmpty}>
                  <Text style={styles.blockoutEmptyTxt}>You have no{"\n"}upcoming blockouts</Text>
                  <Pressable style={styles.outlineBtn} onPress={() => {}}>
                    <Text style={styles.outlineBtnTxt}>ADD A BLOCKOUT</Text>
                  </Pressable>
                </View>
              ) : null
            )}

            {tab === "MESSAGES" && (
              <>
                <View style={styles.msgToggle}>
                  {["UNREAD", "RECEIVED", "SENT"].map((m) => (
                    <Pressable key={m} style={[styles.msgSeg, msgTab === m && styles.msgSegOn]} onPress={() => setMsgTab(m)}>
                      <Text style={[styles.msgSegTxt, msgTab === m && { color: pcColors.primary }]}>{m}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.emptyMid}>Niciun mesaj.</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: pcColors.bg },
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", flex: 1, marginLeft: 12 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 18 },
  identity: { alignItems: "center", paddingVertical: 20, backgroundColor: "#141416" },
  name: { color: pcColors.textPrimary, fontSize: 24, fontWeight: "700", marginTop: 14, textAlign: "center", paddingHorizontal: 20 },
  contact: { color: pcColors.textSecondary, fontSize: 15, marginTop: 4 },
  teamsBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: pcColors.primary, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 40, marginTop: 18 },
  teamsTxt: { color: pcColors.primary, fontWeight: "700", fontSize: 15, marginLeft: 8, letterSpacing: 0.5 },
  teamsCount: { color: pcColors.textPrimary, fontWeight: "700", fontSize: 15 },
  tabs: { flexDirection: "row", backgroundColor: "#141416", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabTxt: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginTop: 4 },
  tabUnderline: { position: "absolute", bottom: 0, height: 2, width: "60%", backgroundColor: pcColors.primary },
  schedRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  schedDate: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700" },
  schedSub: { color: pcColors.textSecondary, fontSize: 15, marginTop: 2 },
  emptyMid: { color: pcColors.textMuted, textAlign: "center", marginTop: 40 },
  blockoutEmpty: { alignItems: "center", marginTop: 50 },
  blockoutEmptyTxt: { color: pcColors.textSecondary, fontSize: 20, fontWeight: "700", textAlign: "center", lineHeight: 28 },
  outlineBtn: { borderWidth: 1, borderColor: pcColors.primary, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32, marginTop: 24 },
  outlineBtnTxt: { color: pcColors.primary, fontWeight: "700", letterSpacing: 0.5 },
  msgToggle: { flexDirection: "row", margin: 16, borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 8, overflow: "hidden" },
  msgSeg: { flex: 1, alignItems: "center", paddingVertical: 12 },
  msgSegOn: { borderWidth: 1, borderColor: pcColors.primary, borderRadius: 8 },
  msgSegTxt: { color: pcColors.textSecondary, fontWeight: "700" },
  bottomBar: { flexDirection: "row", backgroundColor: pcColors.bgHeader, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pcColors.divider, paddingTop: 12 },
  bottomItem: { flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  bottomTxt: { color: pcColors.primary, fontWeight: "700", letterSpacing: 0.5 },
});

export default ProfileScreen;
