import React from "react";
import { View, Text, Image } from "react-native";
import { achievementCardStyles as styles } from "../screens/styles/achievementsStyles";
import { GameImages } from "../assets";

const AchievementCard = ({ achievement, isUnlocked, unlockedAt }) => {
  const getAchievementImage = () => {
    switch (achievement.icon) {
      case "trophy":
        return GameImages.trophy;
      case "tree":
        return GameImages.tree;
      case "hammer":
        return GameImages.hammer;
      default:
        return GameImages.trophy;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <View style={[styles.card, isUnlocked && styles.cardUnlocked]}>
      <View style={styles.imageContainer}>
        <Image
          source={getAchievementImage()}
          style={styles.achievementImage}
          resizeMode="contain"
        />
        {!isUnlocked && (
          <View style={styles.lockedOverlay}>
            <Text style={styles.lockedIcon}>🔒</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.achievementName}>{achievement.name}</Text>
        <Text style={styles.achievementDescription} numberOfLines={2}>
          {achievement.description}
        </Text>
        {isUnlocked && unlockedAt && (
          <Text style={styles.unlockedDate}>
            Deblocat: {formatDate(unlockedAt)}
          </Text>
        )}
      </View>
    </View>
  );
};

export default React.memo(AchievementCard);
