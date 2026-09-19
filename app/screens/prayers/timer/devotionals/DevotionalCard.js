import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { DevotionalIcon } from "./DevotionalIcon";

/**
 * Card pentru un devotional din lista: iconita colorata, nume, nr. task-uri.
 * Cel default are border verde si un badge. Apasare lunga = meniu de actiuni.
 */
export const DevotionalCard = ({ item, onPress, onLongPress }) => (
  <TouchableOpacity
    style={[styles.devCard, item.isDefault && styles.devCardDefault]}
    onPress={onPress}
    onLongPress={onLongPress}
    delayLongPress={280}
    activeOpacity={0.85}
  >
    <View style={[styles.devCardIcon, { backgroundColor: item.color + "22" }]}>
      <DevotionalIcon set={item.iconSet} name={item.icon} size={28} color={item.color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.devCardName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.devCardMeta}>
        {item.tasks?.length || 0} momente{item.dueToday ? " · azi" : ""}
      </Text>
    </View>
    {item.isDefault && (
      <View style={styles.defaultBadge}>
        <Ionicons name="checkmark-circle" size={14} color="#10b981" />
        <Text style={styles.defaultBadgeText}>Activ</Text>
      </View>
    )}
  </TouchableOpacity>
);

export default DevotionalCard;
