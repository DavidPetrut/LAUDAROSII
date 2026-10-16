/** NOTES tab — note pe plan grupate pe categorii. */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showInfo } from "../../../../global/functions";
import { pcApi } from "../../../api/pcApi";
import { pcColors } from "../../../theme";
import { PcButton } from "../../../components";

export function NotesTab({ planId }) {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setNotes((await pcApi.plans.notes(planId)).notes || []); }
    catch (e) { showError(e?.message || "Eroare la note."); }
    finally { setLoading(false); }
  }, [planId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ActivityIndicator color={pcColors.primary} style={{ marginTop: 30 }} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
      {notes.length === 0 && <Text style={styles.empty}>Nicio notă.</Text>}
      {notes.map((n) => (
        <View key={String(n.id)} style={{ marginBottom: 18 }}>
          <Text style={styles.category}>{n.category}</Text>
          <Text style={styles.content}>{n.content}</Text>
        </View>
      ))}
      <PcButton title="Add" variant="outline" icon="add" onPress={() => showInfo("Adăugare notă — vine cu „Create a service")} style={{ marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  category: { color: pcColors.textSecondary, fontWeight: "700", letterSpacing: 0.5, fontSize: 13, marginBottom: 8 },
  content: { color: pcColors.textPrimary, fontSize: 15, lineHeight: 21 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 30 },
});

export default NotesTab;
