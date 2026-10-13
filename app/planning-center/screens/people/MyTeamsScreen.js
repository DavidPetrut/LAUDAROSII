/** My Teams (§9 [MY-TEAMS]) — folosește primitivele globale (PcScreen/PcCard/PcChip). */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcCard, PcChip, PcDivider } from "../../components";

export function MyTeamsScreen({ route, navigation }) {
  const { personId } = route.params || {};
  const insets = useSafeAreaInsets();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pcApi.people.teams(personId);
      setTeams(res.teams || []);
    } catch (e) {
      showError(e?.message || "Nu s-au putut încărca echipele.");
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => { load(); }, [load]);

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={pcColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>My Teams</Text>
        <Pressable hitSlop={10} onPress={() => {}}>
          <Ionicons name="information-circle-outline" size={24} color={pcColors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {teams.length === 0 && <Text style={styles.empty}>Nicio echipă.</Text>}
          {teams.map((t, i) => (
            <PcCard key={i} style={{ marginBottom: 16 }}>
              <View style={styles.cardHead}>
                <Text style={styles.teamName}>{t.teamName}</Text>
                {t.flags?.split && <MaterialCommunityIcons name="call-split" size={18} color={pcColors.textMuted} />}
              </View>
              {!!t.serviceTypeName && <Text style={styles.serviceType}>{t.serviceTypeName}</Text>}
              <PcDivider style={{ marginVertical: 14 }} />
              <View style={styles.chipsWrap}>
                {t.positions.map((p, j) => (
                  <PcChip key={j} label={p} />
                ))}
              </View>
              <View style={styles.labels}>
                {!!t.timesLabel && <Text style={styles.label}>{t.timesLabel}</Text>}
                {!!t.frequencyLabel && <Text style={styles.label}>{t.frequencyLabel}</Text>}
              </View>
            </PcCard>
          ))}
        </ScrollView>
      )}
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 22, fontWeight: "700", flex: 1, marginLeft: 12 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  teamName: { color: pcColors.textPrimary, fontSize: 22, fontWeight: "700" },
  serviceType: { color: pcColors.textSecondary, fontSize: 15, marginTop: 8 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  labels: { alignItems: "flex-end", marginTop: 14 },
  label: { color: pcColors.textMuted, fontSize: 14, marginTop: 2 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 40 },
});

export default MyTeamsScreen;
