/** Songs (tab) — bibliotecă: listă + search + add + intrare integrări (MultiTracks). */
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcSearchBar, PcIconButton, PcAvatar, PcListRow, PcBottomSheet, PcButton } from "../../components";
import { usePc } from "../../navigation/PcContext";
import { SongsFilterSheet } from "./SongsFilterSheet";

export function SongsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const canEdit = !!me?.capabilities?.songsEdit;
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [actionsOpen, setActionsOpen] = useState(false);

  const filterCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length;

  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);
  const load = useCallback(async () => {
    setLoading(true);
    try { setSongs((await pcApi.songs.list({ q: debounced || undefined, ...filters })).songs || []); }
    catch (e) { showError(e?.message || "Eroare la cântări."); }
    finally { setLoading(false); }
  }, [debounced, filters]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const createSong = async () => {
    if (!newTitle.trim()) return showError("Scrie un titlu.");
    setCreating(true);
    try {
      const s = await pcApi.songs.create({ title: newTitle.trim() });
      setAddOpen(false); setNewTitle("");
      navigation.navigate("PcSongDetail", { songId: s.id });
    } catch (e) { showError(e?.message || "Nu s-a putut crea."); }
    finally { setCreating(false); }
  };

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Songs</Text>
        <View style={styles.headerIcons}>
          {canEdit && <PcIconButton icon="ellipsis-horizontal" color={pcColors.textSecondary} onPress={() => setActionsOpen(true)} style={{ marginLeft: 16 }} />}
          <PcIconButton icon="notifications-outline" dot onPress={() => {}} style={{ marginLeft: 18 }} />
          <Pressable onPress={() => me?.person?.id && navigation.navigate("PcProfile", { personId: me.person.id })} hitSlop={6} style={{ marginLeft: 18 }}>
            <PcAvatar uri={me?.person?.avatar} initials={me?.person?.initials || ""} size={32} />
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: pcColors.bgHeader }}>
        <PcSearchBar value={query} onChangeText={setQuery} placeholder="Search Songs" onClear={() => setQuery("")} />
      </View>

      <View style={styles.resultsBar}>
        <Text style={styles.results}>{songs.length} {songs.length === 1 ? "Result" : "Results"}</Text>
        <Pressable style={[styles.filterBtn, filterCount > 0 && styles.filterBtnOn]} onPress={() => setFilterOpen(true)}>
          <Ionicons name="filter" size={16} color={filterCount > 0 ? pcColors.primary : pcColors.textSecondary} />
          <Text style={[styles.filterTxt, filterCount > 0 && { color: pcColors.primary }]}>Filter{filterCount > 0 ? ` (${filterCount})` : ""}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item }) => (
            <PcListRow
              title={item.title}
              sub={[item.author, item.bpm ? `${item.bpm} BPM` : null].filter(Boolean).join(" · ")}
              right={(item.keys && item.keys.length) || item.defaultKey ? <View style={styles.keyBadge}><Text style={styles.keyTxt} numberOfLines={1}>{item.keys && item.keys.length ? item.keys.join(", ") : item.defaultKey}</Text></View> : null}
              onPress={() => navigation.navigate("PcSongDetail", { songId: item.id })}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nicio cântare.</Text>}
          contentContainerStyle={{ paddingBottom: 90 }}
        />
      )}

      {canEdit && (
        <Pressable style={styles.fab} onPress={() => setAddOpen(true)}>
          <Ionicons name="add" size={30} color="#0A0A0A" />
        </Pressable>
      )}

      <PcBottomSheet visible={addOpen} onClose={() => setAddOpen(false)} maxHeightPct={0.4}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={styles.sheetTitle}>Adaugă cântec</Text>
          <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="Titlu cântec" placeholderTextColor={pcColors.textMuted} />
          <Text style={styles.hint}>Căutarea în MultiTracks/CCLI (Popular Recordings) = seam. Acum: creează cântec nou după titlu.</Text>
          <PcButton title="Creează" onPress={createSong} loading={creating} block style={{ marginTop: 14 }} />
        </View>
      </PcBottomSheet>

      <SongsFilterSheet visible={filterOpen} onClose={() => setFilterOpen(false)} initial={filters} onApply={setFilters} />

      <PcBottomSheet visible={actionsOpen} onClose={() => setActionsOpen(false)} maxHeightPct={0.4}>
        <View style={{ paddingHorizontal: 8, paddingBottom: 12 }}>
          <Text style={[styles.sheetTitle, { paddingHorizontal: 8 }]}>Actions</Text>
          <Pressable style={styles.actRow} onPress={() => { setActionsOpen(false); navigation.navigate("PcTagsManager"); }}>
            <Ionicons name="pricetags-outline" size={22} color={pcColors.textSecondary} />
            <Text style={styles.actTxt}>Edit Tags</Text>
          </Pressable>
          <Pressable style={styles.actRow} onPress={() => { setActionsOpen(false); navigation.navigate("PcIntegrations"); }}>
            <Ionicons name="git-network-outline" size={22} color={pcColors.textSecondary} />
            <Text style={styles.actTxt}>Integrations</Text>
          </Pressable>
        </View>
      </PcBottomSheet>
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 24, fontWeight: "700" },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  resultsBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  results: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  filterBtnOn: { borderColor: pcColors.primary, backgroundColor: "rgba(134,193,63,0.12)" },
  filterTxt: { color: pcColors.textSecondary, fontSize: 13, fontWeight: "700" },
  keyBadge: { borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 140 },
  keyTxt: { color: pcColors.textSecondary, fontWeight: "700", fontSize: 12 },
  actRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 15, paddingHorizontal: 8 },
  actTxt: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 40 },
  fab: { position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: pcColors.primary, alignItems: "center", justifyContent: "center", elevation: 6 },
  sheetTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  input: { color: pcColors.textPrimary, fontSize: 17, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 48 },
  hint: { color: pcColors.textMuted, fontSize: 12, marginTop: 8, lineHeight: 16 },
});

export default SongsScreen;
