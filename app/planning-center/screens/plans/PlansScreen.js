/** Plans — listă planuri grupate pe service type (tab Plans). Tap plan → Plan page. */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess, showConfirm } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcSectionTitle, PcListRow, PcButton, PcIconButton, PcAvatar, PcDatePicker } from "../../components";
import { usePc } from "../../navigation/PcContext";

export function PlansScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [addPlanFor, setAddPlanFor] = useState(null); // serviceTypeId pt. care adăugăm plan

  const canManageST = !!me?.capabilities?.manageServiceTypes;
  const canAddPlan = !!me?.capabilities?.addPlan;
  const canSchedule = !!me?.capabilities?.schedule;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pcApi.plans.list();
      setServiceTypes(res.serviceTypes || []);
    } catch (e) {
      showError(e?.message || "Nu s-au putut încărca planurile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const seedDemo = async () => {
    setSeeding(true);
    try {
      await pcApi.admin.seedDemoPlan();
      showSuccess("Plan demo creat");
      load();
    } catch (e) {
      showError(e?.message || "Nu s-a putut crea planul demo.");
    } finally {
      setSeeding(false);
    }
  };

  const createPlan = async (date) => {
    const stId = addPlanFor;
    setAddPlanFor(null);
    try {
      const res = await pcApi.plans.create({ serviceTypeId: stId, date });
      navigation.navigate("PcPlan", { planId: res.planId });
    } catch (e) {
      showError(e?.message || "Nu s-a putut crea planul.");
    }
  };

  const seedStandard = async () => {
    setSeeding(true);
    try { const r = await pcApi.admin.seedServiceTypes(); showSuccess(r.created ? `${r.created} tipuri adăugate` : "Tipurile standard există deja"); load(); }
    catch (e) { showError(e?.message || "Eroare."); }
    finally { setSeeding(false); }
  };
  const deleteServiceType = (st) => showConfirm("Șterge service type?", `„${st.name}" și planurile lui vor fi șterse.`, async () => {
    try { await pcApi.serviceTypes.remove(st.id); showSuccess("Șters."); load(); } catch (e) { showError(e?.message || "Eroare."); }
  });

  const hasPlans = serviceTypes.some((st) => st.plans.length > 0);

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Plans</Text>
        <View style={styles.headerIcons}>
          <PcIconButton icon="chatbox-outline" onPress={() => {}} style={{ marginLeft: 20 }} />
          <PcIconButton icon="notifications-outline" dot onPress={() => {}} style={{ marginLeft: 20 }} />
          <Pressable onPress={() => me?.person?.id && navigation.navigate("PcProfile", { personId: me.person.id })} hitSlop={6} style={{ marginLeft: 20 }}>
            <PcAvatar uri={me?.person?.avatar} initials={me?.person?.initials || ""} size={34} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: 8 }}>
          {/* Service Types + Add */}
          <View style={styles.stHeader}>
            <Text style={styles.stHeaderTxt}>Service Types</Text>
            {canManageST && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <PcButton title="Standard" variant="ghost" icon="sparkles-outline" onPress={seedStandard} loading={seeding} style={{ paddingVertical: 8, paddingHorizontal: 12 }} textStyle={{ fontSize: 13 }} />
                <PcButton title="Add" variant="outline" icon="add" onPress={() => navigation.navigate("PcAddServiceType")} style={{ paddingVertical: 8, paddingHorizontal: 18 }} textStyle={{ fontSize: 14 }} />
              </View>
            )}
          </View>

          {serviceTypes.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyTxt}>Niciun service type încă.</Text>
              {me?.permission?.isOrgAdmin && (
                <PcButton title={seeding ? "..." : "Creează plan demo (preview)"} variant="ghost" onPress={seedDemo} loading={seeding} style={{ marginTop: 14 }} />
              )}
            </View>
          )}

          {serviceTypes.map((st) => (
            <View key={String(st.id)} style={{ marginBottom: 12 }}>
              <View style={styles.stRow}>
                <Pressable onLongPress={() => canManageST && deleteServiceType(st)} delayLongPress={450} style={{ flex: 1 }}>
                  <PcSectionTitle style={{ marginBottom: 0 }}>{st.name}</PcSectionTitle>
                </Pressable>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {canSchedule && (
                    <Pressable style={styles.addPlanBtn} onPress={() => navigation.navigate("PcMatrix", { serviceTypeId: st.id, serviceTypeName: st.name })} hitSlop={8}>
                      <Ionicons name="grid-outline" size={16} color={pcColors.textMuted} />
                    </Pressable>
                  )}
                  {canManageST && (
                    <Pressable style={styles.addPlanBtn} onPress={() => navigation.navigate("PcServiceTypeSettings", { serviceTypeId: st.id })} hitSlop={8}>
                      <Ionicons name="settings-outline" size={18} color={pcColors.textMuted} />
                    </Pressable>
                  )}
                  {canAddPlan && (
                    <Pressable style={styles.addPlanBtn} onPress={() => setAddPlanFor(st.id)} hitSlop={8}>
                      <Ionicons name="add" size={20} color={pcColors.primary} />
                    </Pressable>
                  )}
                </View>
              </View>
              {st.plans.length === 0 ? (
                <Text style={styles.noPlans}>Niciun plan.</Text>
              ) : (
                st.plans.map((p) => (
                  <PcListRow
                    key={String(p.id)}
                    title={p.dateLabel}
                    sub={p.title || st.name}
                    right={<Text style={styles.chev}>›</Text>}
                    onPress={() => navigation.navigate("PcPlan", { planId: p.id })}
                  />
                ))
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <PcDatePicker visible={!!addPlanFor} onClose={() => setAddPlanFor(null)} value="" onChange={createPlan} />
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 24, fontWeight: "700" },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  empty: { alignItems: "center", marginTop: 50, paddingHorizontal: 32 },
  emptyTxt: { color: pcColors.textMuted, fontSize: 16 },
  noPlans: { color: pcColors.textMuted, paddingHorizontal: 16, paddingVertical: 10 },
  chev: { color: pcColors.textMuted, fontSize: 24 },
  stHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  stHeaderTxt: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700" },
  stRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 16 },
  addPlanBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: pcColors.chipBorder, alignItems: "center", justifyContent: "center" },
});

export default PlansScreen;
