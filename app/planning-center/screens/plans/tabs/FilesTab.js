/** FILES tab — Play / Music Stand + fișiere grupate (service type / plan / cântec).
 *  Rândurile sunt APĂSABILE: audio → player global; alte fișiere (pdf/doc/imagine/link) → se deschid.
 */
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Linking, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { showError, showInfo } from "../../../../global/functions";
import { pcApi } from "../../../api/pcApi";
import { pcColors } from "../../../theme";
import { PcButton } from "../../../components";
import { usePcAudio } from "../../../navigation/PcAudioContext";

// Audio detectat după kind SAU extensie (upload-urile nu au mereu kind="audio") → redare în playerul INTERN.
const AUDIO_RX = /\.(mp3|m4a|aac|wav|ogg|flac|opus|aiff?)(\?|#|$)/i;
const isAudio = (f) => !!(f && (f.kind === "audio" || (f.url && AUDIO_RX.test(f.url)) || (f.name && AUDIO_RX.test(f.name))));

const fileIcon = (f) =>
  isAudio(f) ? "musical-note" : f.kind === "chordChart" ? "document-text-outline" : f.kind === "link" ? "link-outline" : "document-outline";

// Numele vine uneori URL-encodat (ex. „My%20Song.mp3") → îl afișăm decodat, lizibil.
const prettyName = (n) => {
  const s = String(n || "");
  if (!s.includes("%")) return s;
  try { return decodeURIComponent(s); } catch (e) { return s; }
};

export function FilesTab({ planId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playQueue } = usePcAudio();

  const load = useCallback(async () => {
    setLoading(true);
    try { setGroups((await pcApi.plans.files(planId)).groups || []); }
    catch (e) { showError(e?.message || "Eroare la fișiere."); }
    finally { setLoading(false); }
  }, [planId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Toate piesele audio din plan (pt. butonul Play + redare în coadă).
  const audioTracks = useMemo(() => {
    const out = [];
    groups.forEach((g) => (g.files || []).forEach((f) => {
      if (isAudio(f) && f.url) out.push({ id: String(f.id), title: prettyName(f.name), url: f.url, subtitle: g.label });
    }));
    return out;
  }, [groups]);

  const openFile = useCallback(async (f) => {
    if (isAudio(f) && f.url) {
      const start = Math.max(0, audioTracks.findIndex((t) => t.id === String(f.id)));
      const ok = await playQueue(audioTracks, start);
      if (!ok) showError("Nu pot reda acest fișier audio.");
      return;
    }
    if (f.url) {
      try { await Linking.openURL(f.url); }
      catch (e) { showError("Nu pot deschide fișierul."); }
      return;
    }
    showInfo("Fișier fără conținut descărcabil (ex. chart generat).");
  }, [audioTracks, playQueue]);

  if (loading) return <ActivityIndicator color={pcColors.primary} style={{ marginTop: 30 }} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.actions}>
        <PcButton
          title="Play"
          variant="outline"
          icon="play-circle-outline"
          onPress={() => audioTracks.length ? playQueue(audioTracks, 0) : showInfo("Niciun fișier audio în acest plan.")}
          style={styles.btn}
          textStyle={{ fontSize: 14 }}
        />
        <PcButton title="Music Stand" variant="outline" icon="musical-notes-outline" onPress={() => showInfo("Music Stand — în curând")} style={styles.btn} textStyle={{ fontSize: 14 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {groups.length === 0 && <Text style={styles.empty}>Niciun fișier atașat.</Text>}
        {groups.map((g, gi) => (
          <View key={gi} style={{ marginBottom: 16 }}>
            <Text style={styles.group}>{String(g.label || "").toUpperCase()}</Text>
            {g.files.map((f) => {
              const audio = isAudio(f);
              const openable = !!f.url;
              return (
                <Pressable
                  key={String(f.id)}
                  style={({ pressed }) => [styles.fileRow, pressed && openable && { opacity: 0.6 }]}
                  onPress={() => openFile(f)}
                >
                  <Ionicons name={fileIcon(f)} size={20} color={openable ? pcColors.primary : pcColors.textSecondary} />
                  <Text style={styles.fileName} numberOfLines={1}>{prettyName(f.name)}</Text>
                  {openable && (
                    <Ionicons name={audio ? "play-circle" : "open-outline"} size={20} color={pcColors.textMuted} />
                  )}
                </Pressable>
              );
            })}
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
