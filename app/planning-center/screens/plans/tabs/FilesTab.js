/** FILES tab — Play / Music Stand + fișiere grupate (service type / plan / cântec). */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { showError, showInfo } from "../../../../global/functions";
import { pcApi } from "../../../api/pcApi";
import { pcColors } from "../../../theme";
import { PcButton } from "../../../components";

const fileIcon = (kind) =>
  kind === "audio" ? "musical-note" : kind === "chordChart" ? "document-text-outline" : kind === "link" ? "link-outline" : "document-outline";

export function FilesTab({ planId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setGroups((await pcApi.plans.files(planId)).groups || []); }
    catch (e) { showError(e?.message || "Eroare la fișiere."); }
    finally { setLoading(false); }
  }, [planId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ActivityIndicator color={pcColors.primary} style={{ marginTop: 30 }} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.actions}>
        <PcButton title="Play" variant="outline" icon="play-circle-outline" onPress={() => showInfo("Media player — în curând")} style={styles.btn} textStyle={{ fontSize: 14 }} />
        <PcButton title="Music Stand" variant="outline" icon="musical-notes-outline" onPress={() => showInfo("Music Stand — în curând")} style={styles.btn} textStyle={{ fontSize: 14 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {groups.length === 0 && <Text style={styles.empty}>Niciun fișier atașat.</Text>}
        {groups.map((g, gi) => (
          <View key={gi} style={{ marginBottom: 16 }}>
            <Text style={styles.group}>{g.label.toUpperCase()}</Text>
            {g.files.map((f) => (
              <View key={String(f.id)} style={styles.fileRow}>
                <Ionicons name={fileIcon(f.kind)} size={20} color={pcColors.textSecondary} />
                <Text style={styles.fileName}>{f.name}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  btn: { flex: 1, paddingVertical: 10 },
  group: { color: pcColors.textSecondary, fontWeight: "700", letterSpacing: 0.5, fontSize: 13, marginBottom: 8 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  fileName: { color: pcColors.textPrimary, fontSize: 15, flex: 1 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 30 },
});

export default FilesTab;
