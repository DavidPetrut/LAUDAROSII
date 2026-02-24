import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { colors } from "../../public/styles/global";

/**
 * Component global pentru afișarea avatarului utilizatorului.
 * Afișeaza poza de profil daca exista, altfel emoji-ul default.
 */
export const UserAvatar = ({
  profilePicture,
  size = 48,
  emoji = "👤",
  style,
}) => {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const emojiSize = size * 0.5;

  return (
    <View style={[styles.container, containerStyle, style]}>
      {profilePicture ? (
        <Image
          source={{ uri: profilePicture }}
          style={[styles.image, containerStyle]}
        />
      ) : (
        <Text style={[styles.emoji, { fontSize: emojiSize }]}>{emoji}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    resizeMode: "cover",
  },
  emoji: {
    textAlign: "center",
  },
});
