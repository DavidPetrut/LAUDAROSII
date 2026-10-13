/**
 * Select Song (din Order „Add → Song"). Search bibliotecă + multi-select (păstrează ordinea) + New.
 * Adaugă song-item(e) în plan. Biblioteca = minimală (felia Songs o extinde).
 */
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcSearchBar, PcButton, PcCheckbox } from "../../components";

export function SelectSongScreen({ route, navigation }) {
  const { planId, afterItemId } = route.params || {};
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]); // ordinea selecției (ids)
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSongs((await pcApi.songs.list(debounced)).songs || []); }
    catch (e) { showError(e?.message || "Eroare la cântări."); }
    finally { setLoading(false); }
  }, [debounced]);
  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const addSelected = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      // păstrează ordinea selecției; fiecare nou item după cel anterior
      let after = afterItemId;
      for (const songId of selected) {
        const res = await pcApi.plans.addItem(planId, { type: "song", songId, afterItemId: after });
        after = res.id; // următorul după acesta
      }
      showSuccess(`${selected.length} cântec(e) adăugat(e)`);
      navigation.goBack();
    } catch (e) {
      showError(e?.message || "Nu s-a putut adăuga.");
    } finally {
      setBusy(false);
    }
  };

  const createNew = async () => {
    const title = query.trim();
    if (!title) return showError("Scrie un titlu în căutare pentru cântecul nou.");
    try {
      const song = await pcApi.songs.create({ title });
      setSelected((s) => [...s, song.id]);
      setQuery("");
      load();
    } catch (e) {
      showError(e?.message || "Nu s-a putut crea.");
    }
  };

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={26} color={pcColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Select Song</Text>
        <Pressable onPress={createNew} hitSlop={10}>
          <Text style={styles.new}>New</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: pcColors.bgHeader }}>
        <PcSearchBar value={query} onChangeText={setQuery} placeholder="Caută cântec" onClear={() => setQuery("")} />
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => toggle(item.id)}>
              <PcCheckbox checked={selected.includes(item.id)} onPress={() => toggle(item.id)} size={22} />
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              {!!item.defaultKey && <View style={styles.keyBadge}><Text style={styles.keyTxt}>{item.defaultKey}</Text></View>}
              {!!item.bpm && <Text style={styles.bpm}>{item.bpm}</Text>}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nicio cântare. Scrie un titlu și apasă „New".</Text>}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {selected.length > 0 && (
        <View style={[styles.addBar, { paddingBottom: (insets.bottom || 8) + 10 }]}>
          <PcButton title={`Add ${selected.length}`} onPress={addSelected} loading={busy} block />
        </View>
      )}
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", flex: 1, marginLeft: 12 },
  new: { color: pcColors.primary, fontSize: 16, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  title: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600", flex: 1 },
  keyBadge: { borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  keyTxt: { color: pcColors.textSecondary, fontWeight: "700", fontSize: 12 },
  bpm: { color: pcColors.textMuted, fontSize: 13, width: 36, textAlign: "right" },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 30, paddingHorizontal: 24 },
  addBar: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: pcColors.bgHeader, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pcColors.divider },
});

export default SelectSongScreen;
