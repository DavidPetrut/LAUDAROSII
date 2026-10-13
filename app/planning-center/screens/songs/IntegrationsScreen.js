/** Integrations — MultiTracks.com = integrarea noastră principală (§11.6).
 *  Link = seam onest: marcăm contul conectat; fetch-ul real de fișiere depinde de accesul MultiTracks. */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcIconButton, PcCard, PcButton } from "../../components";
import { usePc } from "../../navigation/PcContext";

export function IntegrationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const canEdit = !!me?.capabilities?.songsEdit;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await pcApi.songs.integrations()).integrations || []); }
    catch (e) { showError(e?.message || "Eroare la integrări."); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const link = async (provider) => {
    setLinking(provider);
    try { const r = await pcApi.songs.linkIntegration(provider); showSuccess(r?.note || "Conectat."); await load(); }
    catch (e) { showError(e?.message || "Nu s-a putut conecta."); }
    finally { setLinking(""); }
  };

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <PcIconButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Integrations</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.intro}>Conectează sursa de resurse muzicale. Integrarea noastră principală este MultiTracks.</Text>
          {items.map((it) => {
            const connected = it.status === "connected";
            return (
              <PcCard key={it.key} style={{ marginBottom: 12 }}>
                <View style={styles.row}>
                  <View style={styles.logo}><Ionicons name="musical-notes" size={22} color={pcColors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{it.label}{it.primary ? "  ·  principală" : ""}</Text>
                    <Text style={[styles.status, connected && { color: pcColors.primary }]}>
                      {connected ? "Conectat" : "Neconectat"}
                    </Text>
                  </View>
                  {connected
                    ? <Ionicons name="checkmark-circle" size={26} color={pcColors.primary} />
                    : canEdit && <PcButton title="Conectează" onPress={() => link(it.key)} loading={linking === it.key} />}
                </View>
              </PcCard>
            );
          })}
          <Text style={styles.note}>
            Notă: MultiTracks nu expune un API public pentru terți. Linkarea și structura de import sunt pregătite;
            descărcarea efectivă a chord charts / multitrack-urilor se activează când există acces/parteneriat MultiTracks.
          </Text>
        </ScrollView>
      )}
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  intro: { color: pcColors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 42, height: 42, borderRadius: 10, backgroundColor: pcColors.input, alignItems: "center", justifyContent: "center" },
  name: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  status: { color: pcColors.textMuted, fontSize: 13, marginTop: 2 },
  note: { color: pcColors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 10 },
});

export default IntegrationsScreen;
