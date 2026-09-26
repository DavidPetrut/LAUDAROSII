import React from "react";
import { View, Text, TouchableOpacity, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { DevotionalIcon } from "./DevotionalIcon";
import { resolveImage } from "./devotionalImages";
import { daysBadge } from "./weekdays";

/**
 * Card pentru un devotional din lista. Cu imagine: imaginea e fundal full-container
 * si numele apare intr-o bara neagra jos. Fara imagine: fallback pe iconita colorata.
 * Cel default are border verde. Apasare lunga = meniu de actiuni.
 */
export const DevotionalCard = ({ item, onPress, onLongPress }) => {
  const source = resolveImage(item.image);
  const days = daysBadge(item.schedule?.weekdays);
  const highlight = days.length > 0 || item.isDefault;
  const badgeText = days.length > 0 ? days.join(" ") : item.isDefault ? "Activ" : "";

  if (source) {
    return (
      <TouchableOpacity
        style={[styles.devImageCard, highlight && styles.devCardDefault]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={280}
        activeOpacity={0.85}
      >
        <ImageBackground source={source} style={styles.devImageBg} imageStyle={styles.headerImageRadius}>
          {!!badgeText && (
            <View style={styles.devImageBadge}>
              <Ionicons name="calendar" size={13} color="#10b981" />
              <Text style={styles.defaultBadgeText}>{badgeText}</Text>
            </View>
          )}
          <View style={styles.devImageBar}>
            <Text style={styles.devImageName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.devImageMeta}>
              {item.tasks?.length || 0} momente{item.dueToday ? " · azi" : ""}
            </Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.devCard, highlight && styles.devCardDefault]}
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
      {!!badgeText && (
        <View style={styles.defaultBadge}>
          <Ionicons name="calendar" size={13} color="#10b981" />
          <Text style={styles.defaultBadgeText}>{badgeText}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default DevotionalCard;
