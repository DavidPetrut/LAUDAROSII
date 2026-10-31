/** Rehearse (tab plan) — 2 moduri:
 *  „Producție" = Order-ul Producției (overlay ONE-WAY peste Order: structură + gamă + cine cântă + lumini).
 *                Curat, pentru producători/sunet/lumini. Citește din Order, NU-l modifică.
 *  „Cântece"   = lista cântecelor + Media Player / Songbook / Music Stand (practică).
 *  Editarea de producție se face pe laptop (web); pe mobil = vizualizare (cum preferă echipa). */
import React, { useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { showError, showInfo } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { usePcAudio } from "../../navigation/PcAudioContext";
import { SongbookSheet } from "./SongbookSheet";

const VOICE_LBL = { lead: "", support: "S", alto: "A", tenor: "T", soprano: "Sop", bass: "B", custom: "" };
const TRANS_LBL = { direct: "Tranziție directă", prayer: "Tranziție rugăciune", word: "Tranziție prin cuvânt" };

export function RehearseTab({ planId, navigation }) {
  const [mode, setMode] = useState("prod"); // „prod" (Order producție) | „songs" (cântece)
  const [songs, setSongs] = useState([]);
  const [prod, setProd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // itemId expandat (mod „songs")
  const [songbook, setSongbook] = useState(false);
  const { playQueue } = usePcAudio();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        pcApi.plans.production(planId).catch(() => ({ items: [] })),
        pcApi.plans.rehearse(planId).catch(() => ({ songs: [] })),
      ]);
      setProd(p); setSongs(r.songs || []);
    } catch (e) { showError(e?.message || "Eroare la Rehearse."); }
    finally { setLoading(false); }
  }, [planId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

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
      {/* Toggle mod */}
      <View style={styles.seg}>
        <Pressable style={[styles.segBtn, mode === "prod" && styles.segOn]} onPress={() => setMode("prod")}>
          <Text style={[styles.segTxt, mode === "prod" && styles.segTxtOn]}>Producție</Text>
        </Pressable>
        <Pressable style={[styles.segBtn, mode === "songs" && styles.segOn]} onPress={() => setMode("songs")}>
          <Text style={[styles.segTxt, mode === "songs" && styles.segTxtOn]}>Cântece</Text>
        </Pressable>
      </View>

      {mode === "songs" && (
        <View style={styles.actions}>
          <ActionBtn icon="volume-high-outline" label="Media Player" onPress={openMediaPlayer} />
          <ActionBtn icon="musical-notes-outline" label="Songbook" onPress={() => setSongbook(true)} />
          <ActionBtn icon="easel-outline" label="Music Stand" onPress={() => navigation.navigate("PcMusicStand", { planId })} />
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : mode === "prod" ? (
        <ProductionOrder data={prod} />
      ) : songs.length === 0 ? (
        <Text style={styles.empty}>Niciun cântec în acest plan.</Text>
      ) : (
        <ScrollView style={{ paddingHorizontal: 16 }}>
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
        </ScrollView>
      )}

      <SongbookSheet visible={songbook} onClose={() => setSongbook(false)} planId={planId} songs={songs} navigation={navigation} />
    </View>
  );
}

/* Order-ul Producției — curat: structură + gamă + cine cântă + lumini. Vizualizare (editare pe web). */
function ProductionOrder({ data }) {
  const rows = (data && data.items) || [];
  if (rows.length === 0) return <Text style={styles.empty}>Order gol. Structura vine din tab-ul „Order".</Text>;
  return (
    <ScrollView style={{ paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 24 }}>
      {rows.map((r) => {
        if (r.type === "header") return <Text key={String(r.id)} style={styles.prodSec}>{r.title}</Text>;
        if (r.type === "transition") {
          const t = r.transition || {};
          return (
            <View key={String(r.id)} style={styles.prodTrans}>
              <Ionicons name="return-down-forward-outline" size={14} color={pcColors.textMuted} />
              <Text style={styles.ptLbl}>{TRANS_LBL[t.kind] || "Tranziție"}</Text>
              {!!t.key && <View style={styles.ptKey}><Text style={styles.ptKeyTxt}>{t.key}{t.autoKey ? "·auto" : ""}</Text></View>}
              {!!(t.prayer && t.prayer.name) && <Text style={styles.ptWho}>{t.prayer.name}</Text>}
              {(t.lights || []).map((l, i) => <View key={i} style={[styles.dot, { backgroundColor: l.color || "#888" }]} />)}
            </View>
          );
        }
        const voices = r.voices || [];
        const lead = voices.find((v) => v.role === "lead") || voices[0];
        const parts = voices.filter((v) => v !== lead).map((v) => `${VOICE_LBL[v.role] ? VOICE_LBL[v.role] + ": " : ""}${String(v.name || "").split(" ")[0]}`);
        const fx = r.fixtures || [];
        const cueCount = (r.sectionCues || []).filter((c) => (c.lights || []).length || c.note).length;
        return (
          <View key={String(r.id)} style={styles.prodRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.prTitle} numberOfLines={1}>{r.title}</Text>
              {(lead || parts.length > 0) && (
                <Text style={styles.prVoices} numberOfLines={1}>
                  {lead ? lead.name : ""}{parts.length > 0 ? `  ·  ${parts.join(" · ")}` : ""}
                </Text>
              )}
              {!!(r.scene || fx.length || cueCount) && (
                <View style={styles.prLights}>
                  {!!r.scene && <Text style={styles.prScene}>{r.scene.name}</Text>}
                  {fx.map((f, i) => <View key={i} style={[styles.dot, { backgroundColor: f.color || "#888" }]} />)}
                  {cueCount > 0 && <Text style={styles.prCue}>✦{cueCount}</Text>}
                </View>
              )}
            </View>
            <View style={styles.prSide}>
              {!!r.keyName && <View style={styles.prKey}><Text style={styles.prKeyTxt}>{r.keyName}</Text></View>}
            </View>
          </View>
        );
      })}
    </ScrollView>
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
  seg: { flexDirection: "row", gap: 6, marginHorizontal: 16, marginTop: 12, backgroundColor: pcColors.card, borderRadius: 10, padding: 4 },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  segOn: { backgroundColor: pcColors.primary },
  segTxt: { color: pcColors.textSecondary, fontSize: 13, fontWeight: "700" },
  segTxtOn: { color: "#fff" },
  actions: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12, flexWrap: "wrap" },
  actBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  actTxt: { color: pcColors.textPrimary, fontSize: 13, fontWeight: "700" },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 40 },
  // Order producție
  prodSec: { color: pcColors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", marginTop: 16, marginBottom: 6 },
  prodRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: pcColors.card, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 6 },
  prTitle: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "700" },
  prVoices: { color: pcColors.textSecondary, fontSize: 12.5, marginTop: 2 },
  prLights: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5, flexWrap: "wrap" },
  prScene: { color: pcColors.textSecondary, fontSize: 11, fontWeight: "600" },
  prCue: { color: pcColors.textMuted, fontSize: 10.5 },
  prSide: { flexDirection: "row", alignItems: "center", gap: 6 },
  prKey: { borderWidth: 1, borderColor: pcColors.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 1 },
  prKeyTxt: { color: pcColors.primary, fontSize: 12, fontWeight: "800" },
  dot: { width: 11, height: 11, borderRadius: 6 },
  prodTrans: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 4, paddingLeft: 18 },
  ptLbl: { color: pcColors.textSecondary, fontSize: 12, fontStyle: "italic" },
  ptKey: { borderWidth: 1, borderColor: pcColors.primary, borderRadius: 4, paddingHorizontal: 5 },
  ptKeyTxt: { color: pcColors.primary, fontSize: 11, fontWeight: "800" },
  ptWho: { color: pcColors.textMuted, fontSize: 11.5 },
  // Cântece (existent)
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
