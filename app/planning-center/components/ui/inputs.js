/**
 * Inputuri & selecții globale (uniformizate din screenshot-uri):
 * PcSearchBar, PcChip (pill selectabil), PcCheckbox (pătrat verde), PcSegmented (toggle).
 */
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { pcColors, pcRadius } from "../../theme";

/* ---------- Search bar (People) ---------- */
export function PcSearchBar({ value, onChangeText, placeholder = "Search", onClear, style }) {
  return (
    <View style={[styles.search, style]}>
      <Ionicons name="search" size={20} color={pcColors.primary} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={pcColors.textMuted}
        returnKeyType="search"
      />
      {!!value && (
        <Pressable onPress={onClear} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={pcColors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

/* ---------- Chip pill (filtre Tags, poziții, My Teams) ---------- */
export function PcChip({ label, selected = false, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipOn, style]}>
      <Text style={[styles.chipTxt, selected && styles.chipTxtOn]}>{label}</Text>
    </Pressable>
  );
}

/* ---------- Checkbox pătrat verde ---------- */
export function PcCheckbox({ checked = false, onPress, size = 26 }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={[styles.checkbox, { width: size, height: size }, checked && styles.checkboxOn]}>
      {checked && <Ionicons name="checkmark" size={size * 0.62} color="#000" />}
    </Pressable>
  );
}

/* ---------- Segmented control (Teams/Positions, UNREAD/RECEIVED/SENT) ---------- */
export function PcSegmented({ options, value, onChange, style }) {
  return (
    <View style={[styles.segment, style]}>
      {options.map((opt) => {
        const key = typeof opt === "string" ? opt : opt.key;
        const label = typeof opt === "string" ? opt : opt.label;
        const on = value === key;
        return (
          <Pressable key={key} style={[styles.segBtn, on && styles.segBtnOn]} onPress={() => onChange(key)}>
            <Text style={[styles.segTxt, on && styles.segTxtOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Select / dropdown (location email/telefon, gen, nivel permisiune) ---------- */
export function PcSelect({ value, placeholder = "Selectează", options = [], onChange, style, compact = false }) {
  const [open, setOpen] = useState(false);
  const norm = options.map((o) => (typeof o === "object" ? o : { value: o, label: o }));
  const current = norm.find((o) => o.value === value);
  return (
    <>
      <Pressable style={[styles.select, compact && styles.selectCompact, style]} onPress={() => setOpen(true)}>
        <Text style={[styles.selectTxt, !current && { color: pcColors.textMuted }]} numberOfLines={1}>
          {current ? current.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={pcColors.textMuted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={styles.selOverlay} onPress={() => setOpen(false)}>
          <View style={styles.selCard}>
            <ScrollView>
              {norm.map((o) => (
                <Pressable key={String(o.value)} style={styles.selRow} onPress={() => { onChange(o.value); setOpen(false); }}>
                  <Ionicons name="checkmark" size={18} color={o.value === value ? pcColors.primary : "transparent"} />
                  <Text style={styles.selRowTxt}>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", backgroundColor: pcColors.input, borderRadius: pcRadius.md, paddingHorizontal: 12, height: 46, gap: 8 },
  searchInput: { flex: 1, color: pcColors.textPrimary, fontSize: 16 },

  chip: { borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: pcRadius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  chipOn: { borderColor: pcColors.primary, backgroundColor: "rgba(134,193,63,0.12)" },
  chipTxt: { color: pcColors.textPrimary, fontWeight: "600" },
  chipTxtOn: { color: pcColors.primary },

  checkbox: { borderRadius: 6, borderWidth: 2, borderColor: pcColors.chipBorder, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: pcColors.primary, borderColor: pcColors.primary },

  segment: { flexDirection: "row", alignSelf: "center", borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 8, overflow: "hidden" },
  segBtn: { paddingVertical: 10, paddingHorizontal: 26, alignItems: "center", flexGrow: 1 },
  segBtnOn: { borderWidth: 1, borderColor: pcColors.primary, borderRadius: 8, backgroundColor: "rgba(134,193,63,0.12)" },
  segTxt: { color: pcColors.textSecondary, fontWeight: "700" },
  segTxtOn: { color: pcColors.primary },

  select: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: pcRadius.md, paddingHorizontal: 12, height: 46, gap: 6 },
  selectCompact: { height: 40, paddingHorizontal: 10 },
  selectTxt: { color: pcColors.textPrimary, fontSize: 15, flex: 1 },
  selOverlay: { flex: 1, backgroundColor: pcColors.overlay, alignItems: "center", justifyContent: "center", padding: 32 },
  selCard: { backgroundColor: "#2A2A2C", borderRadius: 12, width: "100%", maxHeight: "60%", paddingVertical: 6 },
  selRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15, paddingHorizontal: 16 },
  selRowTxt: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
});

export default { PcSearchBar, PcChip, PcCheckbox, PcSegmented, PcSelect };
