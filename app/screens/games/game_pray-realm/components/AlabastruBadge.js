import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { GameImages } from "../assets";

const AlabastruBadge = ({ amount, size = "medium", showPlus = false }) => {
  const getSize = () => {
    switch (size) {
      case "small":
        return { icon: 16, text: 12 };
      case "large":
        return { icon: 28, text: 18 };
      default:
        return { icon: 20, text: 14 };
    }
  };

  const sizeConfig = getSize();

  return (
    <View style={styles.container}>
      <Image
        source={GameImages.alabastru}
        style={[
          styles.icon,
          { width: sizeConfig.icon, height: sizeConfig.icon },
        ]}
        resizeMode="contain"
      />
      <Text style={[styles.amount, { fontSize: sizeConfig.text }]}>
        {showPlus && amount > 0 ? "+" : ""}
        {amount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 4,
  },
  amount: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default React.memo(AlabastruBadge);
