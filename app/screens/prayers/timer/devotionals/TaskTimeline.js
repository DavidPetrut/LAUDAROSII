import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { DevotionalIcon } from "./DevotionalIcon";

/**
 * Lista de momente ca timeline vertical: iconuri rotunde legate cu linii, timpul
 * la stanga, numele la dreapta si un nod "+" la final pentru adaugare.
 */
export const TaskTimeline = ({ tasks, accent = "#10b981", onEdit, onRemove, onAdd }) => (
  <View>
    {tasks.map((t, i) => {
      const color = t.color || accent;
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
  </View>
);

export default TaskTimeline;
