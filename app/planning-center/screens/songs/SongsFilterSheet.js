/** Filter Songs (din poze: tab-uri Music / Content / Tags). History = seam (schedule data).
 *  Produce un obiect de filtre pentru GET /songs. */
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcBottomSheet, PcButton, PcSegmented, PcSelect, PcChip } from "../../components";

const KEY_OPTS = ["", "Ab", "A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#"].map((k) => ({ value: k, label: k || "Orice" }));
const METER_OPTS = ["", "4/4", "3/4", "6/8", "2/4", "2/2", "12/8", "6/4"].map((m) => ({ value: m, label: m || "Orice" }));
const EMPTY = { startKey: "", meter: "", bpmMin: "", bpmMax: "", author: "", copyright: "", theme: "", songTagIds: [], arrTagIds: [] };

export function SongsFilterSheet({ visible, onClose, initial = {}, onApply }) {
  const [tab, setTab] = useState("music");
  const [f, setF] = useState(EMPTY);
  const [songTags, setSongTags] = useState([]);
  const [arrTags, setArrTags] = useState([]);

  const loadTags = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([pcApi.songs.tags("song"), pcApi.songs.tags("arrangement")]);
      setSongTags(s.groups || []); setArrTags(a.groups || []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (visible) {
      setF({ ...EMPTY, ...initial, songTagIds: (initial.songTagIds || []).map(String), arrTagIds: (initial.arrTagIds || []).map(String) });
      loadTags();
    }
  }, [visible]); // eslint-disable-line

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleTag = (key, id) => setF((s) => ({ ...s, [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : [...s[key], id] }));

  const apply = () => {
    onApply({
      startKey: f.startKey || undefined,
      meter: f.meter || undefined,
      bpmMin: f.bpmMin || undefined,
      bpmMax: f.bpmMax || undefined,
      author: f.author.trim() || undefined,
      copyright: f.copyright.trim() || undefined,
      theme: f.theme.trim() || undefined,
      songTagIds: f.songTagIds.length ? f.songTagIds.join(",") : undefined,
      arrTagIds: f.arrTagIds.length ? f.arrTagIds.join(",") : undefined,
    });
    onClose();
  };
  const clear = () => { setF(EMPTY); onApply({}); onClose(); };

  return (
    <PcBottomSheet visible={visible} onClose={onClose} maxHeightPct={0.85}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <Text style={styles.title}>Filter</Text>
        <PcSegmented
          options={[{ key: "music", label: "Music" }, { key: "content", label: "Content" }, { key: "tags", label: "Tags" }]}
          value={tab} onChange={setTab} style={{ alignSelf: "stretch", marginBottom: 14 }}
        />
        <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
          {tab === "music" && (
            <>
              <Text style={styles.lbl}>Start Key</Text>
              <PcSelect value={f.startKey} options={KEY_OPTS} onChange={(v) => set("startKey", v)} placeholder="Orice" />
              <Text style={styles.lbl}>Meter</Text>
              <PcSelect value={f.meter} options={METER_OPTS} onChange={(v) => set("meter", v)} placeholder="Orice" />
              <Text style={styles.lbl}>BPM</Text>
              <View style={styles.bpmRow}>
                <TextInput style={styles.bpmIn} value={f.bpmMin} onChangeText={(v) => set("bpmMin", v)} placeholder="min" placeholderTextColor={pcColors.textMuted} keyboardType="number-pad" />
                <Text style={styles.dash}>–</Text>
                <TextInput style={styles.bpmIn} value={f.bpmMax} onChangeText={(v) => set("bpmMax", v)} placeholder="max" placeholderTextColor={pcColors.textMuted} keyboardType="number-pad" />
              </View>
            </>
          )}
          {tab === "content" && (
            <>
              <Text style={styles.lbl}>Author</Text>
              <TextInput style={styles.input} value={f.author} onChangeText={(v) => set("author", v)} placeholder="Autor" placeholderTextColor={pcColors.textMuted} />
              <Text style={styles.lbl}>Copyright</Text>
              <TextInput style={styles.input} value={f.copyright} onChangeText={(v) => set("copyright", v)} placeholder="An / copyright" placeholderTextColor={pcColors.textMuted} />
              <Text style={styles.lbl}>Theme</Text>
              <TextInput style={styles.input} value={f.theme} onChangeText={(v) => set("theme", v)} placeholder="Temă" placeholderTextColor={pcColors.textMuted} />
              <Text style={styles.note}>Lyrics / Arrangement Title = seam (necesită editorul Lyrics & Chords).</Text>
            </>
          )}
          {tab === "tags" && (
            <>
              <Text style={styles.lbl}>Song tags</Text>
              {songTags.length === 0 && <Text style={styles.note}>Niciun tag de cântec. Creează din Edit Tags.</Text>}
              {songTags.map((g) => (
                <View key={String(g.id)} style={{ marginBottom: 10 }}>
                  <Text style={styles.grp}>{g.name}</Text>
                  <View style={styles.chips}>
                    {g.tags.map((t) => <PcChip key={String(t.id)} label={t.name} selected={f.songTagIds.includes(String(t.id))} onPress={() => toggleTag("songTagIds", String(t.id))} />)}
                  </View>
                </View>
              ))}
              <Text style={[styles.lbl, { marginTop: 10 }]}>Arrangement tags</Text>
              {arrTags.length === 0 && <Text style={styles.note}>Niciun tag de aranjament.</Text>}
              {arrTags.map((g) => (
                <View key={String(g.id)} style={{ marginBottom: 10 }}>
                  <Text style={styles.grp}>{g.name}</Text>
                  <View style={styles.chips}>
                    {g.tags.map((t) => <PcChip key={String(t.id)} label={t.name} selected={f.arrTagIds.includes(String(t.id))} onPress={() => toggleTag("arrTagIds", String(t.id))} />)}
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
        <View style={styles.actions}>
          <PcButton title="Resetează" variant="outline" onPress={clear} style={{ flex: 1 }} />
          <PcButton title="Aplică" onPress={apply} style={{ flex: 1 }} />
        </View>
      </View>
    </PcBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  lbl: { color: pcColors.textSecondary, fontSize: 13, marginTop: 12, marginBottom: 6 },
  input: { color: pcColors.textPrimary, fontSize: 16, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 46 },
  bpmRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bpmIn: { flex: 1, color: pcColors.textPrimary, fontSize: 16, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 46, textAlign: "center" },
  dash: { color: pcColors.textMuted, fontSize: 18 },
  note: { color: pcColors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 17 },
  grp: { color: pcColors.primary, fontSize: 13, fontWeight: "700", marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
});

export default SongsFilterSheet;
