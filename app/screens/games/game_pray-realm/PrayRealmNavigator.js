import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import {
  GameEntry,
  MainMenu,
  ChallengesScreen,
  PrayerShopScreen,
  AchievementsScreen,
  GamePlayScreen,
} from "./screens";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";
import { PlayerApi } from "./api/playerApi";
import { StageIntro, GameTransition } from "./stages";

const SCREENS = {
  ENTRY: "ENTRY",
  MENU: "MENU",
  GAME: "GAME",
  CHALLENGES: "CHALLENGES",
  SHOP: "SHOP",
  ACHIEVEMENTS: "ACHIEVEMENTS",
};

const PrayRealmNavigatorInner = ({ userId, userAvatar, onExit }) => {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.ENTRY);
  const [showEntry, setShowEntry] = useState(true);
  const [showStageIntro, setShowStageIntro] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const { player, loading, isNewPlayer, refreshPlayer } = usePlayer();

  const currentStage = player?.progress?.currentStage || 1;
  const watchedIntros = player?.progress?.stageIntrosWatched || [];

  const handleEntryComplete = useCallback(() => {
    setShowEntry(false);
    setCurrentScreen(SCREENS.MENU);
  }, []);

  const handleStartGame = useCallback(async () => {
    const hasWatched = watchedIntros.includes(currentStage);

    if (!hasWatched) {
      // Marchează intro-ul ca văzut ACUM (înainte să înceapă)
      await PlayerApi.markStageIntroWatched(userId, currentStage);
      await refreshPlayer();
      setShowStageIntro(true);
    } else {
      // Trece direct la joc cu tranziție
      setCurrentScreen(SCREENS.GAME);
      setShowTransition(true);
    }
  }, [watchedIntros, currentStage, userId, refreshPlayer]);

  const handleIntroComplete = useCallback(() => {
    setShowStageIntro(false);
    setCurrentScreen(SCREENS.GAME);
  }, []);

  const handleTransitionComplete = useCallback(() => {
    setShowTransition(false);
  }, []);

  const handleChallenges = useCallback(() => {
    setCurrentScreen(SCREENS.CHALLENGES);
  }, []);

  const handlePrayerShop = useCallback(() => {
    setCurrentScreen(SCREENS.SHOP);
  }, []);

  const handleAchievements = useCallback(() => {
    setCurrentScreen(SCREENS.ACHIEVEMENTS);
  }, []);

  const handleBack = useCallback(() => {
    refreshPlayer();
    setCurrentScreen(SCREENS.MENU);
  }, [refreshPlayer]);

  const handleExit = useCallback(() => {
    onExit?.();
  }, [onExit]);

  const handleAlabastUpdate = useCallback(() => {
    refreshPlayer();
  }, [refreshPlayer]);

  const handleLevelUnlocked = useCallback(
    async (level) => {
      await refreshPlayer();
      // Check for break level achievements
      if ([5, 10, 15, 20, 25].includes(level)) {
        await PlayerApi.unlockAchievement(userId, `break_level_${level}`);
      }
    },
    [userId, refreshPlayer]
  );

  const handleStageComplete = useCallback(async () => {
    await PlayerApi.completeStage(userId, 1);
    await refreshPlayer();
  }, [userId, refreshPlayer]);

  if (loading && currentScreen === SCREENS.MENU) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {showEntry && <GameEntry onEntryComplete={handleEntryComplete} />}

      {!showEntry && currentScreen === SCREENS.MENU && (
        <MainMenu
          userId={userId}
          isNewPlayer={!watchedIntros.includes(currentStage)}
          alabastruCount={player?.alabastru?.current || 0}
          onStartGame={handleStartGame}
          onChallenges={handleChallenges}
          onPrayerShop={handlePrayerShop}
          onAchievements={handleAchievements}
          onExit={handleExit}
        />
      )}

      {currentScreen === SCREENS.GAME && (
        <GamePlayScreen
          userId={userId}
          avatarImage={userAvatar ? { uri: userAvatar } : null}
          initialLevel={player?.progress?.currentLevel || 1}
          alabastruCount={player?.alabastru?.current || 0}
          unlockedLevels={player?.progress?.unlockedLevels || [1]}
          onBack={handleBack}
          onLevelUnlocked={handleLevelUnlocked}
          onStageComplete={handleStageComplete}
          onAlabastUpdate={handleAlabastUpdate}
        />
      )}

      {currentScreen === SCREENS.CHALLENGES && (
        <ChallengesScreen
          userId={userId}
          onBack={handleBack}
          onAlabastUpdate={handleAlabastUpdate}
        />
      )}

      {currentScreen === SCREENS.SHOP && (
        <PrayerShopScreen
          userId={userId}
          onBack={handleBack}
          onAlabastUpdate={handleAlabastUpdate}
        />
      )}

      {currentScreen === SCREENS.ACHIEVEMENTS && (
        <AchievementsScreen userId={userId} onBack={handleBack} />
      )}

      <StageIntro
        stageId={currentStage}
        visible={showStageIntro}
        onComplete={handleIntroComplete}
      />

      <GameTransition
        visible={showTransition}
        onComplete={handleTransitionComplete}
      />
    </View>
  );
};

const PrayRealmNavigator = ({ userId, userAvatar, onExit }) => {
  return (
    <PlayerProvider userId={userId}>
      <PrayRealmNavigatorInner
        userId={userId}
        userAvatar={userAvatar}
        onExit={onExit}
      />
    </PlayerProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
});

export default PrayRealmNavigator;
