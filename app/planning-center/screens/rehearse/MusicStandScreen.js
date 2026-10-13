/** Music Stand (cerință user): „play-room" cu toate piesele unite ca un songbook, dar
 *  SWIPE stânga/dreapta = schimbi piesa. Per piesă: chart ChordPro (în cheia piesei) +
 *  metronom (la BPM-ul setat) + redare melodie (player global). All-in-one: lyrics+metronom+melodie. */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Animated, useWindowDimensions, FlatList, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { usePcAudio } from "../../navigation/PcAudioContext";
import { renderChart } from "../songs/chordpro";

export function MusicStandScreen({ navigation, route }) {
  const { planId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const audio = usePcAudio();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let on = true;
    pcApi.plans.rehearse(planId).then((d) => on && setSongs(d.songs || [])).catch(() => {}).finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [planId]);

  const playMelody = (s) => {
    const q = (s.audio || []).map((a) => ({ id: String(a.id), title: a.name || s.title, url: a.url, subtitle: s.keyName }));
    if (q.length) audio.playQueue(q, 0);
  };

  const onScroll = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== idx) setIdx(i);
  };

  if (loading) return <View style={styles.screen}><ActivityIndicator color={pcColors.primary} style={{ marginTop: 60 }} /></View>;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}><Ionicons name="chevron-back" size={26} color={pcColors.primary} /></Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Music Stand</Text>
        <Text style={styles.counter}>{songs.length ? `${idx + 1}/${songs.length}` : ""}</Text>
      </View>

      {songs.length === 0 ? (
        <Text style={styles.empty}>Niciun cântec în plan.</Text>
      ) : (
        <FlatList
          data={songs}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          keyExtractor={(s) => String(s.itemId)}
          renderItem={({ item }) => <StandPage song={item} width={width} onPlay={() => playMelody(item)} />}
        />
      )}
      <Text style={styles.hint}>← swipe pentru a schimba piesa →</Text>
    </View>
  );
}

function StandPage({ song, width, onPlay }) {
  const rows = useMemo(
    () => (song.hasChordChart ? renderChart(song.chordpro, { originalKey: song.originalKey, displayKey: song.keyName || song.originalKey, mode: "chords" }).rows : []),
    [song]
  );
  return (
    <View style={{ width }}>
      <View style={styles.pageHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
          <Text style={styles.songSub}>{[song.keyName, song.bpm ? `${song.bpm} bpm` : null].filter(Boolean).join(" · ")}</Text>
        </View>
        {!!song.bpm && <Metro bpm={song.bpm} />}
        {(song.audio || []).length > 0 && <Pressable onPress={onPlay} hitSlop={8} style={{ marginLeft: 12 }}><Ionicons name="play-circle" size={40} color={pcColors.primary} /></Pressable>}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {rows.length === 0 ? (
          <Text style={styles.noChart}>Niciun chord chart (Lyrics & Chords) pentru acest cântec.</Text>
        ) : rows.map((r, i) => {
          if (r.type === "spacer") return <View key={i} style={{ height: 10 }} />;
          if (r.type === "heading") return <Text key={i} style={styles.head}>{r.text}</Text>;
          if (r.type === "note") return <Text key={i} style={styles.note}>{r.text}</Text>;
          const hasCh = r.segments.some((s) => s.chord);
          if (!hasCh) return <Text key={i} style={styles.lyric}>{r.segments.map((s) => s.text).join("")}</Text>;
          return (
            <View key={i} style={styles.line}>
              {r.segments.map((s, j) => (
                <View key={j} style={styles.seg}>
                  <Text style={styles.chord}>{s.chord || " "}</Text>
                  <Text style={styles.lyric}>{s.text || " "}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Metro({ bpm }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!on) return;
    const ms = Math.max(200, 60000 / (bpm || 60));
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.6, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: ms - 80, useNativeDriver: true }),
      ]).start();
    }, ms);
    return () => clearInterval(id);
  }, [on, bpm]); // eslint-disable-line
  return (
    <Pressable onPress={() => setOn((v) => !v)} style={styles.metro} hitSlop={8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <MaterialCommunityIcons name="metronome" size={24} color={on ? pcColors.primary : pcColors.textMuted} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0A0A0A" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  counter: { color: pcColors.textMuted, fontSize: 13, fontWeight: "700", minWidth: 36, textAlign: "right" },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 40 },
  hint: { color: pcColors.textMuted, fontSize: 12, textAlign: "center", paddingVertical: 6 },
  pageHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  songTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "800" },
  songSub: { color: pcColors.textSecondary, fontSize: 13, marginTop: 2 },
  metro: { padding: 4 },
  noChart: { color: pcColors.textMuted, fontSize: 14, marginTop: 20, textAlign: "center" },
  head: { color: pcColors.textPrimary, fontWeight: "800", marginTop: 12, letterSpacing: 0.5 },
  note: { color: pcColors.textSecondary, fontStyle: "italic", marginVertical: 2 },
  line: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" },
  seg: { flexDirection: "column", justifyContent: "flex-end" },
  chord: { color: pcColors.primary, fontWeight: "800", fontSize: 15 },
  lyric: { color: pcColors.textPrimary, fontSize: 15 },
});

export default MusicStandScreen;
