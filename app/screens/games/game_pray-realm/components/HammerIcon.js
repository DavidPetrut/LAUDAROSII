import React from 'react';
import { Image } from 'react-native';
import { platformStyles } from '../styles/platformStyles';

const HammerIcon = ({ hammerImage }) => {
  return (
    <Image
      source={hammerImage}
      style={platformStyles.hammerImage}
      resizeMode="contain"
    />
  );
};

export default React.memo(HammerIcon);

