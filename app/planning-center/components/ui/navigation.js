/**
 * Navigație internă globală (uniformizate din screenshot-uri):
 * PcUnderlineTabs (TEAMS/TAGS/PERMISSIONS, SCHEDULE/BLOCKOUTS/MESSAGES — underline verde).
 * PcAnchoredMenu (dropdown ancorat sus-dreapta — Sort).
 */
import React from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pcColors } from "../../theme";

function TabIcon({ icon, lib, color }) {
  if (!icon) return null;
  return lib === "mci" ? (
    <MaterialCommunityIcons name={icon} size={22} color={color} />
  ) : (
    <Ionicons name={icon} size={22} color={color} />
  );
}

/**
 * Rând de tab-uri cu underline verde.
 * tabs: [{ key, label, icon?, lib? }]. Dacă au icon → icon deasupra label-ului.
 */
export function PcUnderlineTabs({ tabs, value, onChange, style }) {
  const hasIcons = tabs.some((t) => t.icon);
  return (
    <View style={[styles.tabs, style]}>
      {tabs.map((t) => {
        const on = value === t.key;
        const color = on ? pcColors.primary : pcColors.textMuted;
        return (
          <Pressable key={t.key} style={styles.tab} onPress={() => onChange(t.key)}>
            {hasIcons && <TabIcon icon={t.icon} lib={t.lib} color={color} />}
            <Text style={[styles.tabTxt, hasIcons && { marginTop: 4 }, { color }]}>{t.label}</Text>
            {on && <View style={styles.underline} />}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Dropdown ancorat sus-dreapta (Sort). offsetTop se adaugă peste safe-area. */
export function PcAnchoredMenu({ visible, onClose, children, offsetTop = 150, right = 12, width = 300 }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.menu, { top: insets.top + offsetTop, right, width }]}>{children}</View>
      </Pressable>
    </Modal>
  );
}

/** Rând dintr-un PcAnchoredMenu (bifă verde + label). */
export function PcMenuRow({ active, label, onPress }) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <Ionicons name="checkmark" size={20} color={active ? pcColors.primary : "transparent"} />
      <Text style={styles.menuRowTxt}>{label}</Text>
    </Pressable>
  );
}
export function PcMenuSection({ children }) {
  return <Text style={styles.menuSection}>{children}</Text>;
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabTxt: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  underline: { position: "absolute", bottom: 0, height: 2, width: "64%", backgroundColor: pcColors.primary },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  menu: { position: "absolute", backgroundColor: "#2A2A2C", borderRadius: 10, paddingVertical: 6, overflow: "hidden" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16 },
  menuRowTxt: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "600" },
  menuSection: { color: pcColors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
});

export default { PcUnderlineTabs, PcAnchoredMenu, PcMenuRow, PcMenuSection };
