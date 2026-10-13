/**
 * Bottom-sheet Filter — identic cu screenshot-urile (§9 [PEOPLE-FILTER]).
 * Tab-uri: TEAMS (Teams/Positions + checkbox + My Teams + Deselect All) / TAGS (chip-uri) / PERMISSIONS (dropdown).
 * Design uniformizat prin primitive (ui/). Aplică-pe-închidere (X) — ca în PCO (fără buton „Apply").
 */
import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  PcBottomSheet, PcUnderlineTabs, PcSegmented, PcChip, PcCheckbox,
} from "../../components";
import { pcColors } from "../../theme";

const PERM_LABELS = {
  any: "Any", scheduledViewer: "Scheduled Viewer", viewer: "Viewer",
  scheduler: "Scheduler", editor: "Editor", administrator: "Administrator",
};

export function PeopleFilterSheet({ visible, onClose, data, value, onApply, resultCount }) {
  const [tab, setTab] = useState("TEAMS");
  const [teamMode, setTeamMode] = useState("Teams");
  const [teamIds, setTeamIds] = useState(value.teamIds || []);
  const [tagIds, setTagIds] = useState(value.tagIds || []);
  const [minPermission, setMinPermission] = useState(value.minPermission || "any");
  const [permOpen, setPermOpen] = useState(false);

  const teams = data?.teams || [];
  const positions = data?.positions || [];
  const tagGroups = data?.tagGroups || [];
  const permLevels = data?.permissionLevels || ["any"];
  const allTeamIds = useMemo(() => teams.map((t) => String(t.id)), [teams]);
  const allSelected = teamIds.length > 0 && teamIds.length === allTeamIds.length;

  const has = (list, id) => list.map(String).includes(String(id));
  const toggle = (list, setter, id) =>
    setter(has(list, id) ? list.filter((x) => String(x) !== String(id)) : [...list, String(id)]);

  const applyAndClose = () => {
    onApply({ teamIds, tagIds, minPermission: minPermission === "any" ? "" : minPermission });
    onClose();
  };
  const reset = () => {
    setTeamIds([]); setTagIds([]); setMinPermission("any");
    onApply({ teamIds: [], tagIds: [], minPermission: "" });
  };

  return (
    <PcBottomSheet visible={visible} onClose={applyAndClose} maxHeightPct={0.9}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Filter</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
            <Text style={styles.count}>{resultCount} Results</Text>
            <Pressable onPress={reset} hitSlop={8}><Text style={styles.reset}>  RESET</Text></Pressable>
          </View>
        </View>
        <Pressable onPress={applyAndClose} hitSlop={10}>
          <Ionicons name="close" size={26} color={pcColors.textPrimary} />
        </Pressable>
      </View>

      <PcUnderlineTabs
        tabs={[
          { key: "TEAMS", label: "TEAMS" },
          { key: "TAGS", label: "TAGS" },
          { key: "PERMISSIONS", label: "PERMISSIONS" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        {tab === "TEAMS" && (
          <>
            <PcSegmented options={["Teams", "Positions"]} value={teamMode} onChange={setTeamMode} style={{ marginBottom: 16 }} />
            <View style={styles.rowBetween}>
              <Text style={styles.dropdownLabel}>My Teams ▾</Text>
              <Pressable onPress={() => setTeamIds(allSelected ? [] : allTeamIds)}>
                <Text style={styles.reset}>{allSelected ? "Deselect All" : "Select All"}</Text>
              </Pressable>
            </View>
            {teamMode === "Teams"
              ? teams.map((t) => (
                  <Pressable key={String(t.id)} style={styles.checkRow} onPress={() => toggle(teamIds, setTeamIds, t.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.checkName}>{t.name}</Text>
                      {!!t.serviceTypeName && <Text style={styles.checkSub}>{t.serviceTypeName}</Text>}
                    </View>
                    <PcCheckbox checked={has(teamIds, t.id)} onPress={() => toggle(teamIds, setTeamIds, t.id)} />
                  </Pressable>
                ))
              : (
                <View style={styles.chipsWrap}>
                  {positions.map((p) => <PcChip key={String(p.id)} label={p.name} />)}
                  {positions.length === 0 && <Text style={styles.empty}>Nicio poziție.</Text>}
                </View>
              )}
          </>
        )}

        {tab === "TAGS" &&
          tagGroups.map((g) => (
            <View key={String(g.id)} style={{ marginBottom: 18 }}>
              {!!g.category && <Text style={styles.tagCategory}>{g.category}</Text>}
              <Text style={styles.tagGroupName}>{g.name}</Text>
              <View style={styles.chipsWrap}>
                {g.tags.map((tag) => (
                  <PcChip key={String(tag.id)} label={tag.name} selected={has(tagIds, tag.id)} onPress={() => toggle(tagIds, setTagIds, tag.id)} />
                ))}
              </View>
            </View>
          ))}

        {tab === "PERMISSIONS" && (
          <View>
            <Text style={styles.permTitle}>Minimum Permissions</Text>
            <Pressable style={styles.permSelect} onPress={() => setPermOpen((v) => !v)}>
              <Text style={[styles.permSelectTxt, minPermission === "any" && { color: pcColors.textMuted }]}>
                {minPermission === "any" ? "Select Permissions" : PERM_LABELS[minPermission]}
              </Text>
              <Ionicons name={permOpen ? "chevron-up" : "chevron-down"} size={18} color={pcColors.textMuted} />
            </Pressable>
            {permOpen && (
              <View style={styles.permMenu}>
                {permLevels.map((lvl) => (
                  <Pressable key={lvl} style={styles.permOption} onPress={() => { setMinPermission(lvl); setPermOpen(false); }}>
                    <Text style={styles.permOptionTxt}>{PERM_LABELS[lvl] || lvl}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </PcBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, paddingBottom: 10 },
  title: { color: pcColors.textPrimary, fontSize: 22, fontWeight: "700" },
  count: { color: pcColors.textSecondary, fontSize: 14 },
  reset: { color: pcColors.primary, fontSize: 14, fontWeight: "700" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider, paddingBottom: 10 },
  dropdownLabel: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
  checkRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  checkName: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
  checkSub: { color: pcColors.textSecondary, fontSize: 13, marginTop: 2 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  tagCategory: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 10 },
  tagGroupName: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "600" },
  empty: { color: pcColors.textMuted },
  permTitle: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 12 },
  permSelect: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: pcColors.inputBorder, paddingVertical: 10 },
  permSelectTxt: { color: pcColors.textPrimary, fontSize: 16 },
  permMenu: { backgroundColor: pcColors.card, borderRadius: 10, marginTop: 8, overflow: "hidden" },
  permOption: { paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  permOptionTxt: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
});

export default PeopleFilterSheet;
