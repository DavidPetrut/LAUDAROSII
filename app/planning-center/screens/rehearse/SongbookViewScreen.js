/** Songbook view — toate cântecele planului combinate (chord charts / lyrics) la rând, după opțiuni.
 *  ⚠️ Download PDF real = seam (expo-print). Aici = songbook-ul vizibil în app (ca un preview). */
import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showInfo } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { renderChart } from "../songs/chordpro";

export function SongbookViewScreen({ navigation, route }) {
  const { planId, opts = {} } = route.params || {};
  const insets = useSafeAreaInsets();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    pcApi.plans.rehearse(planId).then((d) => on && setSongs(d.songs || [])).catch(() => {}).finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [planId]);

  const wantLyrics = !!opts.lyrics;
  const wantCharts = !!opts.chordCharts;
  const showNothing = !wantLyrics && !wantCharts;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}><Ionicons name="chevron-back" size={26} color={pcColors.primary} /></Pressable>
        <Text style={styles.headerTitle}>Songbook</Text>
        <Pressable onPress={() => showInfo("Export PDF = felie ulterioară (expo-print). Songbook-ul e vizibil aici.")} hitSlop={10}><Ionicons name="download-outline" size={22} color={pcColors.textSecondary} /></Pressable>
      </View>

      {loading ? <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
          {showNothing && <Text style={styles.hint}>Alege „Chord Charts" și/sau „Lyrics" din Songbook pentru conținut.</Text>}
          {songs.map((s, i) => (
            <SongBlock key={String(s.itemId)} song={s} index={i + 1} wantLyrics={wantLyrics} wantCharts={wantCharts} order={!!opts.order} />
          ))}
          {songs.length === 0 && <Text style={styles.hint}>Niciun cântec în plan.</Text>}
        </ScrollView>
      )}
    </View>
  );
}

function SongBlock({ song, index, wantLyrics, wantCharts, order }) {
  const rows = useMemo(() => {
    if (!song.hasChordChart) return [];
    const mode = wantCharts ? "chords" : "lyrics";
    return renderChart(song.chordpro, { originalKey: song.originalKey, displayKey: wantCharts ? (song.keyName || song.originalKey) : null, mode }).rows;
  }, [song, wantCharts]);
  const showChart = wantCharts || wantLyrics;
  return (
    <View style={styles.block}>
      <Text style={styles.songTitle}>{order ? `${index}. ` : ""}{song.title}{song.keyName ? `  [${song.keyName}]` : ""}{song.bpm ? `  ${song.bpm}bpm` : ""}</Text>
      {showChart && (song.hasChordChart ? (
        rows.map((r, i) => {
          if (r.type === "spacer") return <View key={i} style={{ height: 8 }} />;
          if (r.type === "heading") return <Text key={i} style={styles.head}>{r.text}</Text>;
          if (r.type === "note") return <Text key={i} style={styles.note}>{r.text}</Text>;
          const hasCh = r.segments.some((x) => x.chord);
          if (!hasCh) return <Text key={i} style={styles.lyric}>{r.segments.map((x) => x.text).join("")}</Text>;
          return (
            <View key={i} style={styles.line}>
              {r.segments.map((x, j) => (
                <View key={j} style={styles.seg}>
                  <Text style={styles.chord}>{x.chord || " "}</Text>
                  <Text style={styles.lyric}>{x.text || " "}</Text>
                </View>
              ))}
            </View>
          );
        })
      ) : <Text style={styles.noChart}>— fără Lyrics & Chords —</Text>)}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0A0A0A" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  hint: { color: pcColors.textMuted, fontSize: 14, textAlign: "center", marginTop: 30 },
  block: { marginBottom: 26, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider, paddingBottom: 18 },
  songTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "800", marginBottom: 10 },
  head: { color: pcColors.textPrimary, fontWeight: "800", marginTop: 10, letterSpacing: 0.5 },
  note: { color: pcColors.textSecondary, fontStyle: "italic", marginVertical: 2 },
  line: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" },
  seg: { flexDirection: "column", justifyContent: "flex-end" },
  chord: { color: pcColors.primary, fontWeight: "800", fontSize: 15 },
  lyric: { color: pcColors.textPrimary, fontSize: 15 },
  noChart: { color: pcColors.textMuted, fontSize: 13 },
});

export default SongbookViewScreen;
