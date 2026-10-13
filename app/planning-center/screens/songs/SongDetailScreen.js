/** Song detail — titlu/CCLI/autor/© + lista de aranjamente. Tap aranjament → ArrangementScreen. */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcIconButton, PcCard, PcListRow, PcSectionTitle, PcBottomSheet, PcButton, PcChip } from "../../components";
import { usePc } from "../../navigation/PcContext";
import { TagPickerSheet } from "./TagPickerSheet";

export function SongDetailScreen({ navigation, route }) {
  const { songId } = route.params;
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const canEdit = !!me?.capabilities?.songsEdit;
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [startKey, setStartKey] = useState("");
  const [importMt, setImportMt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagSheet, setTagSheet] = useState(false);
  const [tagNames, setTagNames] = useState({}); // id -> name (pt. afișare chips)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, cat] = await Promise.all([pcApi.songs.get(songId), pcApi.songs.tags("song").catch(() => ({ groups: [] }))]);
      setSong(s);
      const map = {}; (cat.groups || []).forEach((g) => g.tags.forEach((t) => { map[String(t.id)] = t.name; }));
      setTagNames(map);
    } catch (e) { showError(e?.message || "Eroare la cântec."); }
    finally { setLoading(false); }
  }, [songId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveTags = async (ids) => { await pcApi.songs.setSongTags(songId, ids); await load(); };

  const addArrangement = async () => {
    if (!name.trim()) return showError("Scrie un nume de aranjament.");
    setSaving(true);
    try {
      const r = await pcApi.songs.addArrangement(songId, { name: name.trim(), startKey: startKey || undefined, importMultitracks: importMt });
      setAddOpen(false); setName(""); setStartKey(""); setImportMt(false);
      navigation.navigate("PcArrangement", { songId, arrangementId: r.id });
    } catch (e) { showError(e?.message || "Nu s-a putut adăuga."); }
    finally { setSaving(false); }
  };

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <PcIconButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle} numberOfLines={1}>{song?.title || "Song"}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading || !song ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <Text style={styles.title}>{song.title}</Text>
          {!!song.author && <Text style={styles.meta}>{song.author}</Text>}
          <View style={styles.metaRow}>
            {!!song.ccli && <Text style={styles.metaMuted}>CCLI #{song.ccli}</Text>}
            {!!song.copyrightYear && <Text style={styles.metaMuted}>© {song.copyrightYear}</Text>}
          </View>

          <PcSectionTitle style={{ marginTop: 22 }}>Arrangements</PcSectionTitle>
          <PcCard noPad>
            {(song.arrangements || []).map((a) => (
              <PcListRow
                key={String(a.id)}
                title={a.name}
                sub={[a.lengthLabel, a.bpm ? `${a.bpm} BPM` : null, a.meter].filter(Boolean).join(" · ")}
                onPress={() => navigation.navigate("PcArrangement", { songId, arrangementId: a.id })}
              />
            ))}
            {(song.arrangements || []).length === 0 && <Text style={styles.empty}>Niciun aranjament încă.</Text>}
          </PcCard>

          {canEdit && (
            <Pressable style={styles.addRow} onPress={() => setAddOpen(true)}>
              <Ionicons name="add-circle-outline" size={22} color={pcColors.primary} />
              <Text style={styles.addTxt}>Add Arrangement</Text>
            </Pressable>
          )}

          <View style={styles.tagsHead}>
            <PcSectionTitle style={{ marginTop: 10, marginBottom: 0 }}>Tags</PcSectionTitle>
            {canEdit && <Pressable onPress={() => setTagSheet(true)} hitSlop={8}><Text style={styles.addTxtSm}>Add</Text></Pressable>}
          </View>
          <View style={styles.tagWrap}>
            {(song.tagIds || []).map((id) => <PcChip key={String(id)} label={tagNames[String(id)] || "…"} />)}
            {(song.tagIds || []).length === 0 && <Text style={styles.metaMuted}>Niciun tag de cântec.</Text>}
          </View>
        </ScrollView>
      )}

      <TagPickerSheet visible={tagSheet} onClose={() => setTagSheet(false)} domain="song" selectedIds={song?.tagIds || []} onSave={saveTags} />

      <PcBottomSheet visible={addOpen} onClose={() => setAddOpen(false)} maxHeightPct={0.55}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={styles.sheetTitle}>Add Arrangement</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nume aranjament (ex. Default Arrangement)" placeholderTextColor={pcColors.textMuted} />
          <Text style={styles.lbl}>Cheie inițială (opțional)</Text>
          <KeyRow value={startKey} onChange={setStartKey} />
          <Pressable style={styles.mtRow} onPress={() => setImportMt((v) => !v)}>
            <Ionicons name={importMt ? "checkbox" : "square-outline"} size={22} color={importMt ? pcColors.primary : pcColors.textMuted} />
            <Text style={styles.mtTxt}>Importă din MultiTracks (chord chart)</Text>
          </Pressable>
          <PcButton title="Adaugă" onPress={addArrangement} loading={saving} block style={{ marginTop: 14 }} />
        </View>
      </PcBottomSheet>
    </PcScreen>
  );
}

/** Mic rând cu KeyPicker embedabil (evităm stacking de sheet-uri: deschidem picker peste). */
import { KeyPicker } from "./KeyPicker";
function KeyRow({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={styles.keyRow} onPress={() => setOpen(true)}>
        <Text style={styles.keyRowTxt}>{value || "Atinge pentru a alege cheia"}</Text>
        <Ionicons name="chevron-forward" size={18} color={pcColors.textMuted} />
      </Pressable>
      <KeyPicker visible={open} onClose={() => setOpen(false)} onPick={onChange} />
    </>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  title: { color: pcColors.textPrimary, fontSize: 24, fontWeight: "700" },
  meta: { color: pcColors.textSecondary, fontSize: 15, marginTop: 4 },
  metaRow: { flexDirection: "row", gap: 14, marginTop: 6 },
  metaMuted: { color: pcColors.textMuted, fontSize: 13 },
  empty: { color: pcColors.textMuted, padding: 16, fontSize: 14 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 16 },
  addTxt: { color: pcColors.primary, fontSize: 16, fontWeight: "600" },
  addTxtSm: { color: pcColors.primary, fontSize: 14, fontWeight: "700" },
  tagsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingRight: 16 },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginTop: 10 },
  sheetTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  input: { color: pcColors.textPrimary, fontSize: 17, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 48 },
  lbl: { color: pcColors.textSecondary, fontSize: 13, marginTop: 14, marginBottom: 6 },
  keyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 48 },
  keyRowTxt: { color: pcColors.textPrimary, fontSize: 16 },
  mtRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  mtTxt: { color: pcColors.textPrimary, fontSize: 15 },
});

export default SongDetailScreen;
