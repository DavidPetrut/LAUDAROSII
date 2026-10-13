/**
 * PcDatePicker — calendar lunar pur JS (fără dep nativ), Mon-first ca în PCO.
 * PcDateField — câmp care deschide calendarul. value/onChange în format „YYYY-MM-DD".
 */
import React, { useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { pcColors, pcRadius } from "../../theme";

const WD = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n) => String(n).padStart(2, "0");
const toStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function formatDateLabel(str) {
  if (!str) return "";
  const [y, m, d] = str.split("-").map(Number);
  if (!y) return str;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function PcDatePicker({ visible, onClose, value, onChange }) {
  const today = new Date();
  const init = value ? value.split("-").map(Number) : [today.getFullYear(), today.getMonth() + 1, today.getDate()];
  const [vy, setVy] = useState(init[0]);
  const [vm, setVm] = useState(init[1] - 1); // 0-11

  const firstDow = (new Date(vy, vm, 1).getDay() + 6) % 7; // Mon=0
  const daysIn = new Date(vy, vm + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);

  const prev = () => (vm === 0 ? (setVy(vy - 1), setVm(11)) : setVm(vm - 1));
  const nextM = () => (vm === 11 ? (setVy(vy + 1), setVm(0)) : setVm(vm + 1));

  const isToday = (d) => vy === today.getFullYear() && vm === today.getMonth() && d === today.getDate();
  const isSelected = (d) => value === toStr(vy, vm, d);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.head}>
            <Text style={styles.title}>{MONTHS[vm]} {vy}</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pressable style={styles.navBtn} onPress={prev}><Ionicons name="chevron-back" size={18} color={pcColors.textPrimary} /></Pressable>
              <Pressable style={styles.navBtn} onPress={nextM}><Ionicons name="chevron-forward" size={18} color={pcColors.textPrimary} /></Pressable>
            </View>
          </View>
          <View style={styles.weekRow}>
            {WD.map((w) => <Text key={w} style={styles.wd}>{w}</Text>)}
          </View>
          <View style={styles.grid}>
            {cells.map((d, i) => (
              <View key={i} style={styles.cell}>
                {d ? (
                  <Pressable
                    style={[styles.day, isSelected(d) && styles.daySel]}
                    onPress={() => { onChange(toStr(vy, vm, d)); onClose(); }}
                  >
                    <Text style={[styles.dayTxt, isSelected(d) && styles.dayTxtSel, isToday(d) && !isSelected(d) && styles.dayToday]}>{d}</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function PcDateField({ value, onChange, placeholder = "Alege data", style }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={[styles.field, style]} onPress={() => setOpen(true)}>
        <Text style={[styles.fieldTxt, !value && { color: pcColors.textMuted }]}>{value ? formatDateLabel(value) : placeholder}</Text>
        <Ionicons name="calendar-outline" size={18} color={pcColors.textMuted} />
      </Pressable>
      <PcDatePicker visible={open} onClose={() => setOpen(false)} value={value} onChange={onChange} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: pcColors.overlay, alignItems: "center", justifyContent: "center", padding: 28 },
  card: { backgroundColor: "#2A2A2C", borderRadius: 14, padding: 16, width: "100%", maxWidth: 360 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700" },
  navBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#3A3A3C", alignItems: "center", justifyContent: "center" },
  weekRow: { flexDirection: "row" },
  wd: { flex: 1, textAlign: "center", color: pcColors.textMuted, fontSize: 11, fontWeight: "700", marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  daySel: { backgroundColor: pcColors.primary },
  dayTxt: { color: pcColors.textPrimary, fontSize: 15 },
  dayTxtSel: { color: "#0A0A0A", fontWeight: "800" },
  dayToday: { color: pcColors.primary, fontWeight: "800" },
  field: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: pcRadius.md, paddingHorizontal: 12, height: 48 },
  fieldTxt: { color: pcColors.textPrimary, fontSize: 16, flex: 1 },
});

export default { PcDatePicker, PcDateField, formatDateLabel };
