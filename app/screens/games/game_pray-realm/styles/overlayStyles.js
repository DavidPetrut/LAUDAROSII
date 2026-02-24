import { StyleSheet } from 'react-native';

export const overlayStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modal: {
    backgroundColor: 'rgba(20,20,20,0.95)',
    padding: 20,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  text: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  treeImage: {
    width: 160,
    height: 160,
  },
  trophyImage: {
    width: 120,
    height: 120,
  },
});

