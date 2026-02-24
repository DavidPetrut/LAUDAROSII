import { StyleSheet } from 'react-native';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants/dimensions';

export const backgroundStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    zIndex: 0,
  },
  image: {
    width: SCREEN_WIDTH,
    resizeMode: 'cover',
  },
  revealMask: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    overflow: 'hidden',
  },
  revealImage: {
    width: SCREEN_WIDTH,
    resizeMode: 'cover',
  },
});

