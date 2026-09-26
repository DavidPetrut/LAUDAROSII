import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../../../global/context";
import { ac, LEVEL_META } from "./appControlStyles";

const LEVELS = ["none", "view", "edit"];

// Segment cu 3 stari pentru o capabilitate: Nimic / Vedere / Editare
const LevelSegment = ({ value, onChange }) => {
  const { theme } = useTheme();
  return (
    <View style={ac.seg}>
      {LEVELS.map((lv) => {
        const active = (value || "none") === lv;
        const meta = LEVEL_META[lv];
        return (
          <TouchableOpacity
            key={lv}
            style={[
              ac.segBtn,
              { borderColor: active ? meta.color : theme.border, backgroundColor: active ? meta.color + "22" : "transparent" },
            ]}
            onPress={() => onChange(lv)}
            activeOpacity={0.8}
          >
            <Text style={[ac.segText, { color: active ? meta.color : theme.textMuted }]}>{meta.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/**
 * Editor de capabilitati: tab-uri Functionalitati / Ecrane, grupate, fiecare rand
 * cu un segment de 3 stari. Controlat: `value` = harta cheie->nivel; `onChange`.
 */
export const CapabilityEditor = ({ catalog, value, onChange }) => {
  const { theme } = useTheme();
  const [tab, setTab] = useState("feature");

  const caps = catalog?.capabilities || [];
  const grouped = useMemo(() => {
    const byGroup = {};
    caps.filter((c) => c.type === tab).forEach((c) => {
      (byGroup[c.group] = byGroup[c.group] || []).push(c);
    });
    return byGroup;
  }, [caps, tab]);

  const groupOrder = (catalog?.groups || []).filter((g) => grouped[g]?.length);

  return (
    <View>
      <View style={ac.tabsRow}>
        {[["feature", "Functionalitati"], ["screen", "Ecrane"]].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[ac.tabBtn, tab === key && ac.tabBtnActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[ac.tabText, tab === key && ac.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {groupOrder.length === 0 && (
        <Text style={[ac.muted, { marginTop: 24 }]}>Nicio capabilitate in aceasta categorie.</Text>
      )}

      {groupOrder.map((group) => (
        <View key={group}>
          <Text style={ac.groupLabel}>{group}</Text>
          {grouped[group].map((cap) => (
            <View key={cap.key} style={ac.capRow}>
              <Text style={[ac.capLabel, { color: theme.textPrimary }]}>{cap.label}</Text>
              <Text style={ac.capDesc}>{cap.desc}</Text>
              <LevelSegment value={value?.[cap.key]} onChange={(lv) => onChange(cap.key, lv)} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};
