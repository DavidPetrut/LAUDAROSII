import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography, spacing, borderRadius } from "../../../public/styles/global";

const ACCENT = "#21c063";

/**
 * Mic meniu popover ancorat langa butonul "+" din dreapta jos: doua optiuni
 * (motiv nou / motiv existent) in acelasi limbaj vizual verde ca restul camerei.
 */
export const AddPrayerMenu = ({ visible, onClose, onNew, onExisting }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.item} onPress={onNew} activeOpacity={0.85}>
            <View style={styles.iconWrap}>
              <Ionicons name="create-outline" size={18} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Motiv nou</Text>
              <Text style={styles.itemDesc}>Scrie un motiv de la zero</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.item} onPress={onExisting} activeOpacity={0.85}>
            <View style={styles.iconWrap}>
              <Ionicons name="bookmark-outline" size={18} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Motiv existent</Text>
              <Text style={styles.itemDesc}>Alege din listele tale</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end", alignItems: "flex-end" },
  card: {
    marginRight: spacing.lg,
    marginBottom: 156,
    width: 236,
    backgroundColor: "#1f2937",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  iconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(33,192,99,0.15)", alignItems: "center", justifyContent: "center",
  },
  itemTitle: { ...typography.body, color: "#e5e7eb", fontWeight: "700" },
  itemDesc: { ...typography.caption, color: "rgba(229,231,235,0.6)", marginTop: 1 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: spacing.md },
});
