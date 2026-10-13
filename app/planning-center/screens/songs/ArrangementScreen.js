/** Arrangement — Length/BPM/Meter/Sequence + fișiere aranjament + lista de chei (fiecare cu fișiere).
 *  Add/Edit Key (focusul userului): KeyPicker start+end + import MultiTracks (chord chart).
 *  Upload de pe device + ChordPro editor + transpunere audio = seam (felie ulterioară). */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showConfirm, showInfo, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pickAndUploadFile } from "../../api/upload";
import { pcColors } from "../../theme";
import { PcScreen, PcIconButton, PcCard, PcSectionTitle, PcBottomSheet, PcButton, PcChip } from "../../components";
import { usePc } from "../../navigation/PcContext";
import { KeyPicker } from "./KeyPicker";
import { TagPickerSheet } from "./TagPickerSheet";
import { TransposeAudioSheet } from "./TransposeAudioSheet";

const FILE_ICON = { chordChart: "document-text-outline", lyrics: "text-outline", audio: "musical-notes-outline", link: "link-outline", pdf: "document-outline" };

export function ArrangementScreen({ navigation, route }) {
  const { songId, arrangementId } = route.params;
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const canEdit = !!me?.capabilities?.songsEdit;
  const [arr, setArr] = useState(null);
  const [loading, setLoading] = useState(true);

  // Add/Edit Key sheet
  const [keySheet, setKeySheet] = useState(false);
  const [editingKey, setEditingKey] = useState(null); // null = add
  const [startKey, setStartKey] = useState("");
  const [endKey, setEndKey] = useState("");
  const [description, setDescription] = useState("");
  const [importMt, setImportMt] = useState(false);
  const [pickStart, setPickStart] = useState(false);
  const [pickEnd, setPickEnd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagSheet, setTagSheet] = useState(false);
  const [tagNames, setTagNames] = useState({});
  const [transposeOpen, setTransposeOpen] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null); // keyId sau "arr" în timpul upload-ului

  // Upload fișier de pe device → Cloudinary → atașează la aranjament sau la o cheie.
  const addFile = async (keyId) => {
    setUploadingKey(keyId || "arr");
    try {
      const r = await pickAndUploadFile({ type: "*/*" });
      if (!r?.url) return;
      const fmt = String(r.format || "").toLowerCase();
      const kind = ["mp3", "m4a", "aac", "wav"].includes(fmt) ? "audio" : fmt === "pdf" ? "pdf" : r.resourceType === "image" ? "image" : "file";
      await pcApi.songs.addFile(songId, arrangementId, { name: r.name || "Fișier", url: r.url, kind, source: "upload", keyId: keyId || undefined });
      showSuccess("Fișier adăugat.");
      await load();
    } catch (e) { showError(e?.message || "Eroare la upload."); }
    finally { setUploadingKey(null); }
  };

  // Deschide un fișier: chart ChordPro derivat → viewer transpozabil în acea cheie; altfel info.
  const openFile = (f) => {
    if (f.derived && f.source === "chordpro") {
      navigation.navigate(canEdit ? "PcLyricsChords" : "PcChartViewer", { songId, arrangementId, initialDisplayKey: f.displayKey });
      return;
    }
    if (f.pending || f.transposeStatus === "pending") return showInfo("Fișier în așteptare (transpunere/MultiTracks) — se activează când DSP/accesul e gata (seam).");
    if (!f.url) return showInfo("Fișier fără conținut încă.");
    showInfo("Deschiderea/redarea fișierelor = felie ulterioară (viewer/player).");
  };

  // Fișiere audio de pe aranjament (pt. Transpose Audio).
  const audioFiles = React.useMemo(() => {
    if (!arr) return [];
    const out = [...(arr.arrangementFiles || [])];
    (arr.keys || []).forEach((k) => (k.files || []).forEach((f) => out.push(f)));
    return out.filter((f) => f.kind === "audio" && !f.derived);
  }, [arr]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, cat] = await Promise.all([pcApi.songs.arrangement(songId, arrangementId), pcApi.songs.tags("arrangement").catch(() => ({ groups: [] }))]);
      setArr(a);
      const map = {}; (cat.groups || []).forEach((g) => g.tags.forEach((t) => { map[String(t.id)] = t.name; }));
      setTagNames(map);
    } catch (e) { showError(e?.message || "Eroare la aranjament."); }
    finally { setLoading(false); }
  }, [songId, arrangementId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveTags = async (ids) => { await pcApi.songs.setArrangementTags(songId, arrangementId, ids); await load(); };

  const openAddKey = () => { setEditingKey(null); setStartKey(""); setEndKey(""); setDescription(""); setImportMt(false); setKeySheet(true); };
  const openEditKey = (k) => { setEditingKey(k); setStartKey(k.startKey); setEndKey(k.endKey && k.endKey !== "Same" ? k.endKey : ""); setDescription(k.description || ""); setImportMt(false); setKeySheet(true); };

  const saveKey = async () => {
    if (!startKey) return showError("Alege cheia de start.");
    setSaving(true);
    try {
      if (editingKey) {
        await pcApi.songs.updateKey(songId, arrangementId, editingKey.id, { startKey, endKey, description });
      } else {
        await pcApi.songs.addKey(songId, arrangementId, { startKey, endKey, description, importMultitracks: importMt });
      }
      setKeySheet(false);
      await load();
    } catch (e) { showError(e?.message || "Nu s-a putut salva cheia."); }
    finally { setSaving(false); }
  };

  const deleteKey = (k) => showConfirm("Ștergi cheia?", `${k.label} și fișierele ei vor fi șterse.`, async () => {
    try { await pcApi.songs.deleteKey(songId, arrangementId, k.id); await load(); }
    catch (e) { showError(e?.message || "Eroare la ștergere."); }
  });

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <PcIconButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle} numberOfLines={1}>{arr?.name || "Arrangement"}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading || !arr ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
          <View style={styles.statsRow}>
            <Stat label="Length" value={arr.lengthLabel || "0:00"} />
            <Stat label="BPM" value={arr.bpm ? String(arr.bpm) : "—"} />
            <Stat label="Meter" value={arr.meter || "—"} />
          </View>

          <View style={styles.keysHead}>
            <PcSectionTitle style={{ marginTop: 20, marginBottom: 0 }}>Sequence</PcSectionTitle>
            {canEdit && (
              <Pressable style={styles.addKeyBtn} onPress={() => navigation.navigate("PcSequenceEditor", { mode: "arrangement", songId, arrangementId })} hitSlop={8}>
                <Ionicons name={arr.sequence && arr.sequence.length ? "create-outline" : "add"} size={18} color={pcColors.primary} />
                <Text style={styles.addKeyTxt}>{arr.sequence && arr.sequence.length ? "Edit" : "Create"}</Text>
              </Pressable>
            )}
          </View>
          {arr.sequence && arr.sequence.length > 0 ? (
            <View style={styles.seqWrap}>
              {arr.sequence.map((s, i) => <View key={i} style={styles.seqChip}><Text style={styles.seqTxt}>{i + 1}. {s}</Text></View>)}
            </View>
          ) : (
            <Text style={styles.noFiles}>Nicio secvență. {canEdit ? "Apasă Create." : ""}</Text>
          )}

          <View style={styles.keysHead}>
            <PcSectionTitle style={{ marginTop: 20, marginBottom: 0 }}>Files</PcSectionTitle>
            {canEdit && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 20 }}>
                {uploadingKey === "arr" ? <ActivityIndicator color={pcColors.primary} size="small" style={{ marginRight: 14 }} /> : <PcIconButton icon="add" size={22} color={pcColors.primary} onPress={() => addFile(null)} style={{ marginRight: 12 }} />}
                <PcIconButton icon="musical-note" size={20} color={pcColors.textSecondary} onPress={() => setTransposeOpen(true)} style={{ marginRight: 14 }} />
                <Pressable style={styles.lcBtn} onPress={() => navigation.navigate("PcLyricsChords", { songId, arrangementId })}>
                  <Text style={styles.lcTxt}>Lyrics & Chords</Text>
                </Pressable>
              </View>
            )}
          </View>
          {arr.chordChart?.exists && (
            <Pressable style={styles.masterChart} onPress={() => navigation.navigate(canEdit ? "PcLyricsChords" : "PcChartViewer", { songId, arrangementId })}>
              <Ionicons name="document-text" size={18} color={pcColors.primary} />
              <Text style={styles.masterTxt}>Lyrics & Chords (în {arr.chordChart.originalKey || "—"}) — generează charturi în fiecare cheie</Text>
            </Pressable>
          )}
          {(arr.arrangementFiles || []).length > 0 && (
            <PcCard noPad style={{ marginTop: 10 }}>{arr.arrangementFiles.map((f) => <FileRow key={String(f.id)} f={f} onOpen={openFile} />)}</PcCard>
          )}

          <View style={styles.keysHead}>
            <PcSectionTitle style={{ marginTop: 20, marginBottom: 0 }}>Keys</PcSectionTitle>
            {canEdit && (
              <Pressable style={styles.addKeyBtn} onPress={openAddKey} hitSlop={8}>
                <Ionicons name="add" size={18} color={pcColors.primary} />
                <Text style={styles.addKeyTxt}>Add Key</Text>
              </Pressable>
            )}
          </View>

          {(arr.keys || []).map((k) => (
            <PcCard key={String(k.id)} style={{ marginBottom: 10 }}>
              <View style={styles.keyHeadRow}>
                <View style={styles.keyBadge}><Text style={styles.keyBadgeTxt}>{k.label}</Text></View>
                {canEdit && (
                  <View style={styles.keyActions}>
                    <PcIconButton icon="create-outline" size={18} onPress={() => openEditKey(k)} />
                    <PcIconButton icon="trash-outline" size={18} color={pcColors.danger} onPress={() => deleteKey(k)} />
                  </View>
                )}
              </View>
              {!!k.description && <Text style={styles.keyDesc}>{k.description}</Text>}
              {(k.files || []).map((f) => <FileRow key={String(f.id)} f={f} onOpen={openFile} />)}
              {(k.files || []).length === 0 && <Text style={styles.noFiles}>Niciun fișier. {canEdit ? "Importă din MultiTracks sau adaugă manual." : ""}</Text>}
              {canEdit && (
                <Pressable style={styles.addFileRow} onPress={() => addFile(k.id)} disabled={uploadingKey === String(k.id)}>
                  {uploadingKey === String(k.id) ? <ActivityIndicator color={pcColors.primary} size="small" /> : <Ionicons name="add-circle-outline" size={18} color={pcColors.primary} />}
                  <Text style={styles.addFileTxt}>Add file</Text>
                </Pressable>
              )}
            </PcCard>
          ))}
          {(arr.keys || []).length === 0 && <Text style={styles.empty}>Nicio cheie încă.</Text>}

          <View style={styles.keysHead}>
            <PcSectionTitle style={{ marginTop: 20, marginBottom: 0 }}>Tags</PcSectionTitle>
            {canEdit && (
              <Pressable style={styles.addKeyBtn} onPress={() => setTagSheet(true)} hitSlop={8}>
                <Ionicons name="add" size={18} color={pcColors.primary} />
                <Text style={styles.addKeyTxt}>Add</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.seqWrap}>
            {(arr.tagIds || []).map((id) => <PcChip key={String(id)} label={tagNames[String(id)] || "…"} />)}
            {(arr.tagIds || []).length === 0 && <Text style={styles.noFiles}>Niciun tag de aranjament.</Text>}
          </View>
        </ScrollView>
      )}

      <TagPickerSheet visible={tagSheet} onClose={() => setTagSheet(false)} domain="arrangement" selectedIds={arr?.tagIds || []} onSave={saveTags} />
      <TransposeAudioSheet visible={transposeOpen} onClose={() => setTransposeOpen(false)} songId={songId} arrangementId={arrangementId} audioFiles={audioFiles} onDone={load} />

      {/* Add/Edit Key sheet */}
      <PcBottomSheet visible={keySheet} onClose={() => setKeySheet(false)} maxHeightPct={0.72}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <Text style={styles.sheetTitle}>{editingKey ? "Edit Key" : "Add Key"}</Text>

          <Text style={styles.lbl}>Start Key</Text>
          <Pressable style={styles.pick} onPress={() => setPickStart(true)}>
            <Text style={styles.pickTxt}>{startKey || "Alege cheia"}</Text>
            <Ionicons name="chevron-forward" size={18} color={pcColors.textMuted} />
          </Pressable>

          <Text style={styles.lbl}>End Key (modulație — opțional)</Text>
          <Pressable style={styles.pick} onPress={() => setPickEnd(true)}>
            <Text style={[styles.pickTxt, !endKey && { color: pcColors.textMuted }]}>{endKey || "Same"}</Text>
            <Ionicons name="chevron-forward" size={18} color={pcColors.textMuted} />
          </Pressable>

          <Text style={styles.lbl}>Descriere (opțional)</Text>
          <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="ex. Acoustic, Live" placeholderTextColor={pcColors.textMuted} />

          {!editingKey && (
            <Pressable style={styles.mtRow} onPress={() => setImportMt((v) => !v)}>
              <Ionicons name={importMt ? "checkbox" : "square-outline"} size={22} color={importMt ? pcColors.primary : pcColors.textMuted} />
              <Text style={styles.mtTxt}>Importă chord chart din MultiTracks</Text>
            </Pressable>
          )}

          <PcButton title={editingKey ? "Salvează" : "Adaugă cheia"} onPress={saveKey} loading={saving} block style={{ marginTop: 16 }} />
        </View>
      </PcBottomSheet>

      <KeyPicker visible={pickStart} onClose={() => setPickStart(false)} onPick={setStartKey} title="Start Key" />
      <KeyPicker visible={pickEnd} onClose={() => setPickEnd(false)} onPick={setEndKey} title="End Key" />
    </PcScreen>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

function FileRow({ f, onOpen }) {
  return (
    <Pressable style={styles.fileRow} onPress={() => onOpen(f)}>
      <Ionicons name={FILE_ICON[f.kind] || "document-outline"} size={20} color={f.derived ? pcColors.primary : pcColors.textSecondary} />
      <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
      {f.source === "multitracks" && <View style={styles.mtTag}><Text style={styles.mtTagTxt}>MT</Text></View>}
      {f.derived && <View style={styles.autoTag}><Text style={styles.autoTxt}>auto</Text></View>}
      {(f.pending || f.transposeStatus === "pending") && <View style={styles.pendTag}><Text style={styles.pendTxt}>pending</Text></View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: pcColors.card, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  statVal: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700" },
  statLbl: { color: pcColors.textMuted, fontSize: 12, marginTop: 4 },
  seqWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  seqChip: { backgroundColor: pcColors.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  seqTxt: { color: pcColors.textSecondary, fontSize: 13, fontWeight: "600" },
  keysHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addKeyBtn: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 20 },
  addKeyTxt: { color: pcColors.primary, fontSize: 15, fontWeight: "600" },
  keyHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  keyBadge: { borderWidth: 1, borderColor: pcColors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  keyBadgeTxt: { color: pcColors.primary, fontWeight: "700", fontSize: 15 },
  keyActions: { flexDirection: "row", alignItems: "center" },
  keyDesc: { color: pcColors.textSecondary, fontSize: 13, marginTop: 8 },
  noFiles: { color: pcColors.textMuted, fontSize: 13, marginTop: 10 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 30 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pcColors.divider },
  fileName: { color: pcColors.textPrimary, fontSize: 15, flex: 1 },
  mtTag: { backgroundColor: pcColors.primary, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  mtTagTxt: { color: "#0A0A0A", fontSize: 10, fontWeight: "800" },
  pendTag: { backgroundColor: pcColors.input, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  pendTxt: { color: pcColors.textMuted, fontSize: 10, fontWeight: "700" },
  autoTag: { borderWidth: 1, borderColor: pcColors.primary, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 },
  autoTxt: { color: pcColors.primary, fontSize: 10, fontWeight: "800" },
  lcBtn: { borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  lcTxt: { color: pcColors.textPrimary, fontSize: 13, fontWeight: "700" },
  addFileRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, marginTop: 4 },
  addFileTxt: { color: pcColors.primary, fontSize: 14, fontWeight: "600" },
  masterChart: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: pcColors.card, borderRadius: 10, padding: 12, marginTop: 10 },
  masterTxt: { color: pcColors.textSecondary, fontSize: 13, flex: 1 },
  sheetTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  lbl: { color: pcColors.textSecondary, fontSize: 13, marginTop: 14, marginBottom: 6 },
  pick: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 48 },
  pickTxt: { color: pcColors.textPrimary, fontSize: 16 },
  input: { color: pcColors.textPrimary, fontSize: 16, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 48 },
  mtRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  mtTxt: { color: pcColors.textPrimary, fontSize: 15 },
});

export default ArrangementScreen;
