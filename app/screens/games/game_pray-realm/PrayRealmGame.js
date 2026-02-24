import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Animated } from "react-native";
import { gameStyles } from "./styles/gameStyles";
import { GameWorld, WinOverlay } from "./components";
import {
  useGameState,
  useCamera,
  useReveal,
  useAvatarMovement,
  useGameLoop,
} from "./hooks";
import { calculateAvatarStandY, calculateCameraY } from "./utils/positionUtils";
import { MAX_LEVEL, PAUSE_TIME } from "./constants/gameConfig";

const DEFAULT_AVATAR = require("./assets/tree.png");

const PrayRealmGame = ({ avatarImage = DEFAULT_AVATAR, onGameComplete }) => {
  const gameState = useGameState();
  const { currentLevel, targetLevel, isPaused, isFinished } = gameState;

  const { cameraY, updateCamera } = useCamera();
  const { revealProgress, isFullyRevealed, forceFullReveal } =
    useReveal(currentLevel);

  const avatarY = useRef(
    new Animated.Value(calculateAvatarStandY(currentLevel))
  ).current;
  const animationRef = useRef(null);
  const pauseTimeoutRef = useRef(null);

  const handleFinished = useCallback(() => {
    gameState.setFinished();
    forceFullReveal();
    onGameComplete?.();
  }, [gameState, forceFullReveal, onGameComplete]);

  const moveToNextLevel = useCallback(() => {
    if (isFinished) return;

    const targetY = calculateAvatarStandY(targetLevel);
    const isFinalLevel = targetLevel === MAX_LEVEL;
    const speed = isFinalLevel ? 0.6 : 1.3;

    const currentY = avatarY._value;
    const distance = Math.abs(currentY - targetY);
    const duration = distance / speed;

    animationRef.current = Animated.timing(avatarY, {
      toValue: targetY,
      duration: duration,
      useNativeDriver: true,
    });

    animationRef.current.start(({ finished }) => {
      if (finished) {
        gameState.setPaused(true);

        if (targetLevel === MAX_LEVEL) {
          setTimeout(() => handleFinished(), 600);
        } else {
          pauseTimeoutRef.current = setTimeout(() => {
            gameState.advanceLevel();
            gameState.setPaused(false);
          }, PAUSE_TIME);
        }
      }
    });
  }, [avatarY, targetLevel, isFinished, gameState, handleFinished]);

  useEffect(() => {
    const initialY = calculateAvatarStandY(currentLevel);
    avatarY.setValue(initialY);
    updateCamera(initialY);
  }, []);

  useEffect(() => {
    if (!isPaused && !isFinished) {
      moveToNextLevel();
    }
  }, [targetLevel, isPaused, isFinished, moveToNextLevel]);

  useEffect(() => {
    const listenerId = avatarY.addListener(({ value }) => {
      updateCamera(value);
    });

    return () => {
      avatarY.removeListener(listenerId);
    };
  }, [avatarY, updateCamera]);

  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  const handleOverlayClose = useCallback(() => {
    gameState.resetGame();
    const initialY = calculateAvatarStandY(1);
    avatarY.setValue(initialY);
    updateCamera(initialY);
  }, [gameState, avatarY, updateCamera]);

  return (
    <View style={gameStyles.container}>
      <GameWorld
        avatarY={avatarY}
        cameraY={cameraY}
        currentLevel={currentLevel}
        revealProgress={revealProgress}
        isFullyRevealed={isFullyRevealed}
        avatarImage={avatarImage}
      />

      <WinOverlay visible={isFinished} onClose={handleOverlayClose} />
    </View>
  );
};

export default PrayRealmGame;
