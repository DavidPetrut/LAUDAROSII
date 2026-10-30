/** Planurile unui SINGUR service type (deschis din lista Plans). Header cu numele tipului + planuri.
 *  Dacă nu există planuri → mesaj gol (userul se întoarce). Managerii pot adăuga plan / deschide settings/matrix. */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcListRow, PcDatePicker } from "../../components";
import { usePc } from "../../navigation/PcContext";

export function ServiceTypePlansScreen({ route, navigation }) {
  const { serviceTypeId, serviceTypeName } = route.params || {};
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const canManageST = !!me?.capabilities?.manageServiceTypes;
  const canAddPlan = !!me?.capabilities?.addPlan;
  const canSchedule = !!me?.capabilities?.schedule;

  const [st, setSt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [limit, setLimit] = useState(12); // cele mai recente întâi; restul cu „vezi mai vechi"

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pcApi.plans.list();
      setSt((res.serviceTypes || []).find((x) => String(x.id) === String(serviceTypeId)) || null);
    } catch (e) { showError(e?.message || "Nu s-au putut încărca planurile."); }
    finally { setLoading(false); }
  }, [serviceTypeId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const createPlan = async (date) => {
    setAddOpen(false);
    try {
      const res = await pcApi.plans.create({ serviceTypeId, date });
      navigation.navigate("PcPlan", { planId: res.planId });
    } catch (e) { showError(e?.message || "Nu s-a putut crea planul."); }
  };

  // Cele mai recente (viitoare + trecute) întâi, max `limit` — ca pe web (nu toate istoricele).
  const ordered = [...(st?.plans || [])].sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0));
  const plans = ordered.slice(0, limit);
  const remaining = ordered.length - plans.length;
  const name = st?.name || serviceTypeName || "Service Type";

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={pcColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
        <View style={styles.headerIcons}>
          {canSchedule && (
            <Pressable onPress={() => navigation.navigate("PcMatrix", { serviceTypeId, serviceTypeName: name })} hitSlop={8} style={{ marginLeft: 14 }}>
              <Ionicons name="grid-outline" size={20} color={pcColors.primary} />
            </Pressable>
          )}
          {canManageST && (
            <Pressable onPress={() => navigation.navigate("PcServiceTypeSettings", { serviceTypeId })} hitSlop={8} style={{ marginLeft: 14 }}>
              <Ionicons name="settings-outline" size={20} color={pcColors.primary} />
            </Pressable>
          )}
          {canAddPlan && (
            <Pressable onPress={() => setAddOpen(true)} hitSlop={8} style={{ marginLeft: 14 }}>
              <Ionicons name="add" size={26} color={pcColors.primary} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : plans.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={56} color={pcColors.textMuted} />
          <Text style={styles.emptyTxt}>Niciun plan pentru{"\n"}„{name}"</Text>
          {canAddPlan && (
            <Pressable style={styles.emptyBtn} onPress={() => setAddOpen(true)}>
              <Ionicons name="add" size={18} color="#0A0A0A" />
              <Text style={styles.emptyBtnTxt}>Adaugă un plan</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 10, paddingBottom: insets.bottom + 40 }}>
          {plans.map((p) => (
            <PcListRow
              key={String(p.id)}
              title={p.dateLabel}
              sub={p.title || name}
              right={<Ionicons name="chevron-forward" size={20} color={pcColors.textMuted} />}
              onPress={() => navigation.navigate("PcPlan", { planId: p.id })}
            />
          ))}
          {remaining > 0 && (
            <Pressable style={styles.moreBtn} onPress={() => setLimit((n) => n + 12)}>
              <Text style={styles.moreTxt}>Vezi mai vechi ({remaining})</Text>
            </Pressable>
          )}
          {limit > 12 && (
            <Pressable style={styles.moreBtn} onPress={() => setLimit(12)}>
              <Text style={[styles.moreTxt, { color: pcColors.textMuted }]}>Arată mai puține</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      <PcDatePicker visible={addOpen} onClose={() => setAddOpen(false)} value="" onChange={createPlan} />
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", flex: 1, marginLeft: 12 },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  empty: { alignItems: "center", marginTop: 70, paddingHorizontal: 32, gap: 14 },
  emptyTxt: { color: pcColors.textSecondary, fontSize: 16, textAlign: "center", lineHeight: 23 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: pcColors.primary, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 20, marginTop: 6 },
  emptyBtnTxt: { color: "#0A0A0A", fontWeight: "800", fontSize: 15 },
  moreBtn: { alignItems: "center", paddingVertical: 14 },
  moreTxt: { color: pcColors.primary, fontSize: 14, fontWeight: "600" },
});

export default ServiceTypePlansScreen;
