import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { UserAvatar } from "../../../global/components";
import { useTheme } from "../../../global/context";
import { prayRoomStyles as styles } from "./styles";

export const PrayRoomCard = ({ prayer, canPray, isCompleted, onPray }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.prayerCard, { backgroundColor: theme.surface }]}>
      <View style={styles.prayerHeader}>
        <UserAvatar
          profilePicture={prayer.userId?.personalData?.profilePicture}
          size={36}
        />
        <Text style={[styles.prayerAuthor, { color: theme.textPrimary }]}>
          {prayer.userId?.personalData?.fullName || "Anonim"}
        </Text>
      </View>
      <Text style={[styles.prayerText, { color: theme.textPrimary }]}>
        {prayer.text}
      </Text>
      {canPray && !isCompleted && (
        <TouchableOpacity style={styles.prayBtn} onPress={() => onPray(prayer._id)}>
          <Text style={styles.prayBtnText}>M-am rugat</Text>
        </TouchableOpacity>
      )}
      {isCompleted && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>Te-ai rugat pentru acest motiv</Text>
        </View>
      )}
    </View>
  );
};
