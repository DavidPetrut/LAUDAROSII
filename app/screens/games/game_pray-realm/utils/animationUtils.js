import { Animated, Easing } from 'react-native';

export const createSmoothAnimation = (animatedValue, toValue, duration = 300) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.out(Easing.ease),
    useNativeDriver: true,
  });
};

export const createLoopAnimation = (animatedValue, config = {}) => {
  const { duration = 1000, toValue = 1 } = config;
  
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue,
        duration: duration / 2,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: duration / 2,
        useNativeDriver: true,
      }),
    ])
  );
};

export const interpolateValue = (current, target, factor) => {
  return current + (target - current) * factor;
};

