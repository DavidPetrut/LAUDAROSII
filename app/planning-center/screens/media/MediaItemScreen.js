/** Media item — redare: YouTube/Vimeo = embed (WebView, fără download → fără copyright), video direct = expo-video,
 *  imagine = Image, link = deschide. Editare/ștergere (media.edit). */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator, Linking, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useVideoPlayer, VideoView } from "expo-video";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showConfirm, showInfo } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcIconButton, PcButton } from "../../components";
import { usePc } from "../../navigation/PcContext";

export function MediaItemScreen({ navigation, route }) {
  const { mediaId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const canEdit = !!me?.capabilities?.mediaEdit;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItem(await pcApi.media.get(mediaId)); }
    catch (e) { showError(e?.message || "Eroare la media."); }
    finally { setLoading(false); }
  }, [mediaId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const del = () => showConfirm("Șterge media?", `„${item?.title}" va fi ștearsă.`, async () => {
    try { await pcApi.media.remove(mediaId); navigation.goBack(); } catch (e) { showError(e?.message || "Eroare."); }
  });

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <PcIconButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle} numberOfLines={1}>{item?.title || "Media"}</Text>
        {canEdit ? <PcIconButton icon="trash-outline" color={pcColors.danger} onPress={del} /> : <View style={{ width: 36 }} />}
      </View>

      {loading || !item ? <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
          <MediaViewer item={item} />
          <Text style={styles.title}>{item.title}</Text>
          {!!item.author && <Text style={styles.meta}>{item.author}</Text>}
          <Text style={styles.kindBadge}>{item.kind}</Text>
          {!!item.description && <Text style={styles.desc}>{item.description}</Text>}
          {canEdit && <PcButton title="Editează" variant="outline" onPress={() => navigation.navigate("PcAddMedia", { mediaId })} block style={{ marginTop: 20 }} />}
        </ScrollView>
      )}
    </PcScreen>
  );
}

function MediaViewer({ item }) {
  if (item.kind === "youtube" || item.kind === "vimeo") {
    return (
      <View style={styles.videoBox}>
        <WebView
          source={{ uri: item.embedUrl }}
          style={{ flex: 1, backgroundColor: "#000" }}
          allowsFullscreenVideo
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction
        />
      </View>
    );
  }
  if (item.kind === "video") return <DirectVideo uri={item.embedUrl || item.url} />;
  if (item.kind === "image") return <Image source={{ uri: item.embedUrl || item.url }} style={styles.image} resizeMode="contain" />;
  return (
    <Pressable style={styles.linkBox} onPress={() => (item.url ? Linking.openURL(item.url).catch(() => showInfo("Nu s-a putut deschide linkul.")) : null)}>
      <Ionicons name="link-outline" size={22} color={pcColors.primary} />
      <Text style={styles.linkTxt} numberOfLines={1}>{item.url || "—"}</Text>
    </Pressable>
  );
}

function DirectVideo({ uri }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  return <VideoView style={styles.videoBox} player={player} allowsFullscreen nativeControls />;
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  videoBox: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" },
  image: { width: "100%", height: 220, borderRadius: 12, backgroundColor: pcColors.card },
  linkBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: pcColors.card, borderRadius: 12, padding: 16 },
  linkTxt: { color: pcColors.primary, fontSize: 15, flex: 1 },
  title: { color: pcColors.textPrimary, fontSize: 22, fontWeight: "800", marginTop: 16 },
  meta: { color: pcColors.textSecondary, fontSize: 15, marginTop: 4 },
  kindBadge: { color: pcColors.textMuted, fontSize: 13, marginTop: 6, textTransform: "capitalize" },
  desc: { color: pcColors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 14 },
});

export default MediaItemScreen;
