import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { DevotionalIcon } from "./DevotionalIcon";

/**
 * Lista de momente ca timeline vertical. Fiecare moment are un cluster de iconite
 * (muzica / lista de rugaciuni / "mai multe") in stanga butonului de stergere.
 * Cand momentul are functii atasate, butonul "mai multe" devine 3 puncte; altfel
 * e un creion discret. Meniul ofera editarea momentului si alegerea unei liste.
 */
export const TaskTimeline = ({ tasks, accent = "#10b981", onEdit, onRemove, onAdd, onPickList }) => {
  const [menu, setMenu] = useState(null);

  return (
    <View>
      {tasks.map((t, i) => {
        const color = t.color || accent;
        const hasMusic = !!t.music?.enabled;
        const hasList = !!t.prayerList?.kind;
        const hasAny = hasMusic || hasList;
        return (
          <View key={`${t.title}-${i}`} style={styles.tlRow}>
            <Text style={styles.tlTime}>{t.durationMin}m</Text>
            <View style={styles.tlNodeCol}>
              {i > 0 && <View style={styles.tlLineTop} />}
              <View style={styles.tlLineBottom} />
              <View style={[styles.tlNode, { backgroundColor: color }]}>
                <DevotionalIcon set={t.iconSet} name={t.icon} size={20} color="#fff" />
              </View>
            </View>
            <TouchableOpacity style={styles.tlContent} onPress={() => onEdit(i)} activeOpacity={0.8}>
              <Text style={styles.tlTitle} numberOfLines={1}>{t.title}</Text>
              <Text style={styles.tlMeta}>{t.durationMin} minute</Text>
            </TouchableOpacity>

            <View style={styles.tlActions}>
              {hasMusic && (
                <TouchableOpacity style={styles.tlActionBtn} onPress={() => onEdit(i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="musical-notes" size={16} color={color} />
                </TouchableOpacity>
              )}
              {hasList && (
                <TouchableOpacity style={styles.tlActionBtn} onPress={() => onPickList(i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="list" size={16} color="#10b981" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.tlActionBtn} onPress={() => setMenu(i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name={hasAny ? "ellipsis-horizontal" : "create-outline"} size={16} color="rgba(229,231,235,0.7)" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => onRemove(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.35)" />
            </TouchableOpacity>
          </View>
        );
      })}

      <View style={styles.tlRow}>
        <Text style={styles.tlTime} />
        <View style={styles.tlNodeCol}>
          {tasks.length > 0 && <View style={styles.tlLineTop} />}
          <TouchableOpacity style={styles.tlAddNode} onPress={onAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={24} color="#10b981" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.tlContent} onPress={onAdd} activeOpacity={0.8}>
          <Text style={styles.tlAddLabel}>Adaugă un moment</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenu(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuHeader} numberOfLines={1}>
              {menu !== null ? tasks[menu]?.title : ""}
            </Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { const i = menu; setMenu(null); onEdit(i); }}
            >
              <Ionicons name="create-outline" size={20} color="#e5e7eb" />
              <Text style={styles.menuItemText}>Editează momentul</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { const i = menu; setMenu(null); onPickList(i); }}
            >
              <Ionicons name="list-outline" size={20} color="#10b981" />
              <Text style={styles.menuItemText}>
                {menu !== null && tasks[menu]?.prayerList?.kind ? "Schimbă lista de rugăciuni" : "Adaugă listă de rugăciuni"}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default TaskTimeline;
