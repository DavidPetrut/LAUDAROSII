/** Sheet de asignare tag-uri (Song sau Arrangement). Afișează grupurile cu tag-uri selectabile.
 *  „Remember, you'll only see tags that match the tab you're on" → domain controlează catalogul. */
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { showError } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcBottomSheet, PcButton, PcCheckbox } from "../../components";

export function TagPickerSheet({ visible, onClose, domain = "song", selectedIds = [], onSave }) {
  const [groups, setGroups] = useState([]);
  const [sel, setSel] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setGroups((await pcApi.songs.tags(domain)).groups || []); }
    catch (e) { showError(e?.message || "Eroare la tag-uri."); }
    finally { setLoading(false); }
  }, [domain]);

  useEffect(() => { if (visible) { setSel(selectedIds.map(String)); load(); } }, [visible]); // eslint-disable-line

  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const save = async () => { setSaving(true); try { await onSave(sel); onClose(); } catch (e) { showError(e?.message || "Nu s-a salvat."); } finally { setSaving(false); } };

  return (
    <PcBottomSheet visible={visible} onClose={onClose} maxHeightPct={0.8}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <Text style={styles.title}>{domain === "arrangement" ? "Arrangement tags" : "Song tags"}</Text>
        {loading ? (
          <ActivityIndicator color={pcColors.primary} style={{ marginTop: 24 }} />
        ) : (
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            {groups.length === 0 && <Text style={styles.empty}>Niciun grup de tag-uri. Creează-le din Songs → Edit Tags.</Text>}
            {groups.map((g) => (
              <View key={String(g.id)} style={{ marginBottom: 14 }}>
                <Text style={styles.group}>{g.name}</Text>
                {g.tags.length === 0 && <Text style={styles.noTags}>— fără tag-uri —</Text>}
                {g.tags.map((t) => (
                  <Pressable key={String(t.id)} style={styles.tagRow} onPress={() => toggle(String(t.id))}>
                    <PcCheckbox checked={sel.includes(String(t.id))} onPress={() => toggle(String(t.id))} size={22} />
                    <Text style={styles.tagName}>{t.name}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
        <PcButton title="Salvează" onPress={save} loading={saving} block style={{ marginTop: 10 }} />
      </View>
    </PcBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  empty: { color: pcColors.textMuted, fontSize: 14, marginVertical: 16 },
  group: { color: pcColors.primary, fontSize: 14, fontWeight: "700", marginBottom: 6 },
  noTags: { color: pcColors.textMuted, fontSize: 13, marginBottom: 4 },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  tagName: { color: pcColors.textPrimary, fontSize: 16 },
});

export default TagPickerSheet;
