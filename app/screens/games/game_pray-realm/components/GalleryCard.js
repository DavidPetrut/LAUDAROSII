import React from "react";
import { View, Image, ImageBackground } from "react-native";
import { galleryCardStyles as styles } from "../screens/styles/achievementsStyles";
import { GameImages } from "../assets";

// Card pentru galerie cu rama de lemn - afiseaza achievementul inauntrul ramei
const GalleryCard = ({ achievement, isUnlocked }) => {
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

  return (
    <ImageBackground
      source={GameImages.cardAchievementFrame}
      style={styles.frameContainer}
      resizeMode="contain"
    >
      <View style={styles.innerContent}>
        <Image
          source={getAchievementImage()}
          style={[styles.achievementImage, !isUnlocked && styles.lockedImage]}
          resizeMode="contain"
        />
      </View>
    </ImageBackground>
  );
};

export default React.memo(GalleryCard);
