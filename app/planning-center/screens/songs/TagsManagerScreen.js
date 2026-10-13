/** Edit Tags (Songs → Actions → Edit Tags). Tab-uri Song / Arrangement (Media/People/File = alte felii).
 *  Grupuri (carduri) cu tag-uri + „Add tag" + „Add Tag Group". Creare/editare/ștergere. */
import React, { useState, useCallback } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showConfirm } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcIconButton, PcSegmented, PcCard, PcBottomSheet, PcButton } from "../../components";

export function TagsManagerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [domain, setDomain] = useState("song");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupSheet, setGroupSheet] = useState(false);
  const [newGroup, setNewGroup] = useState("");
  const [tagInputs, setTagInputs] = useState({}); // groupId -> text
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setGroups((await pcApi.songs.tags(domain)).groups || []); }
    catch (e) { showError(e?.message || "Eroare la tag-uri."); }
    finally { setLoading(false); }
  }, [domain]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addGroup = async () => {
    if (!newGroup.trim()) return showError("Scrie un nume de grup.");
    setBusy(true);
    try { await pcApi.songs.createTagGroup({ name: newGroup.trim(), domain }); setNewGroup(""); setGroupSheet(false); await load(); }
    catch (e) { showError(e?.message || "Eroare."); } finally { setBusy(false); }
  };
  const delGroup = (g) => showConfirm("Șterge grupul?", `„${g.name}" și tag-urile lui vor fi șterse.`, async () => {
    try { await pcApi.songs.deleteTagGroup(g.id); await load(); } catch (e) { showError(e?.message || "Eroare."); }
  });
  const addTag = async (g) => {
    const name = (tagInputs[g.id] || "").trim();
    if (!name) return;
    try { await pcApi.songs.createTag({ tagGroupId: g.id, name, domain }); setTagInputs((m) => ({ ...m, [g.id]: "" })); await load(); }
    catch (e) { showError(e?.message || "Eroare."); }
  };
  const delTag = (t) => showConfirm("Șterge tag-ul?", `„${t.name}" va fi scos din toate cântecele/aranjamentele.`, async () => {
    try { await pcApi.songs.deleteTag(t.id); await load(); } catch (e) { showError(e?.message || "Eroare."); }
  });

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <PcIconButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Edit Tags</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pcColors.bgHeader }}>
        <PcSegmented
          options={[{ key: "song", label: "Song" }, { key: "arrangement", label: "Arrangement" }]}
          value={domain} onChange={setDomain} style={{ alignSelf: "stretch" }}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
          <Text style={styles.hint}>
            {domain === "song" ? "Tag-uri de cântec (ex. Christmas) — valabile indiferent de aranjament." : "Tag-uri de aranjament (ex. Fast/Slow) — pot diferi între aranjamentele aceluiași cântec."}
          </Text>
          {groups.map((g) => (
            <PcCard key={String(g.id)} style={{ marginBottom: 12 }}>
              <View style={styles.groupHead}>
                <Text style={styles.groupName}>{g.name}</Text>
                <PcIconButton icon="trash-outline" size={18} color={pcColors.danger} onPress={() => delGroup(g)} />
              </View>
              {g.tags.map((t) => (
                <View key={String(t.id)} style={styles.tagRow}>
                  <Text style={styles.tagName}>{t.name}</Text>
                  <PcIconButton icon="close" size={16} color={pcColors.textMuted} onPress={() => delTag(t)} />
                </View>
              ))}
              <View style={styles.addTagRow}>
                <TextInput
                  style={styles.addTagIn}
                  value={tagInputs[g.id] || ""}
                  onChangeText={(v) => setTagInputs((m) => ({ ...m, [g.id]: v }))}
                  placeholder="Add tag" placeholderTextColor={pcColors.textMuted}
                  onSubmitEditing={() => addTag(g)} returnKeyType="done"
                />
                <PcIconButton icon="add-circle" size={26} color={pcColors.primary} onPress={() => addTag(g)} />
              </View>
            </PcCard>
          ))}
          {groups.length === 0 && <Text style={styles.empty}>Niciun grup încă.</Text>}

          <Pressable style={styles.addGroup} onPress={() => setGroupSheet(true)}>
            <Ionicons name="add-circle-outline" size={22} color={pcColors.primary} />
            <Text style={styles.addGroupTxt}>Add Tag Group</Text>
          </Pressable>
        </ScrollView>
      )}

      <PcBottomSheet visible={groupSheet} onClose={() => setGroupSheet(false)} maxHeightPct={0.4}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={styles.sheetTitle}>Add Tag Group ({domain})</Text>
          <TextInput style={styles.input} value={newGroup} onChangeText={setNewGroup} placeholder="Nume grup (ex. Season, Speed)" placeholderTextColor={pcColors.textMuted} />
          <PcButton title="Creează" onPress={addGroup} loading={busy} block style={{ marginTop: 14 }} />
        </View>
      </PcBottomSheet>
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  hint: { color: pcColors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 14 },
  groupHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  groupName: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  tagRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pcColors.divider },
  tagName: { color: pcColors.textPrimary, fontSize: 15 },
  addTagRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  addTagIn: { flex: 1, color: pcColors.textPrimary, fontSize: 15, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, height: 42 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginVertical: 20 },
  addGroup: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, justifyContent: "center" },
  addGroupTxt: { color: pcColors.primary, fontSize: 16, fontWeight: "600" },
  sheetTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  input: { color: pcColors.textPrimary, fontSize: 16, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 48 },
});

export default TagsManagerScreen;
