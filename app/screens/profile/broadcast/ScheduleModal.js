import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { broadcastStyles as styles } from "./broadcastStyles";
import { colors } from "../../../public/styles/global";

const MONTHS = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
const WD = ["L", "M", "M", "J", "V", "S", "D"];
const pad = (n) => n.toString().padStart(2, "0");
const startOfMonth = (y, m) => (new Date(y, m, 1).getDay() + 6) % 7;

/**
 * Popup de programare: calendar pe luni (fara zile trecute) + ora, pentru a alege
 * momentul viitor la care sa fie trimisa notificarea.
 */
export const ScheduleModal = ({ visible, onConfirm, onClose }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [day, setDay] = useState(null);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = startOfMonth(year, month);
  const isPastMonth = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth());

  const prevMonth = () => {
    if (isPastMonth) return;
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
    setDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
    setDay(null);
  };

  const isPastDay = (d) => {
    const date = new Date(year, month, d, 23, 59);
    return date < now;
  };

  const stepHour = (delta) => setHour((h) => (h + delta + 24) % 24);
  const stepMinute = (delta) => setMinute((m) => (m + delta + 60) % 60);

  const confirm = () => {
    if (!day) return;
    onConfirm(new Date(year, month, day, hour, minute, 0));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Programează notificarea</Text>

          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} disabled={isPastMonth}>
              <Ionicons name="chevron-back" size={24} color={isPastMonth ? colors.border : colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={nextMonth}>
              <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.dayGrid}>
            {WD.map((w, i) => (
              <View key={`wd${i}`} style={[styles.dayCell, { backgroundColor: "transparent", borderColor: "transparent" }]}>
                <Text style={styles.dayCellText}>{w}</Text>
              </View>
            ))}
            {Array.from({ length: offset }).map((_, i) => (
              <View key={`o${i}`} style={[styles.dayCell, { backgroundColor: "transparent", borderColor: "transparent" }]} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const past = isPastDay(d);
              const active = day === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayCell, active && styles.dayCellActive, past && { opacity: 0.3 }]}
                  onPress={() => !past && setDay(d)}
                  disabled={past}
                >
                  <Text style={[styles.dayCellText, active && styles.dayCellTextActive]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Ora</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <TouchableOpacity onPress={() => stepHour(-1)}><Ionicons name="remove-circle-outline" size={28} color={colors.textPrimary} /></TouchableOpacity>
            <Text style={styles.monthLabel}>{pad(hour)}:{pad(minute)}</Text>
            <TouchableOpacity onPress={() => stepHour(1)}><Ionicons name="add-circle-outline" size={28} color={colors.textPrimary} /></TouchableOpacity>
            <View style={{ width: 12 }} />
            <TouchableOpacity onPress={() => stepMinute(-5)}><Text style={styles.linkText}>−5m</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => stepMinute(5)}><Text style={styles.linkText}>+5m</Text></TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, !day && styles.disabled]} onPress={confirm} disabled={!day}>
            <Text style={styles.primaryBtnText}>Programează</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
            <Text style={styles.ghostBtnText}>Anulează</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ScheduleModal;
