import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
} from "react-native";
import { UserAvatar, RibbonBadge } from "../../global/components";
import { useTheme } from "../../global/context";
import { PrayedButton } from "./PrayedButton";
import { PrayedCounter } from "./PrayedCounter";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../public/styles/global";

const TAG_ICON = require("../../public/icons/before_tag.png");

// Componenta TrashIcon custom
const TrashIcon = ({ size = 20, color = "#949494" }) => {
  const scale = size / 20;
  return (
    <View style={{ width: size, height: size, alignItems: "center" }}>
      {/* Capac */}
      <View
        style={{
          width: 16 * scale,
          height: 3 * scale,
          backgroundColor: color,
          borderRadius: 1.5 * scale,
        }}
      />
      {/* Mâner */}
      <View
        style={{
          position: "absolute",
          top: -2 * scale,
          width: 6 * scale,
          height: 4 * scale,
          borderWidth: 1.5 * scale,
          borderColor: color,
          borderBottomWidth: 0,
          borderTopLeftRadius: 3 * scale,
          borderTopRightRadius: 3 * scale,
          backgroundColor: "transparent",
        }}
      />
      {/* Corp */}
      <View
        style={{
          width: 12 * scale,
          height: 14 * scale,
          backgroundColor: color,
          borderBottomLeftRadius: 2 * scale,
          borderBottomRightRadius: 2 * scale,
          marginTop: 1 * scale,
        }}
      >
        {/* Linii verticale */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-evenly",
            paddingTop: 3 * scale,
          }}
        >
          <View
            style={{
              width: 1.2 * scale,
              height: 8 * scale,
              backgroundColor: "#2a2a2a",
              borderRadius: 1,
            }}
          />
          <View
            style={{
              width: 1.2 * scale,
              height: 8 * scale,
              backgroundColor: "#2a2a2a",
              borderRadius: 1,
            }}
          />
          <View
            style={{
              width: 1.2 * scale,
              height: 8 * scale,
              backgroundColor: "#2a2a2a",
              borderRadius: 1,
            }}
          />
        </View>
      </View>
    </View>
  );
};

const MOOD_LABELS = {
  tulburat: "Ma tulbura mult",
  incredere: "Ma încred în El",
  eliberare: "Nevoie de eliberare",
  voia_lui: "Voia Lui",
  persistent: "Persistent",
  nelinistit: "Ma simt nelinistit",
  astept: "Aștept un răspuns",
};

const WORD_LIMIT = 18;

export const PrayerCard = ({
  prayer,
  isOwner,
  showPrayedButton,
  showPrayedCount,
  hideUserInfo,
  onPrayed,
  onCustomPray,
  onMarkAnswered,
  onDelete,
  tab = "personal",
  currentUserId,
}) => {
  const { theme, isDarkMode } = useTheme();
  const userName = prayer.userId?.personalData?.fullName || "Anonim";
  const userPicture = prayer.userId?.personalData?.profilePicture;
  const date = new Date(prayer.date || prayer.createdAt).toLocaleDateString(
    "ro-RO"
  );

  const [expanded, setExpanded] = useState(false);
  const animHeight = useRef(new Animated.Value(0)).current;

  const words = prayer.text?.split(/\s+/) || [];
  const isLongText = words.length > WORD_LIMIT;
  const truncatedText = isLongText
    ? words.slice(0, WORD_LIMIT).join(" ")
    : prayer.text;

  useEffect(() => {
    Animated.timing(animHeight, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const toggleExpand = () => setExpanded(!expanded);

  const dynamicStyles = {
    card: { backgroundColor: theme.surface },
    text: { color: theme.textPrimary },
    textMuted: { color: theme.textMuted },
    border: { borderTopColor: theme.border },
  };

  return (
    <View
      style={[
        styles.card,
        dynamicStyles.card,
        prayer.answered && styles.cardAnswered,
      ]}
    >
      {prayer.isUrgent && <RibbonBadge label="URGENT!" />}

      {prayer.mood && (
        <View style={styles.moodBadge}>
          <Image source={TAG_ICON} style={styles.moodTagImage} />
          <Text style={styles.moodText}>{MOOD_LABELS[prayer.mood]}</Text>
        </View>
      )}

      {prayer.isPredicator && (
        <View style={styles.predicatorBadge}>
          <Text style={styles.predicatorText}>🎤 Predicator</Text>
        </View>
      )}

      {isLongText ? (
        <Animated.View
          style={{
            overflow: "hidden",
          }}
        >
          <Text style={[styles.prayerText, dynamicStyles.text]}>
            {expanded ? prayer.text : truncatedText}
            {!expanded && "... "}
            <Text style={styles.readMoreBtn} onPress={toggleExpand}>
              {expanded ? "citeste mai putin" : "citeste mai mult"}
            </Text>
          </Text>
        </Animated.View>
      ) : (
        <Text style={[styles.prayerText, dynamicStyles.text]}>
          {prayer.text}
        </Text>
      )}

      <View style={[styles.footer, dynamicStyles.border]}>
        <View style={styles.userInfo}>
          {!hideUserInfo && (
            <>
              <UserAvatar profilePicture={userPicture} size={24} />
              <View style={styles.userTextInfo}>
                <Text style={[styles.userName, dynamicStyles.text]}>
                  {userName}
                </Text>
                <Text style={[styles.date, dynamicStyles.textMuted]}>
                  {date}
                </Text>
              </View>
            </>
          )}
          {hideUserInfo && (
            <Text style={[styles.date, dynamicStyles.textMuted]}>{date}</Text>
          )}
        </View>

        {prayer.answered && (
          <View style={styles.answeredTag}>
            <Text style={styles.answeredTagText}>✓ Împlinita</Text>
          </View>
        )}

        {showPrayedButton && !isOwner && (
          <PrayedButton
            prayerOwnerId={prayer.userId?._id}
            currentUserId={currentUserId}
            prayerId={prayer._id}
            onPrayed={onPrayed}
            onCustomPray={onCustomPray}
            tab={tab}
            forPerson={!!prayer.forPerson || !!prayer.category}
          />
        )}

        {showPrayedCount && isOwner && (
          <PrayedCounter count={prayer.prayedCount} />
        )}
      </View>

      {isOwner && !prayer.answered && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.answeredBtn} onPress={onMarkAnswered}>
            <Text style={styles.answeredBtnIcon}>✓</Text>
            <Text style={styles.answeredBtnText}>Împlinit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtnNew} onPress={onDelete}>
            <TrashIcon size={20} color="#949494" />
          </TouchableOpacity>
        </View>
      )}
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
  cardAnswered: {
    opacity: 0.7,
    backgroundColor: colors.success + "08",
  },
  urgentBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.error + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  urgentText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: "700",
    fontSize: 10,
  },
  moodBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.sm,
  },
  moodTagImage: {
    width: 16,
    height: 16,
    resizeMode: "contain",
  },
  moodText: {
    ...typography.caption,
    color: "#858484",
    fontSize: 12,
  },
  predicatorBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.warning + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  predicatorText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: "600",
    fontSize: 10,
  },
  prayerText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  readMoreBtn: {
    color: colors.info,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  userTextInfo: {
    flex: 1,
  },
  userName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  date: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  answeredTag: {
    backgroundColor: colors.success + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  answeredTagText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: "600",
    fontSize: 11,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  answeredBtn: {
    flex: 0.7,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.success,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  answeredBtnIcon: {
    color: colors.success,
    fontSize: 18,
    fontWeight: "700",
  },
  answeredBtnText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "600",
  },
  deleteBtnNew: {
    flex: 0.3,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
});
