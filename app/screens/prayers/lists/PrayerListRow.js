import React from "react";
import { View, Text, TouchableOpacity, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { listsStyles as styles } from "./listsStyles";

/**
 * Un row din grila de liste: imagine de fundal + bara cu titlu si numar de motive.
 * Lista publica primeste border special si un badge; listele expirate arata un pill.
 */
export const PrayerListRow = ({ title, image, isPublic, expired, count, onPress, onLongPress }) => {
  return (
    <TouchableOpacity
      style={[styles.row, isPublic && styles.rowPublic]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      activeOpacity={0.88}
    >
      <ImageBackground source={image || undefined} style={styles.rowBg} resizeMode="cover">
        <View style={styles.rowOverlay} />

        {isPublic && (
          <View style={styles.publicBadge}>
            <Ionicons name="earth" size={12} color="#1e293b" />
            <Text style={styles.publicBadgeText}>PUBLIC</Text>
          </View>
        )}

        <View style={styles.rowBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.rowMeta}>
              {count} {count === 1 ? "motiv" : "motive"}
              {isPublic ? " · max 3" : ""}
            </Text>
          </View>
          {expired && (
            <View style={styles.expiredPill}>
              <Text style={styles.expiredPillText}>EXPIRATĂ</Text>
            </View>
          )}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

export default PrayerListRow;
