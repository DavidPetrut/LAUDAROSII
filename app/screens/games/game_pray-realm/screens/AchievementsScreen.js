import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
} from "react-native";
import { achievementsStyles as styles } from "./styles/achievementsStyles";
import GalleryCard from "../components/GalleryCard";
import { GameImages } from "../assets";
import { PlayerApi } from "../api/playerApi";
import { ACHIEVEMENTS } from "../data/achievements";

// Ecranul principal de galerie - afiseaza achievementurile castigate sau colectia
const AchievementsScreen = ({ userId, onBack }) => {
  const [showCollection, setShowCollection] = useState(false);
  const [playerAchievements, setPlayerAchievements] = useState({
    unlocked: [],
    unlockedAt: {},
  });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      setPlayerAchievements(player.achievements);
    } catch (error) {
      console.error("Error loading achievements:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const unlockedAchievements = ACHIEVEMENTS.filter((a) =>
    playerAchievements.unlocked.includes(a.id)
  );
  const lockedAchievements = ACHIEVEMENTS.filter(
    (a) => !playerAchievements.unlocked.includes(a.id)
  );

  const displayedAchievements = showCollection
    ? lockedAchievements
    : unlockedAchievements;

  // Pattern 2-1-2-1-2 - acelas grid pentru galerie si colectie
  const renderGridRows = () => {
    const rows = [];
    let index = 0;
    let rowIndex = 0;
    const maxRows = 5;

    while (index < displayedAchievements.length && rowIndex < maxRows) {
      const isDoubleRow = rowIndex % 2 === 0;
      const itemsInRow = isDoubleRow ? 2 : 1;
      const rowItems = displayedAchievements.slice(index, index + itemsInRow);

      rows.push(
        <View
          key={`row-${rowIndex}`}
          style={[
            styles.gridRow,
            isDoubleRow ? styles.gridRowDouble : styles.gridRowSingle,
          ]}
        >
          {rowItems.map((achievement) => (
            <GalleryCard
              key={achievement.id}
              achievement={achievement}
              isUnlocked={!showCollection}
              unlockedAt={playerAchievements.unlockedAt[achievement.id]}
            />
          ))}
        </View>
      );

      index += itemsInRow;
      rowIndex++;
    }

    return rows;
  };

  return (
    <ImageBackground
      source={GameImages.bgGalerie}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onBack}
          accessibilityLabel="Închide galeria"
          accessibilityRole="button"
        >
          <Image
            source={GameImages.xButton}
            style={styles.closeIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>{renderGridRows()}</View>

        {displayedAchievements.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {showCollection
                ? "Ai deblocat toate achievementurile!"
                : "Nu ai deblocat niciun achievement încă."}
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.collectionButton}
        onPress={() => setShowCollection(!showCollection)}
        accessibilityLabel={
          showCollection ? "Înapoi la galerie" : "Vezi colecția"
        }
        accessibilityRole="button"
      >
        <Image
          source={
            showCollection ? GameImages.btnGalerieSectie : GameImages.btnColectie
          }
          style={styles.collectionButtonImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </ImageBackground>
  );
};

export default AchievementsScreen;
