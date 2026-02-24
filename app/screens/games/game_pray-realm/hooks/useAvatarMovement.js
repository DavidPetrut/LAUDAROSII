import { useRef, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';
import { calculateAvatarStandY } from '../utils/positionUtils';
import { MOVE_SPEED, MOVE_SPEED_FINAL, PAUSE_TIME, MAX_LEVEL } from '../constants/gameConfig';

export const useAvatarMovement = (currentLevel, targetLevel, isPaused, onLevelReached, onFinished) => {
  const avatarY = useRef(new Animated.Value(calculateAvatarStandY(currentLevel))).current;
  const animationRef = useRef(null);

  const moveToLevel = useCallback((level) => {
    const targetY = calculateAvatarStandY(level);
    const isFinalLevel = level === MAX_LEVEL;
    const speed = isFinalLevel ? MOVE_SPEED_FINAL : MOVE_SPEED;
    
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
        if (level === MAX_LEVEL) {
          setTimeout(() => onFinished?.(), 600);
        } else {
          onLevelReached?.(level);
        }
      }
    });
  }, [avatarY, onLevelReached, onFinished]);

  const stopMovement = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
  }, []);

  const resetToLevel = useCallback((level) => {
    stopMovement();
    avatarY.setValue(calculateAvatarStandY(level));
  }, [avatarY, stopMovement]);

  useEffect(() => {
    if (!isPaused && targetLevel > currentLevel) {
      moveToLevel(targetLevel);
    }
  }, [targetLevel, currentLevel, isPaused, moveToLevel]);

  return {
    avatarY,
    moveToLevel,
    stopMovement,
    resetToLevel,
  };
};

