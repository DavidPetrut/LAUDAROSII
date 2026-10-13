/**
 * Matrix — planificare multi-plan (adaptat MOBIL: grilă poziții × planuri, scroll orizontal+vertical).
 * Valoarea-cheie PCO: EMAIL ÎN MASĂ pe toate planurile încărcate. Tap pe celulă → programează pe acel plan.
 * Target-mode/auto-schedule/drag = seam.
 */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcAvatar, PcButton } from "../../components";
import { AddPeopleSheet, SchedulePersonSheet } from "./SchedulePersonSheet";

const LABEL_W = 120;
const COL_W = 118;

export function MatrixScreen({ route, navigation }) {
  const { serviceTypeId, serviceTypeName } = route.params || {};
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(null);
  const [count, setCount] = useState(4);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [schedulable, setSchedulable] = useState(null);
  const [addCtx, setAddCtx] = useState(null); // { planId, teamId, positionId }
  const [scheduleCtx, setScheduleCtx] = useState(null); // { person, planId, teamId, positionId }

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await pcApi.matrix.get(serviceTypeId, count)); }
    catch (e) { showError(e?.message || "Eroare la matrix."); }
    finally { setLoading(false); }
  }, [serviceTypeId, count]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const tapCell = async (planId, teamId, positionId) => {
    try {
      const s = await pcApi.plans.schedulable(planId);
      setSchedulable(s);
      setAddCtx({ planId, teamId, positionId });
    } catch (e) { showError("Nu s-a putut încărca."); }
  };
  const onPicked = (person) => {
    const c = addCtx; setAddCtx(null);
    setScheduleCtx({ person, planId: c.planId, teamId: c.teamId, positionId: c.positionId });
  };
  const onSaved = async () => { await load(); };

  const sendAll = async () => {
    if (!data?.plans?.length) return;
    setSending(true);
    try {
      const r = await pcApi.matrix.sendEmails(serviceTypeId, data.plans.map((p) => p.id));
      showSuccess(r.sent > 0 ? `${r.sent} email-uri trimise` : "Niciun email de trimis (verifică SMTP)");
      load();
    } catch (e) { showError(e?.message || "Nu s-au putut trimite."); }
    finally { setSending(false); }
  };

  const Cell = ({ cell, planId, teamId, positionId }) => (
    <Pressable style={styles.cell} onPress={() => tapCell(planId, teamId, positionId)}>
      {cell.people.map((p, i) => (
        <View key={i} style={styles.cellPerson}>
          <Ionicons
            name={p.status === "confirmed" ? "checkmark-circle" : p.status === "declined" ? "close-circle" : "help-circle"}
            size={14}
            color={p.status === "confirmed" ? pcColors.primary : p.status === "declined" ? pcColors.danger : pcColors.orange}
          />
          <Text style={styles.cellName} numberOfLines={1}>{p.name?.split(" ")[0]}</Text>
        </View>
      ))}
      {cell.needed > 0 && (
        <View style={styles.neededChip}><Text style={styles.neededTxt}>{cell.needed} Needed</Text></View>
      )}
      {cell.people.length === 0 && cell.needed === 0 && <Text style={styles.cellEmpty}>+</Text>}
    </Pressable>
  );

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={pcColors.primary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Matrix</Text>
          {!!serviceTypeName && <Text style={styles.headerSub}>{serviceTypeName}</Text>}
        </View>
        <Pressable onPress={sendAll} hitSlop={10} disabled={sending}>
          <Ionicons name="mail-outline" size={24} color={pcColors.primary} />
        </Pressable>
      </View>

      {loading || !data ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingBottom: 8 }}>
            <View>
              {/* Header row: plan dates */}
              <View style={styles.row}>
                <View style={[styles.labelCell, styles.cornerCell]} />
                {data.plans.map((p) => (
                  <View key={String(p.id)} style={[styles.headCell]}>
                    <Text style={styles.headTxt}>{p.dateLabel}</Text>
                  </View>
                ))}
              </View>
              {/* Teams → positions */}
              {data.teams.map((t) => (
                <View key={String(t.teamId)}>
                  <View style={styles.teamRow}><Text style={styles.teamName}>{t.name}</Text></View>
                  {t.positions.map((pos) => (
                    <View key={String(pos.positionId)} style={styles.row}>
                      <View style={styles.labelCell}><Text style={styles.labelTxt} numberOfLines={2}>{pos.name}</Text></View>
                      {pos.cells.map((cell, idx) => (
                        <Cell key={idx} cell={cell} planId={data.plans[idx].id} teamId={t.teamId} positionId={pos.positionId} />
                      ))}
                    </View>
                  ))}
                  {t.positions.length === 0 && (
                    <View style={styles.row}><View style={styles.labelCell}><Text style={styles.labelMuted}>—</Text></View></View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 10 }}>
            <PcButton title="Încarcă mai multe planuri" variant="outline" icon="add" onPress={() => setCount((c) => c + 4)} />
            <PcButton title={sending ? "..." : "✉️ Trimite email-uri (toate planurile)"} onPress={sendAll} loading={sending} />
          </View>
        </ScrollView>
      )}

      <AddPeopleSheet visible={!!addCtx} onClose={() => setAddCtx(null)} planId={addCtx?.planId} onPicked={onPicked} />
      <SchedulePersonSheet
        visible={!!scheduleCtx}
        onClose={() => setScheduleCtx(null)}
        planId={scheduleCtx?.planId}
        person={scheduleCtx?.person}
        schedulable={schedulable}
        scopeTeamId={scheduleCtx?.teamId}
        scopePositionId={scheduleCtx?.positionId}
        onSaved={onSaved}
      />
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700" },
  headerSub: { color: pcColors.textSecondary, fontSize: 13, marginTop: 1 },
  row: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  cornerCell: { backgroundColor: pcColors.bgHeader },
  labelCell: { width: LABEL_W, paddingHorizontal: 10, paddingVertical: 12, justifyContent: "center", borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: pcColors.divider },
  labelTxt: { color: pcColors.textSecondary, fontSize: 13, fontWeight: "600" },
  labelMuted: { color: pcColors.textMuted, fontSize: 13 },
  headCell: { width: COL_W, paddingVertical: 12, alignItems: "center", justifyContent: "center", borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: pcColors.divider },
  headTxt: { color: pcColors.textPrimary, fontSize: 14, fontWeight: "700" },
  teamRow: { backgroundColor: "#1A1A1C", paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 2, borderTopColor: pcColors.primary },
  teamName: { color: pcColors.textPrimary, fontWeight: "700", fontSize: 14 },
  cell: { width: COL_W, minHeight: 48, paddingVertical: 8, paddingHorizontal: 8, justifyContent: "center", borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: pcColors.divider },
  cellPerson: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  cellName: { color: pcColors.textPrimary, fontSize: 13, flex: 1 },
  neededChip: { alignSelf: "flex-start", backgroundColor: "rgba(245,166,35,0.15)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  neededTxt: { color: pcColors.orange, fontSize: 11, fontWeight: "700" },
  cellEmpty: { color: pcColors.textMuted, fontSize: 18, textAlign: "center" },
});

export default MatrixScreen;
