/** Rehearse (tab plan) — lista cântecelor planului + Media Player / Songbook / Music Stand.
 *  Tap pe cântec = expandează Documents / Media / Other / Description / Notes.
 *  Audio → player global (persistă până dai X). Chord chart derivat → viewer transpozabil. */
import React, { useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { showError, showInfo } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { usePcAudio } from "../../navigation/PcAudioContext";
import { SongbookSheet } from "./SongbookSheet";

export function RehearseTab({ planId, navigation }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // itemId expandat
  const [songbook, setSongbook] = useState(false);
  const { playQueue } = usePcAudio();

  const load = useCallback(async () => {
    setLoading(true);
    try { setSongs((await pcApi.plans.rehearse(planId)).songs || []); }
    catch (e) { showError(e?.message || "Eroare la rehearse."); }
    finally { setLoading(false); }
  }, [planId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Coadă audio din toate cântecele cu audio.
  const audioQueue = songs.flatMap((s) => (s.audio || []).map((a) => ({ id: String(a.id), title: a.name || s.title, url: a.url, subtitle: s.keyName })));

  const openMediaPlayer = () => {
    if (audioQueue.length === 0) return showInfo("Niciun fișier audio pe cântecele planului.");
    navigation.navigate("PcMediaPlayer", { planId });
  };
  const playSongAudio = (s) => {
    const idx = audioQueue.findIndex((t) => (s.audio || []).some((a) => String(a.id) === t.id));
    if (idx < 0) return showInfo("Acest cântec n-are audio.");
    playQueue(audioQueue, idx);
    navigation.navigate("PcMediaPlayer", { planId });
  };
  const openDoc = (s, f) => {
    if (f.derived || (f.kind === "chordChart")) return navigation.navigate("PcChartViewer", { songId: s.songId, arrangementId: s.arrangementId, initialDisplayKey: s.keyName });
    if (f.pending) return showInfo("Fișier în așteptare (MultiTracks/transpunere).");
    if (!f.url) return showInfo("Fișier fără conținut încă.");
    showInfo("Deschiderea fișierelor = felie ulterioară (viewer).");
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.actions}>
        <ActionBtn icon="volume-high-outline" label="Media Player" onPress={openMediaPlayer} />
        <ActionBtn icon="musical-notes-outline" label="Songbook" onPress={() => setSongbook(true)} />
        <ActionBtn icon="easel-outline" label="Music Stand" onPress={() => navigation.navigate("PcMusicStand", { planId })} />
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : songs.length === 0 ? (
        <Text style={styles.empty}>Niciun cântec în acest plan.</Text>
      ) : (
        <View style={{ paddingHorizontal: 16 }}>
          {songs.map((s) => {
            const expanded = open === String(s.itemId);
            return (
              <View key={String(s.itemId)} style={styles.songCard}>
                <Pressable style={styles.songHead} onPress={() => setOpen(expanded ? null : String(s.itemId))}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.songTitle} numberOfLines={1}>{s.title}</Text>
                    {!!(s.arrangementName || s.bpm) && <Text style={styles.songSub}>{[s.arrangementName, s.bpm ? `${s.bpm}bpm` : null].filter(Boolean).join(" · ")}</Text>}
                  </View>
                  {!!s.keyName && <View style={styles.keyBadge}><Text style={styles.keyTxt}>{s.keyName}</Text></View>}
                  {(s.audio || []).length > 0 && (
                    <Pressable hitSlop={8} onPress={() => playSongAudio(s)} style={{ marginLeft: 10 }}><Ionicons name="play-circle" size={28} color={pcColors.primary} /></Pressable>
                  )}
                  <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={pcColors.textMuted} style={{ marginLeft: 8 }} />
                </Pressable>

                {expanded && (
                  <View style={styles.detail}>
                    {!!(s.sequence && s.sequence.length) && <Text style={styles.seq}>Sequence: {s.sequence.join(", ")}</Text>}
                    <Section title="DOCUMENTS" icon="document-text-outline">
                      {s.hasChordChart && <FileLine icon="document-text-outline" name={`Chord Chart in ${s.keyName || s.originalKey}`} accent onPress={() => openDoc(s, { kind: "chordChart" })} />}
                      {(s.docs || []).map((f) => <FileLine key={String(f.id)} icon="document-outline" name={f.name} pending={f.pending} onPress={() => openDoc(s, f)} />)}
                      {!s.hasChordChart && (s.docs || []).length === 0 && <Text style={styles.none}>—</Text>}
                    </Section>
                    <Section title="MEDIA" icon="musical-note-outline">
                      {(s.audio || []).map((a) => <FileLine key={String(a.id)} icon="musical-note" name={a.name} accent onPress={() => playSongAudio(s)} />)}
                      {(s.audio || []).length === 0 && <Text style={styles.none}>—</Text>}
                    </Section>
                    {!!s.notes && (
                      <Section title="NOTES" icon="chatbox-outline"><Text style={styles.notes}>{s.notes}</Text></Section>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      <SongbookSheet visible={songbook} onClose={() => setSongbook(false)} planId={planId} songs={songs} navigation={navigation} />
    </View>
  );
}

function ActionBtn({ icon, label, onPress }) {
  return (
    <Pressable style={styles.actBtn} onPress={onPress}>
      <Ionicons name={icon} size={18} color={pcColors.primary} />
      <Text style={styles.actTxt}>{label}</Text>
    </Pressable>
  );
}
function Section({ title, icon, children }) {
  return (
    <View style={{ marginTop: 12 }}>
      <View style={styles.secHead}><Ionicons name={icon} size={14} color={pcColors.textMuted} /><Text style={styles.secTitle}>{title}</Text></View>
      {children}
    </View>
  );
}
function FileLine({ icon, name, onPress, accent, pending }) {
  return (
    <Pressable style={styles.fileLine} onPress={onPress}>
      <Ionicons name={icon} size={18} color={accent ? pcColors.primary : pcColors.textSecondary} />
      <Text style={[styles.fileName, accent && { color: pcColors.primary }]} numberOfLines={1}>{name}</Text>
      {pending && <Text style={styles.pend}>pending</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12, flexWrap: "wrap" },
  actBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  actTxt: { color: pcColors.textPrimary, fontSize: 13, fontWeight: "700" },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 40 },
  songCard: { backgroundColor: pcColors.card, borderRadius: 12, marginBottom: 10, overflow: "hidden" },
  songHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14 },
  songTitle: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  songSub: { color: pcColors.textSecondary, fontSize: 13, marginTop: 2 },
  keyBadge: { backgroundColor: "#2E4B8F", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  keyTxt: { color: "#fff", fontSize: 12, fontWeight: "800" },
  detail: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pcColors.divider },
  seq: { color: pcColors.textSecondary, fontSize: 13, marginTop: 10 },
  secHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  secTitle: { color: pcColors.textMuted, fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  fileLine: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  fileName: { color: pcColors.textPrimary, fontSize: 15, flex: 1 },
  pend: { color: pcColors.textMuted, fontSize: 10, fontWeight: "700" },
  none: { color: pcColors.textMuted, fontSize: 13, paddingVertical: 4 },
  notes: { color: pcColors.textSecondary, fontSize: 14, lineHeight: 20 },
});

export default RehearseTab;
