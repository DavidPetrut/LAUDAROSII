import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackArrowIcon } from "./BackArrowIcon";
import { colors, spacing, headerGradient } from "../../public/styles/global";

/**
 * Header global consistent pentru toate ecranele cu back button
 * Gradient subtil modern, text alb
 */
export const ScreenHeader = ({
  title,
  subtitle,
  showBack = true,
  rightComponent,
  onBack,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const canGoBack = navigation.canGoBack();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  return (
    <LinearGradient
      colors={headerGradient.colors}
      start={headerGradient.start}
      end={headerGradient.end}
      style={[styles.container, { paddingTop: insets.top + spacing.md }]}
    >
      {showBack && canGoBack ? (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          accessibilityLabel="Înapoi"
        >
          <BackArrowIcon size={32} light />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      <View style={styles.headerInfo}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <View style={styles.rightSection}>{rightComponent}</View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  placeholder: {
    width: 36,
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: "PilotCommand",
    color: colors.textInverse,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  rightSection: {
    minWidth: 36,
    alignItems: "flex-end",
  },
});
