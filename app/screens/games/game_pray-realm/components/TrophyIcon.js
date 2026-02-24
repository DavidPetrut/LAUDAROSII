import React from 'react';
import { Image } from 'react-native';
import { platformStyles } from '../styles/platformStyles';

const TrophyIcon = ({ trophyImage }) => {
  return (
    <Image
      source={trophyImage}
      style={platformStyles.trophyImage}
      resizeMode="contain"
    />
  );
};

export default React.memo(TrophyIcon);

