import { StyleSheet } from "react-native";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../public/styles/global";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: 80,
    paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...typography.button,
    color: colors.textInverse,
    fontWeight: "700",
  },
  linkButton: {
    marginTop: spacing.sm,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  linkText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
  },
  roleSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  roleChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + "20",
  },
  roleChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  roleChipTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
});
