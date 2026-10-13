/** Transpose Audio (din poză): fișier sursă + From/To + Name + Results → pune în coadă.
 *  ⚠️ DSP real (pitch-shift) = seam (server/queue, ~1-5 min); aici marcăm fișierele „pending". */
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { showError, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcBottomSheet, PcButton, PcSelect } from "../../components";
import { KeyPicker } from "./KeyPicker";

export function TransposeAudioSheet({ visible, onClose, songId, arrangementId, audioFiles = [], onDone }) {
  const [sourceId, setSourceId] = useState("");
  const [fromKey, setFromKey] = useState("");
  const [toKeys, setToKeys] = useState([]);
  const [baseName, setBaseName] = useState("");
  const [pickTo, setPickTo] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      const first = audioFiles[0];
      setSourceId(first ? String(first.id) : "");
      setBaseName(first ? first.name.replace(/\.[^.]+$/, "") : "");
      setFromKey(""); setToKeys([]);
    }
  }, [visible]); // eslint-disable-line

  const addTo = (k) => setToKeys((arr) => (arr.includes(k) ? arr : [...arr, k]));
  const removeTo = (k) => setToKeys((arr) => arr.filter((x) => x !== k));

  const submit = async () => {
    if (!sourceId) return showError("Alege fișierul audio.");
    if (!fromKey) return showError("Alege cheia sursă (From).");
    if (toKeys.length === 0) return showError("Alege cel puțin o cheie țintă (To).");
    setBusy(true);
    try {
      const r = await pcApi.songs.transposeAudio(songId, arrangementId, { sourceFileId: sourceId, fromKey, toKeys, baseName });
      showSuccess(r?.note || "În coadă.");
      onClose(); onDone && onDone();
    } catch (e) { showError(e?.message || "Eroare la transpunere."); }
    finally { setBusy(false); }
  };

  return (
    <PcBottomSheet visible={visible} onClose={onClose} maxHeightPct={0.85}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <Text style={styles.title}>Transpose Audio</Text>
        {audioFiles.length === 0 ? (
          <Text style={styles.empty}>Niciun fișier audio pe acest aranjament. Adaugă întâi un mp3/m4a/aac.</Text>
        ) : (
          <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.lbl}>Fișier</Text>
            <PcSelect value={sourceId} options={audioFiles.map((f) => ({ value: String(f.id), label: f.name }))} onChange={setSourceId} />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lbl}>From</Text>
                <FromKey value={fromKey} onChange={setFromKey} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lbl}>To</Text>
                <Pressable style={styles.pick} onPress={() => setPickTo(true)}>
                  <Text style={[styles.pickTxt, toKeys.length === 0 && { color: pcColors.textMuted }]}>{toKeys.length ? `${toKeys.length} chei` : "Alege"}</Text>
                  <Ionicons name="add" size={18} color={pcColors.primary} />
                </Pressable>
              </View>
            </View>

            {toKeys.length > 0 && (
              <View style={styles.chips}>
                {toKeys.map((k) => (
                  <Pressable key={k} style={styles.chip} onPress={() => removeTo(k)}>
                    <Text style={styles.chipTxt}>{k}</Text>
                    <Ionicons name="close" size={14} color={pcColors.textMuted} />
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.lbl}>Name</Text>
            <TextInput style={styles.input} value={baseName} onChangeText={setBaseName} placeholder="Nume de bază" placeholderTextColor={pcColors.textMuted} />

            {toKeys.length > 0 && (
              <>
                <Text style={styles.lbl}>Results</Text>
                <View style={styles.results}>
                  {toKeys.map((k) => <Text key={k} style={styles.resTxt}>{baseName}-{k}</Text>)}
                </View>
              </>
            )}
            <Text style={styles.note}>⚠️ Transpunerea audio reală (pitch-shift DSP) = felie ulterioară. Cu cât te îndepărtezi de cheia originală, cu atât vocea se distorsionează mai mult (PCO).</Text>
          </ScrollView>
        )}
        <View style={styles.actions}>
          <PcButton title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
          <PcButton title="Transpose" onPress={submit} loading={busy} disabled={audioFiles.length === 0} style={{ flex: 1 }} />
        </View>
      </View>
      <KeyPicker visible={pickTo} onClose={() => setPickTo(false)} onPick={addTo} title="To (adaugă cheie)" />
    </PcBottomSheet>
  );
}

/** From key = KeyPicker inline. */
function FromKey({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={styles.pick} onPress={() => setOpen(true)}>
        <Text style={[styles.pickTxt, !value && { color: pcColors.textMuted }]}>{value || "Cheie"}</Text>
        <Ionicons name="chevron-down" size={16} color={pcColors.textMuted} />
      </Pressable>
      <KeyPicker visible={open} onClose={() => setOpen(false)} onPick={onChange} title="From key" />
    </>
  );
}

const styles = StyleSheet.create({
  title: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  empty: { color: pcColors.textMuted, fontSize: 14, marginVertical: 16 },
  lbl: { color: pcColors.textSecondary, fontSize: 13, marginTop: 12, marginBottom: 6 },
  row2: { flexDirection: "row", gap: 12 },
  pick: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 46 },
  pickTxt: { color: pcColors.textPrimary, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: pcColors.primary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(134,193,63,0.12)" },
  chipTxt: { color: pcColors.primary, fontSize: 14, fontWeight: "700" },
  input: { color: pcColors.textPrimary, fontSize: 16, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 46 },
  results: { backgroundColor: pcColors.card, borderRadius: 10, padding: 12, gap: 4 },
  resTxt: { color: pcColors.textSecondary, fontSize: 14 },
  note: { color: pcColors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 12 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
});

export default TransposeAudioSheet;
