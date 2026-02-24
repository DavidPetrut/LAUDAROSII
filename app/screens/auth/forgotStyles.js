import { StyleSheet } from "react-native";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../public/styles/global";

export const forgotStyles = StyleSheet.create({
  infoText: {
    ...typography.body,
    color: colors.success,
    textAlign: "center",
    marginBottom: spacing.xl,
    fontWeight: "600",
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  hintText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
