/** Dropdown Sort (§9 [PEOPLE-SORT]) — SORT BY (First/Last Name) + DIRECTION (A-Z/Z-A). */
import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pcColors } from "../../theme";

export function PeopleSortMenu({ visible, onClose, sortBy, dir, onChange }) {
  const insets = useSafeAreaInsets();
  const Row = ({ active, label, onPress }) => (
    <Pressable style={styles.row} onPress={onPress}>
      <Ionicons name="checkmark" size={20} color={active ? pcColors.primary : "transparent"} />
      <Text style={styles.rowTxt}>{label}</Text>
    </Pressable>
  );
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.menu, { top: insets.top + 150 }]}>
          <Text style={styles.section}>SORT BY</Text>
          <Row active={sortBy === "firstName"} label="First Name" onPress={() => onChange({ sortBy: "firstName" })} />
          <Row active={sortBy === "lastName"} label="Last Name" onPress={() => onChange({ sortBy: "lastName" })} />
          <View style={styles.divider} />
          <Text style={styles.section}>SORT DIRECTION</Text>
          <Row active={dir === "asc"} label="A-Z" onPress={() => onChange({ dir: "asc" })} />
          <Row active={dir === "desc"} label="Z-A" onPress={() => onChange({ dir: "desc" })} />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  menu: { position: "absolute", right: 12, width: 300, backgroundColor: "#2A2A2C", borderRadius: 10, paddingVertical: 6, overflow: "hidden" },
  section: { color: pcColors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16 },
  rowTxt: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: pcColors.divider, marginVertical: 2 },
});

export default PeopleSortMenu;
