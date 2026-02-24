import React from 'react';
import { Animated, View, Image } from 'react-native';
import { avatarStyles } from '../styles/avatarStyles';

const Avatar = ({ avatarY, cameraY, avatarImage }) => {
  const translateY = Animated.subtract(avatarY, cameraY);

  return (
    <Animated.View
      style={[
        avatarStyles.container,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={avatarStyles.imageWrapper}>
        <Image source={avatarImage} style={avatarStyles.image} />
      </View>
    </Animated.View>
  );
};

export default React.memo(Avatar);

