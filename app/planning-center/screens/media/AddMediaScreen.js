/** Add/Edit Media — titlu + URL (auto-detectează YouTube/Vimeo/video/imagine/link) + autor + descriere.
 *  ⚠️ Upload de pe device (fișier/video local) = seam (storage); lipește un URL (Cloudinary/YouTube/Vimeo). */
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pickAndUploadFile } from "../../api/upload";
import { pcColors } from "../../theme";
import { PcScreen, PcIconButton, PcButton } from "../../components";

const detect = (u) => {
  const s = String(u || "").trim();
  if (/youtube\.com|youtu\.be/.test(s)) return "youtube";
  if (/vimeo\.com/.test(s)) return "vimeo";
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(s)) return "video";
  if (/\.(png|jpe?g|gif|webp)(\?|$)/i.test(s)) return "image";
  if (/\.(mp3|m4a|aac|wav)(\?|$)/i.test(s)) return "file";
  return s ? "link" : "";
};

export function AddMediaScreen({ navigation, route }) {
  const { mediaId } = route.params || {};
  const insets = useSafeAreaInsets();
  const editing = !!mediaId;
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickFile = async () => {
    setUploading(true);
    try {
      const r = await pickAndUploadFile({ type: "*/*" });
      if (r?.url) { setUrl(r.url); if (!title.trim() && r.name) setTitle(r.name.replace(/\.[^.]+$/, "")); showSuccess("Fișier urcat."); }
    } catch (e) { showError(e?.message || "Eroare la upload."); }
    finally { setUploading(false); }
  };

  const load = useCallback(async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const m = await pcApi.media.get(mediaId);
      setTitle(m.title || ""); setUrl(m.url || ""); setAuthor(m.author || ""); setDescription(m.description || "");
    } catch (e) { showError(e?.message || "Eroare."); }
    finally { setLoading(false); }
  }, [editing, mediaId]);
  useEffect(() => { load(); }, [load]);

  const kind = detect(url);
  const save = async () => {
    if (!title.trim()) return showError("Scrie un titlu.");
    setSaving(true);
    try {
      const data = { title: title.trim(), url: url.trim(), author: author.trim(), description: description.trim() };
      if (editing) { await pcApi.media.update(mediaId, data); showSuccess("Salvat."); }
      else { const m = await pcApi.media.create(data); showSuccess("Creat."); navigation.replace("PcMediaItem", { mediaId: m.id }); return; }
      navigation.goBack();
    } catch (e) { showError(e?.message || "Nu s-a salvat."); }
    finally { setSaving(false); }
  };

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <PcIconButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{editing ? "Edit Media" : "Add Media"}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.lbl}>Titlu</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Titlu media" placeholderTextColor={pcColors.textMuted} />

          <Text style={styles.lbl}>URL (YouTube / Vimeo / fișier / imagine / link)</Text>
          <TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="https://..." placeholderTextColor={pcColors.textMuted} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          {!!kind && <Text style={styles.detected}>Detectat: <Text style={{ color: pcColors.primary, fontWeight: "800" }}>{kind}</Text></Text>}

          <Pressable style={styles.uploadRow} onPress={pickFile} disabled={uploading}>
            {uploading ? <ActivityIndicator color={pcColors.primary} size="small" /> : <Ionicons name="cloud-upload-outline" size={20} color={pcColors.primary} />}
            <Text style={styles.uploadTxt}>{uploading ? "Se urcă…" : "Încarcă fișier de pe device"}</Text>
          </Pressable>

          <Text style={styles.lbl}>Autor (opțional)</Text>
          <TextInput style={styles.input} value={author} onChangeText={setAuthor} placeholder="Autor / sursă" placeholderTextColor={pcColors.textMuted} />

          <Text style={styles.lbl}>Descriere (opțional)</Text>
          <TextInput style={[styles.input, { height: 90 }]} value={description} onChangeText={setDescription} placeholder="Descriere" placeholderTextColor={pcColors.textMuted} multiline textAlignVertical="top" />

          <PcButton title={editing ? "Salvează" : "Creează"} onPress={save} loading={saving} block style={{ marginTop: 20 }} />
        </ScrollView>
      )}
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  lbl: { color: pcColors.textSecondary, fontSize: 13, marginTop: 16, marginBottom: 6 },
  input: { color: pcColors.textPrimary, fontSize: 16, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, minHeight: 48, paddingVertical: 10 },
  detected: { color: pcColors.textMuted, fontSize: 13, marginTop: 8 },
  uploadRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, alignSelf: "flex-start" },
  uploadTxt: { color: pcColors.primary, fontSize: 14, fontWeight: "700" },
});

export default AddMediaScreen;
