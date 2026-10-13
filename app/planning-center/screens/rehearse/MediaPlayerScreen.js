/** Media Player (din poze): LIST / SONG / LYRICS / DOCS / NOTES + controale + metronom.
 *  Folosește playerul global (PcAudio) → la Back rămâne mini-playerul (până dai X). */
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Animated, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showInfo } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { usePcAudio } from "../../navigation/PcAudioContext";
import { renderChart } from "../songs/chordpro";

const TABS = ["LIST", "SONG", "LYRICS", "DOCS", "NOTES"];
const fmt = (s) => { const x = Math.max(0, Math.floor(s || 0)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`; };

export function MediaPlayerScreen({ navigation, route }) {
  const { planId } = route.params || {};
  const insets = useSafeAreaInsets();
  const audio = usePcAudio();
  const { track, playing, position, duration, loop, queue } = audio;
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("SONG");
  const [metro, setMetro] = useState(false);

  useEffect(() => {
    let on = true;
    if (!planId) { setLoading(false); return () => { on = false; }; } // redeschis din mini-player: folosim coada curentă
    pcApi.plans.rehearse(planId).then((d) => {
      if (!on) return;
      setSongs(d.songs || []);
      // dacă nu redă nimic, pornește coada planului
      const q = (d.songs || []).flatMap((s) => (s.audio || []).map((a) => ({ id: String(a.id), title: a.name || s.title, url: a.url, subtitle: s.keyName })));
      if (q.length && (!audio.track || !audio.visible)) audio.playQueue(q, 0);
    }).catch(() => {}).finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [planId]); // eslint-disable-line

  // cântecul curent = cel ale cărui audio conține track-ul activ
  const currentSong = useMemo(() => {
    if (!track) return songs[0] || null;
    return songs.find((s) => (s.audio || []).some((a) => String(a.id) === String(track.id))) || songs[0] || null;
  }, [track, songs]);

  const lyricsRows = useMemo(() => {
    if (!currentSong?.chordpro) return [];
    return renderChart(currentSong.chordpro, { originalKey: currentSong.originalKey, mode: "lyrics" }).rows;
  }, [currentSong]);

  const seekBar = duration > 0 ? position / duration : 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* drag handle + close */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}><Ionicons name="chevron-down" size={26} color={pcColors.textSecondary} /></Pressable>
        <View style={styles.handle} />
        <Pressable onPress={() => { audio.close(); navigation.goBack(); }} hitSlop={10}><Ionicons name="close" size={24} color={pcColors.textSecondary} /></Pressable>
      </View>

      {/* header track */}
      <View style={styles.trackHead}>
        <View style={styles.thumb}><Ionicons name="musical-note" size={22} color={pcColors.textMuted} /></View>
        <Text style={styles.trackTitle} numberOfLines={1}>{track?.title || currentSong?.title || "—"}</Text>
        {playing && <MaterialCommunityIcons name="equalizer" size={22} color={pcColors.primary} />}
      </View>

      {/* tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
            <Text style={[styles.tabTxt, tab === t && styles.tabTxtOn]}>{t}</Text>
            {tab === t && <View style={styles.tabBar} />}
          </Pressable>
        ))}
      </View>

      {/* content */}
      <View style={{ flex: 1 }}>
        {loading ? <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} /> : (
          <>
            {tab === "LIST" && (
              <ScrollView contentContainerStyle={{ padding: 12 }}>
                {queue.map((t, i) => {
                  const active = String(t.id) === String(track?.id);
                  return (
                    <Pressable key={t.id} style={styles.listRow} onPress={() => audio.playQueue(queue, i)}>
                      <View style={styles.thumbSm}><Ionicons name="musical-note" size={16} color={pcColors.textMuted} /></View>
                      <Text style={[styles.listTitle, active && { color: pcColors.primary }]} numberOfLines={1}>{t.title}</Text>
                      {active && playing && <MaterialCommunityIcons name="equalizer" size={18} color={pcColors.primary} />}
                    </Pressable>
                  );
                })}
                {queue.length === 0 && <Empty icon="list" text="Nicio piesă în listă" />}
              </ScrollView>
            )}
            {tab === "SONG" && (
              <View style={{ alignItems: "center", paddingTop: 24 }}>
                <View style={styles.art}><Ionicons name="musical-note" size={80} color={pcColors.textMuted} /></View>
                <Text style={styles.artTitle}>{track?.title || currentSong?.title || "—"}</Text>
                {metro && !!currentSong?.bpm && <Metronome bpm={currentSong.bpm} />}
              </View>
            )}
            {tab === "LYRICS" && (
              lyricsRows.length ? (
                <ScrollView contentContainerStyle={{ padding: 18 }}>
                  {lyricsRows.map((r, i) => r.type === "heading"
                    ? <Text key={i} style={styles.lyrHead}>{r.text}</Text>
                    : r.type === "spacer" ? <View key={i} style={{ height: 10 }} />
                    : r.type === "note" ? <Text key={i} style={styles.lyrNote}>{r.text}</Text>
                    : <Text key={i} style={styles.lyrLine}>{r.segments.map((s) => s.text).join("")}</Text>)}
                </ScrollView>
              ) : <Empty icon="document-text" text="There are no lyrics attached to this song" />
            )}
            {tab === "DOCS" && (
              <ScrollView contentContainerStyle={{ padding: 16 }}>
                {currentSong?.hasChordChart && <DocLine name={`Chord Chart in ${currentSong.keyName || currentSong.originalKey}`} onPress={() => navigation.navigate("PcChartViewer", { songId: currentSong.songId, arrangementId: currentSong.arrangementId, initialDisplayKey: currentSong.keyName })} />}
                {(currentSong?.docs || []).map((f) => <DocLine key={String(f.id)} name={f.name} onPress={() => showInfo("Viewer fișier = felie ulterioară.")} />)}
                {!currentSong?.hasChordChart && (currentSong?.docs || []).length === 0 && <Empty icon="folder" text="There are no files attached to this song" />}
              </ScrollView>
            )}
            {tab === "NOTES" && (
              currentSong?.notes ? <ScrollView contentContainerStyle={{ padding: 18 }}><Text style={styles.lyrLine}>{currentSong.notes}</Text></ScrollView>
              : <Empty icon="chatbox" text="There are no notes attached to this song" />
            )}
          </>
        )}
      </View>

      {/* controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.seekRow}>
          <View style={styles.seekTrack}><View style={[styles.seekFill, { width: `${Math.min(100, seekBar * 100)}%` }]} /><View style={[styles.seekDot, { left: `${Math.min(100, seekBar * 100)}%` }]} /></View>
          <Pressable onPress={() => audio.setLoop(!loop)} hitSlop={8}><Ionicons name="repeat" size={22} color={loop ? pcColors.primary : pcColors.textMuted} /></Pressable>
        </View>
        <View style={styles.timeRow}><Text style={styles.time}>{fmt(position)}</Text><Text style={styles.time}>{fmt(duration)}</Text></View>
        <View style={styles.btnRow}>
          <Pressable onPress={audio.prev} hitSlop={8}><Ionicons name="play-skip-back" size={26} color={pcColors.textPrimary} /></Pressable>
          <Pressable onPress={() => audio.skip(-15)} hitSlop={8}><MaterialCommunityIcons name="rewind-15" size={30} color={pcColors.textPrimary} /></Pressable>
          <Pressable onPress={audio.toggle} style={styles.playBtn}><Ionicons name={playing ? "pause" : "play"} size={30} color={pcColors.textPrimary} /></Pressable>
          <Pressable onPress={() => audio.skip(15)} hitSlop={8}><MaterialCommunityIcons name="fast-forward-15" size={30} color={pcColors.textPrimary} /></Pressable>
          <Pressable onPress={audio.next} hitSlop={8}><Ionicons name="play-skip-forward" size={26} color={pcColors.textPrimary} /></Pressable>
        </View>
        <Pressable onPress={() => setMetro((v) => !v)} style={styles.metroBtn} hitSlop={8}>
          <MaterialCommunityIcons name="metronome" size={24} color={metro ? pcColors.primary : pcColors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

/** Metronom vizual (pulsează la BPM). Click audibil = seam (necesită asset de click). */
function Metronome({ bpm }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const ms = Math.max(200, 60000 / (bpm || 60));
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.5, duration: 90, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: ms - 90, useNativeDriver: true }),
      ]).start();
    }, ms);
    return () => clearInterval(id);
  }, [bpm]); // eslint-disable-line
  return (
    <View style={{ alignItems: "center", marginTop: 24 }}>
      <Animated.View style={[styles.metroDot, { transform: [{ scale }] }]} />
      <Text style={styles.metroTxt}>{bpm} BPM</Text>
    </View>
  );
}
function Empty({ icon, text }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={44} color={pcColors.primary} /></View>
      <Text style={styles.emptyTxt}>{text}</Text>
    </View>
  );
}
function DocLine({ name, onPress }) {
  return (
    <Pressable style={styles.docLine} onPress={onPress}>
      <Ionicons name="document-text-outline" size={20} color={pcColors.primary} />
      <Text style={styles.docName} numberOfLines={1}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0A0A0A" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 8 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: pcColors.divider },
  trackHead: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  thumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: pcColors.input, alignItems: "center", justifyContent: "center" },
  trackTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1 },
  tabs: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  tabBtn: { paddingVertical: 12, alignItems: "center" },
  tabTxt: { color: pcColors.textMuted, fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  tabTxtOn: { color: pcColors.primary },
  tabBar: { height: 2, backgroundColor: pcColors.primary, alignSelf: "stretch", marginTop: 10, borderRadius: 2 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  thumbSm: { width: 36, height: 36, borderRadius: 7, backgroundColor: pcColors.input, alignItems: "center", justifyContent: "center" },
  listTitle: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "600", flex: 1 },
  art: { width: 240, height: 240, borderRadius: 14, backgroundColor: pcColors.card, alignItems: "center", justifyContent: "center" },
  artTitle: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700", marginTop: 20 },
  lyrHead: { color: pcColors.textPrimary, fontWeight: "800", marginTop: 12, letterSpacing: 0.5 },
  lyrLine: { color: pcColors.textPrimary, fontSize: 16, lineHeight: 24 },
  lyrNote: { color: pcColors.textSecondary, fontStyle: "italic" },
  emptyWrap: { alignItems: "center", justifyContent: "center", flex: 1, paddingVertical: 60 },
  emptyIcon: { width: 110, height: 90, borderRadius: 40, backgroundColor: "rgba(134,193,63,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTxt: { color: pcColors.textMuted, fontSize: 16, textAlign: "center", lineHeight: 22 },
  docLine: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  docName: { color: pcColors.textPrimary, fontSize: 15, flex: 1 },
  controls: { paddingHorizontal: 20, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pcColors.divider },
  seekRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  seekTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: pcColors.divider, justifyContent: "center" },
  seekFill: { height: 4, borderRadius: 2, backgroundColor: pcColors.primary },
  seekDot: { position: "absolute", width: 14, height: 14, borderRadius: 7, backgroundColor: pcColors.primary, marginLeft: -7 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  time: { color: pcColors.textMuted, fontSize: 12 },
  btnRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, marginTop: 10 },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: pcColors.card, alignItems: "center", justifyContent: "center" },
  metroBtn: { alignSelf: "center", marginTop: 8 },
  metroDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: pcColors.primary },
  metroTxt: { color: pcColors.textSecondary, fontSize: 13, fontWeight: "700", marginTop: 10 },
});

export default MediaPlayerScreen;
