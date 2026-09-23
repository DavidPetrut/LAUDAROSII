import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UserAvatar, RibbonBadge } from "../../../global/components";
import { useTheme } from "../../../global/context";
import { colors, typography, spacing, borderRadius } from "../../../public/styles/global";

const TAG_ICON = require("../../../public/icons/before_tag.png");

const MOOD_LABELS = {
  tulburat: "Ma tulbura mult",
  incredere: "Ma incred in El",
  eliberare: "Nevoie de eliberare",
  voia_lui: "Voia Lui",
  persistent: "Persistent",
  nelinistit: "Ma simt nelinistit",
  astept: "Astept un raspuns",
};

/**
 * Cardul unui motiv dintr-o pray room: arata ca un card normal de rugaciune, dar
 * fara butonul "M-am rugat" (motivele raman pana la expirarea camerei). Autorul
 * propriului motiv vede un buton discret care deschide meniul editeaza/sterge.
 */
export const PrayRoomCard = ({ prayer, isMine, onMenu }) => {
  const { theme } = useTheme();
  const userName = prayer.userId?.personalData?.fullName || "Anonim";
  const userPicture = prayer.userId?.personalData?.profilePicture;
  const date = new Date(prayer.createdAt).toLocaleDateString("ro-RO");

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      {prayer.isUrgent && <RibbonBadge label="URGENT!" />}

      {isMine && (
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => onMenu(prayer)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Optiuni motiv"
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={theme.textMuted} />
        </TouchableOpacity>
      )}

      {prayer.mood && (
        <View style={styles.moodBadge}>
          <Image source={TAG_ICON} style={styles.moodTagImage} />
          <Text style={styles.moodText}>{MOOD_LABELS[prayer.mood]}</Text>
        </View>
      )}

      <Text style={[styles.prayerText, { color: theme.textPrimary }]}>{prayer.text}</Text>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <UserAvatar profilePicture={userPicture} size={24} />
        <View style={styles.userTextInfo}>
          <Text style={[styles.userName, { color: theme.textPrimary }]} numberOfLines={1}>
            {userName}
          </Text>
          <Text style={[styles.date, { color: theme.textMuted }]}>{date}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  menuBtn: { position: "absolute", top: spacing.sm, right: spacing.sm, zIndex: 2, padding: 4 },
  moodBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.sm,
  },
  moodTagImage: { width: 16, height: 16, resizeMode: "contain" },
  moodText: { ...typography.caption, color: "#858484", fontSize: 12 },
  prayerText: { ...typography.body, color: colors.textPrimary, lineHeight: 22, marginTop: spacing.sm },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userTextInfo: { flex: 1 },
  userName: { ...typography.caption, color: colors.textPrimary, fontWeight: "600" },
  date: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
});
