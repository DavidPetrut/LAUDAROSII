/** Media (tab) — biblioteca media (separată de Songs): video (YouTube/Vimeo), fișiere, imagini, linkuri. */
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Pressable, Image, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcSearchBar, PcIconButton, PcAvatar } from "../../components";
import { usePc } from "../../navigation/PcContext";

const KIND_ICON = { youtube: "logo-youtube", vimeo: "videocam", video: "film-outline", image: "image-outline", file: "document-outline", link: "link-outline" };

export function MediaListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const canEdit = !!me?.capabilities?.mediaEdit;
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);
  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await pcApi.media.list({ q: debounced || undefined })).items || []); }
    catch (e) { showError(e?.message || "Eroare la media."); }
    finally { setLoading(false); }
  }, [debounced]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Media</Text>
        <View style={styles.headerIcons}>
          <PcIconButton icon="notifications-outline" dot onPress={() => {}} style={{ marginLeft: 18 }} />
          <Pressable onPress={() => me?.person?.id && navigation.navigate("PcProfile", { personId: me.person.id })} hitSlop={6} style={{ marginLeft: 18 }}>
            <PcAvatar uri={me?.person?.avatar} initials={me?.person?.initials || ""} size={32} />
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: pcColors.bgHeader }}>
        <PcSearchBar value={query} onChangeText={setQuery} placeholder="Search Media" onClear={() => setQuery("")} />
      </View>
      <View style={styles.resultsBar}><Text style={styles.results}>{items.length} {items.length === 1 ? "Result" : "Results"}</Text></View>

      {loading ? <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={items}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => navigation.navigate("PcMediaItem", { mediaId: item.id })}>
              {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} /> : <View style={styles.thumbPh}><Ionicons name={KIND_ICON[item.kind] || "ellipse-outline"} size={22} color={pcColors.textMuted} /></View>}
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.kind}>{item.kind}{item.author ? ` · ${item.author}` : ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={pcColors.textMuted} />
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nicio media.</Text>}
          contentContainerStyle={{ paddingBottom: 90 }}
        />
      )}

      {canEdit && (
        <Pressable style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => navigation.navigate("PcAddMedia")}>
          <Ionicons name="add" size={30} color="#0A0A0A" />
        </Pressable>
      )}
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 24, fontWeight: "700" },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  resultsBar: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  results: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  thumb: { width: 54, height: 40, borderRadius: 6, backgroundColor: pcColors.input },
  thumbPh: { width: 54, height: 40, borderRadius: 6, backgroundColor: pcColors.input, alignItems: "center", justifyContent: "center" },
  title: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
  kind: { color: pcColors.textSecondary, fontSize: 13, marginTop: 2, textTransform: "capitalize" },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 40 },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: pcColors.primary, alignItems: "center", justifyContent: "center", elevation: 6 },
});

export default MediaListScreen;
