import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography, spacing } from "../../public/styles/global";

export const GradientHeader = ({ title, subtitle, rightComponent }) => {
  return (
    <View style={styles.container}>
      <View style={styles.gradient}>
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {rightComponent && (
            <View style={styles.rightComponent}>{rightComponent}</View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  gradient: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.textInverse,
    fontWeight: "700",
  },
  subtitle: {
    ...typography.body,
    color: colors.textInverse,
    opacity: 0.85,
    marginTop: spacing.xs,
  },
  rightComponent: {
    marginLeft: spacing.md,
  },
});
