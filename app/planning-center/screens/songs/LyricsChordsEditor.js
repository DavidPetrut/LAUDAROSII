/** Lyrics & Chords editor (ChordPro) — editor + preview live transpozabil (pur JS, motor chordpro.js).
 *  Editează (stânga/Edit) ChordPro, previzualizează (dreapta/Preview) în orice cheie / Numbers / Numerals / Lyrics.
 *  readOnly=true → mod VIEWER (team pe plan): doar preview + transpune + download (PDF = seam).
 *  ⚠️ Export PDF real = seam (necesită expo-print/motor PDF). Aici randăm chartul în app. */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess, showInfo } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcIconButton, PcBottomSheet, PcButton, PcSegmented, PcSelect } from "../../components";
import { KeyPicker } from "./KeyPicker";
import { renderChart, PREVIEW_MODES } from "./chordpro";

const CHORD_COLORS = { Green: pcColors.primary, White: pcColors.textPrimary, Orange: pcColors.orange, Blue: "#4F9CF9" };
const FONT_SIZES = [12, 14, 15, 16, 18, 20];
const PLACEHOLDER = `VERSE 1\n[D]Who am I that the highest [Bm]King would wel-[A]come [G]me\n\nCHORUS 1\nWho the [D]Son sets free oh is [A]free indeed`;

export function LyricsChordsEditor({ navigation, route }) {
  const { songId, arrangementId, readOnly = false, initialDisplayKey = null } = route.params || {};
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState("");
  const [originalKey, setOriginalKey] = useState("D");
  const [formatting, setFormatting] = useState({ columns: 1, chordColor: "Green", fontSize: 15 });
  const [pane, setPane] = useState(readOnly ? "preview" : "edit");
  const [previewSel, setPreviewSel] = useState("__orig__");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [liveText, setLiveText] = useState(""); // folosit în preview; se sincronizează doar când autoRefresh
  const [origKeyPicker, setOrigKeyPicker] = useState(false);
  const [fmtOpen, setFmtOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await pcApi.songs.getChordChart(songId, arrangementId);
      setText(d.chordpro || ""); setLiveText(d.chordpro || "");
      setOriginalKey(d.originalKey || "D");
      setFormatting({ columns: 1, chordColor: "Green", fontSize: 15, ...(d.formatting || {}) });
      if (initialDisplayKey) { setPreviewSel(initialDisplayKey); }
    } catch (e) { showError(e?.message || "Eroare la chart."); }
    finally { setLoading(false); }
  }, [songId, arrangementId, initialDisplayKey]);
  useEffect(() => { load(); }, [load]);

  // sincronizează preview-ul cu textul când autoRefresh e on
  useEffect(() => { if (autoRefresh) setLiveText(text); }, [text, autoRefresh]);

  const mode = useMemo(() => PREVIEW_MODES.find((m) => m.key === previewSel) || PREVIEW_MODES[0], [previewSel]);
  const chart = useMemo(
    () => renderChart(liveText, { originalKey, displayKey: mode.display, mode: mode.mode }),
    [liveText, originalKey, mode]
  );
  const chordColor = CHORD_COLORS[formatting.chordColor] || pcColors.primary;
  const fontSize = formatting.fontSize || 15;

  const save = async () => {
    setSaving(true);
    try {
      await pcApi.songs.saveChordChart(songId, arrangementId, { chordpro: text, originalKey, formatting });
      showSuccess("Salvat. Charturile în fiecare cheie se generează automat.");
      navigation.goBack();
    } catch (e) { showError(e?.message || "Nu s-a salvat."); }
    finally { setSaving(false); }
  };

  const titleKey = mode.mode === "numbers" ? "Numbers" : mode.mode === "numerals" ? "Numerals" : mode.mode === "lyrics" ? "Lyrics" : (mode.display || originalKey);

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <PcIconButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Lyrics & Chords</Text>
        {readOnly ? (
          <PcIconButton icon="download-outline" onPress={() => showInfo("Export PDF = felie ulterioară (expo-print). Chartul e vizibil aici, transpozabil.")} />
        ) : (
          <Pressable onPress={save} hitSlop={10} disabled={saving}>
            {saving ? <ActivityIndicator color={pcColors.primary} /> : <Text style={styles.save}>Save</Text>}
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Bara de control */}
          <View style={styles.controls}>
            {!readOnly && (
              <PcSegmented options={[{ key: "edit", label: "Editor" }, { key: "preview", label: "Preview" }]} value={pane} onChange={setPane} style={{ marginBottom: 10 }} />
            )}
            <View style={styles.ctrlRow}>
              {!readOnly && (
                <Pressable style={styles.ctrlChip} onPress={() => setOrigKeyPicker(true)}>
                  <Text style={styles.ctrlLbl}>Original</Text>
                  <Text style={styles.ctrlVal}>{originalKey}</Text>
                  <Ionicons name="chevron-down" size={14} color={pcColors.textMuted} />
                </Pressable>
              )}
              <View style={{ flex: 1 }}>
                <PcSelect
                  value={previewSel}
                  options={PREVIEW_MODES.map((m) => ({ value: m.key, label: m.label }))}
                  onChange={setPreviewSel}
                  compact
                />
              </View>
              {!readOnly && pane === "edit" && (
                <Pressable style={[styles.ctrlChip, autoRefresh && styles.ctrlChipOn]} onPress={() => setAutoRefresh((v) => !v)}>
                  <Ionicons name={autoRefresh ? "sync" : "sync-outline"} size={16} color={autoRefresh ? pcColors.primary : pcColors.textMuted} />
                  <Text style={[styles.ctrlLbl, autoRefresh && { color: pcColors.primary }]}>Auto</Text>
                </Pressable>
              )}
              {!readOnly && <PcIconButton icon="options-outline" size={22} color={pcColors.textSecondary} onPress={() => setFmtOpen(true)} />}
            </View>
          </View>

          {pane === "edit" && !readOnly ? (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.hint}>ChordPro: pune acordurile în [paranteze pătrate] la stânga silabei. Titlurile de secțiune = MAJUSCULE. {"{nota}"} / {"{{doar chart}}"}.</Text>
              <TextInput
                style={styles.editor}
                value={text}
                onChangeText={setText}
                multiline
                placeholder={PLACEHOLDER}
                placeholderTextColor={pcColors.textMuted}
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {!autoRefresh && <PcButton title="Refresh preview" variant="outline" onPress={() => { setLiveText(text); setPane("preview"); }} style={{ marginTop: 12 }} />}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
              <View style={styles.chartTitleBox}>
                <Text style={styles.chartTitle}>[{titleKey}]</Text>
                <Text style={styles.chartSub}>previzualizare transpusă din {originalKey}</Text>
              </View>
              <ChartBody chart={chart} chordColor={chordColor} fontSize={fontSize} />
              {chart.rows.length === 0 && <Text style={styles.empty}>Scrie ChordPro în Editor ca să vezi chartul.</Text>}
            </ScrollView>
          )}
        </>
      )}

      <KeyPicker visible={origKeyPicker} onClose={() => setOrigKeyPicker(false)} onPick={setOriginalKey} title="Original Key" />

      <PcBottomSheet visible={fmtOpen} onClose={() => setFmtOpen(false)} maxHeightPct={0.6}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <Text style={styles.sheetTitle}>Formatting</Text>
          <Text style={styles.fmtLbl}>Chord color</Text>
          <View style={styles.fmtRow}>
            {Object.keys(CHORD_COLORS).map((c) => (
              <Pressable key={c} style={[styles.colorChip, { borderColor: CHORD_COLORS[c] }, formatting.chordColor === c && { backgroundColor: "rgba(134,193,63,0.12)" }]} onPress={() => setFormatting((f) => ({ ...f, chordColor: c }))}>
                <View style={[styles.colorDot, { backgroundColor: CHORD_COLORS[c] }]} />
                <Text style={styles.colorTxt}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.fmtLbl}>Font size</Text>
          <View style={styles.fmtRow}>
            {FONT_SIZES.map((s) => (
              <Pressable key={s} style={[styles.sizeChip, formatting.fontSize === s && styles.sizeChipOn]} onPress={() => setFormatting((f) => ({ ...f, fontSize: s }))}>
                <Text style={[styles.sizeTxt, formatting.fontSize === s && { color: pcColors.primary }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.fmtLbl}>Columns (se aplică la PDF)</Text>
          <PcSegmented options={[{ key: 1, label: "1" }, { key: 2, label: "2" }]} value={formatting.columns} onChange={(v) => setFormatting((f) => ({ ...f, columns: v }))} style={{ alignSelf: "flex-start" }} />
        </View>
      </PcBottomSheet>
    </PcScreen>
  );
}

/** Randează rândurile chartului (chords deasupra silabelor / headings / note). */
function ChartBody({ chart, chordColor, fontSize }) {
  return (
    <View>
      {chart.rows.map((r, i) => {
        if (r.type === "spacer") return <View key={i} style={{ height: fontSize * 0.7 }} />;
        if (r.type === "heading") return <Text key={i} style={[styles.heading, { fontSize: fontSize + 1 }]}>{r.text}</Text>;
        if (r.type === "break") return <Text key={i} style={styles.breakTxt}>— {r.mode === "PAGE_BREAK" ? "page break" : "column break"} —</Text>;
        if (r.type === "note") return <Text key={i} style={[styles.note, { fontSize }]}>{r.text}</Text>;
        // line
        const hasChords = r.segments.some((s) => s.chord);
        if (!hasChords) return <Text key={i} style={[styles.lyric, { fontSize }]}>{r.segments.map((s) => s.text).join("")}</Text>;
        return (
          <View key={i} style={styles.lineRow}>
            {r.segments.map((s, j) => (
              <View key={j} style={styles.seg}>
                <Text style={[styles.chord, { color: chordColor, fontSize }]}>{s.chord || " "}</Text>
                <Text style={[styles.lyric, { fontSize }]}>{s.text || " "}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  save: { color: pcColors.primary, fontSize: 16, fontWeight: "700", paddingHorizontal: 8 },
  controls: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: pcColors.bgHeader, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  ctrlRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ctrlChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 8, paddingHorizontal: 10, height: 40 },
  ctrlChipOn: { borderColor: pcColors.primary, backgroundColor: "rgba(134,193,63,0.12)" },
  ctrlLbl: { color: pcColors.textSecondary, fontSize: 12, fontWeight: "700" },
  ctrlVal: { color: pcColors.textPrimary, fontSize: 14, fontWeight: "800" },
  hint: { color: pcColors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  editor: { color: pcColors.textPrimary, fontSize: 15, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, padding: 12, minHeight: 320, fontFamily: undefined, lineHeight: 22 },
  chartTitleBox: { backgroundColor: pcColors.card, borderRadius: 10, padding: 12, marginBottom: 14 },
  chartTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "800" },
  chartSub: { color: pcColors.textMuted, fontSize: 12, marginTop: 2 },
  heading: { color: pcColors.textPrimary, fontWeight: "800", marginTop: 12, marginBottom: 2, letterSpacing: 0.5 },
  breakTxt: { color: pcColors.textMuted, fontSize: 12, fontStyle: "italic", marginVertical: 6 },
  note: { color: pcColors.textSecondary, fontStyle: "italic", marginVertical: 2 },
  lineRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" },
  seg: { flexDirection: "column", justifyContent: "flex-end" },
  chord: { fontWeight: "800" },
  lyric: { color: pcColors.textPrimary },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 30 },
  sheetTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  fmtLbl: { color: pcColors.textSecondary, fontSize: 13, marginTop: 14, marginBottom: 8 },
  fmtRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  colorTxt: { color: pcColors.textPrimary, fontSize: 13, fontWeight: "600" },
  sizeChip: { borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  sizeChipOn: { borderColor: pcColors.primary, backgroundColor: "rgba(134,193,63,0.12)" },
  sizeTxt: { color: pcColors.textPrimary, fontSize: 14, fontWeight: "700" },
});

export default LyricsChordsEditor;
