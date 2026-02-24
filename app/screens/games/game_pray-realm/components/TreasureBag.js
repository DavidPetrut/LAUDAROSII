import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { GameImages } from "../assets";

const TreasureBag = ({ count, size = "medium", showIcon = true }) => {
  const getSize = () => {
    switch (size) {
      case "small":
        return { icon: 24, text: 12 };
      case "large":
        return { icon: 48, text: 20 };
      default:
        return { icon: 36, text: 16 };
    }
  };

  const sizeConfig = getSize();

  return (
    <View style={styles.container}>
      {showIcon && (
        <Image
          source={GameImages.treasureBag}
          style={[
            styles.icon,
            { width: sizeConfig.icon, height: sizeConfig.icon },
          ]}
          resizeMode="contain"
        />
      )}
      <Text style={[styles.count, { fontSize: sizeConfig.text }]}>{count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 6,
  },
  count: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default React.memo(TreasureBag);
