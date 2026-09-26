import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../global/context";
import { ROLE_META } from "./appControlStyles";

// Rolurile acordabile, ordonate dupa severitate (fara super-admin).
export const ASSIGNABLE_ROLES = ["admin", "developer", "editor", "user"];

/**
 * Dropdown de selectie a rolului: un buton cu rolul curent care deschide o lista.
 * Nu include super-admin (nu se acorda din aplicatie).
 */
export const RoleDropdown = ({ value, options = ASSIGNABLE_ROLES, onSelect, placeholder = "Alege rolul" }) => {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const meta = value ? ROLE_META[value] : null;

  return (
    <>
      <TouchableOpacity
        style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
      >
        {meta ? (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: meta.color }]} />
            <Text style={[styles.value, { color: theme.textPrimary }]}>{meta.label}</Text>
          </View>
        ) : (
          <Text style={[styles.value, { color: theme.textMuted }]}>{placeholder}</Text>
        )}
        <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {options.map((r) => {
              const rm = ROLE_META[r];
              const active = value === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={styles.item}
                  onPress={() => { setOpen(false); if (r !== value) onSelect(r); }}
                >
                  <View style={[styles.dot, { backgroundColor: rm.color }]} />
                  <Text style={[styles.itemText, { color: theme.textPrimary }]}>{rm.label}</Text>
                  {active && <Ionicons name="checkmark" size={18} color={rm.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  value: { fontSize: 15, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 340, borderRadius: 16, borderWidth: 1, paddingVertical: 6 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  itemText: { flex: 1, fontSize: 16, fontWeight: "600" },
});
