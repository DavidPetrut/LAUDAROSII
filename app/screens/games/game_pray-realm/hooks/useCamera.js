import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { calculateCameraY } from '../utils/positionUtils';

export const useCamera = () => {
  const cameraY = useRef(new Animated.Value(0)).current;

  const updateCamera = useCallback((avatarY) => {
    const newCameraY = calculateCameraY(avatarY);
    cameraY.setValue(newCameraY);
  }, [cameraY]);

  const animateCameraTo = useCallback((avatarY, duration = 300) => {
    const newCameraY = calculateCameraY(avatarY);
    return Animated.timing(cameraY, {
      toValue: newCameraY,
      duration,
      useNativeDriver: true,
    });
  }, [cameraY]);

  return {
    cameraY,
    updateCamera,
    animateCameraTo,
  };
};

