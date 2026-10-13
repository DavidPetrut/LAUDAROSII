/**
 * People Tags (doc #24, poze PCO → mobil dark+verde). Flux:
 *   Profile → TAGS → My Tags (grupuri cu tag-uri asignate) → iconița tag → Edit Tags (toate grupurile)
 *   → tap grup → listă tag-uri cu bife + SAVE.
 * Asignare existente (scheduler+). Crearea de tag-uri noi = seam (nu e în poze).
 */
import React, { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcBottomSheet, PcCheckbox, PcListRow } from "../../components";
import { usePc } from "../../navigation/PcContext";

export function PersonTagsScreen({ route, navigation }) {
  const { personId, personName } = route.params || {};
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const lvl = me?.permission?.peoplePlansLevel;
  const canAssign =
    !!me?.permission?.isOrgAdmin || ["scheduler", "editor", "administrator"].includes(lvl);

  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState([]); // tagId strings
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pcApi.people.tags(personId);
      setGroups(res.groups || []);
      setSelected((res.assigned || []).map(String));
    } catch (e) {
      showError(e?.message || "Nu s-au putut încărca tag-urile.");
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => { load(); }, [load]);

  const has = (id) => selected.map(String).includes(String(id));
  const toggle = (id) =>
    setSelected((s) => (has(id) ? s.filter((x) => String(x) !== String(id)) : [...s, String(id)]));

  const groupSelectedNames = (g) =>
    g.tags.filter((t) => has(t.id)).map((t) => t.name).join(", ");

  const saveGroup = async () => {
    setSaving(true);
    try {
      await pcApi.people.setTags(personId, selected);
      showSuccess("Tag-uri salvate");
      setActiveGroup(null);
      load();
    } catch (e) {
      showError(e?.message || "Nu s-a putut salva.");
    } finally {
      setSaving(false);
    }
  };

  const assignedGroups = groups.filter((g) => g.tags.some((t) => has(t.id)));
  const listGroups = editMode ? groups : assignedGroups;

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => (editMode ? setEditMode(false) : navigation.goBack())} hitSlop={10}>
          <Ionicons name="close" size={26} color={pcColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{editMode ? "Edit Tags" : "My Tags"}</Text>
        {canAssign ? (
          editMode ? (
            <Pressable onPress={() => setEditMode(false)} hitSlop={10}>
              <Ionicons name="checkmark" size={26} color={pcColors.primary} />
            </Pressable>
          ) : (
            <Pressable onPress={() => setEditMode(true)} hitSlop={10}>
              <Ionicons name="pricetag" size={24} color={pcColors.primary} />
            </Pressable>
          )
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {listGroups.length === 0 && (
            <Text style={styles.empty}>{editMode ? "Niciun grup de tag-uri." : "Nicio etichetă asignată."}</Text>
          )}
          {listGroups.map((g) => (
            <PcListRow
              key={String(g.id)}
              title={g.name}
              sub={groupSelectedNames(g) || (editMode ? "—" : "")}
              right={editMode ? <Ionicons name="chevron-forward" size={20} color={pcColors.textMuted} /> : null}
              onPress={editMode ? () => setActiveGroup(g) : undefined}
            />
          ))}
        </ScrollView>
      )}

      {/* Group picker sheet */}
      <PcBottomSheet visible={!!activeGroup} onClose={() => setActiveGroup(null)} maxHeightPct={0.85}>
        {activeGroup && (
          <>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setActiveGroup(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color={pcColors.textPrimary} />
              </Pressable>
              <Text style={styles.sheetTitle}>{activeGroup.name}</Text>
              <Pressable onPress={saveGroup} hitSlop={10} disabled={saving}>
                <Text style={styles.save}>{saving ? "..." : "SAVE"}</Text>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {activeGroup.tags.map((t) => (
                <Pressable key={String(t.id)} style={styles.tagRow} onPress={() => toggle(t.id)}>
                  <Text style={styles.tagName}>{t.name}</Text>
                  <PcCheckbox checked={has(t.id)} onPress={() => toggle(t.id)} size={24} />
                </Pressable>
              ))}
              {activeGroup.tags.length === 0 && <Text style={styles.empty}>Niciun tag în acest grup.</Text>}
            </ScrollView>
          </>
        )}
      </PcBottomSheet>
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", flex: 1, marginLeft: 12 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 40 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  sheetTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", flex: 1, marginLeft: 12 },
  save: { color: pcColors.primary, fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
  tagRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  tagName: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600", flex: 1 },
});

export default PersonTagsScreen;
