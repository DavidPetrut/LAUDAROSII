import { StyleSheet } from "react-native";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../public/styles/global";

export const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  container: {
    flex: 1,
  },
  gradientHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 40,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textInverse,
    letterSpacing: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionTitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.md,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  teamRoles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  teamRoleChip: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: "#10b981",
    borderRadius: borderRadius.full,
  },
  teamRoleText: {
    ...typography.caption,
    color: "#fff",
    fontWeight: "600",
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  adminButtonText: {
    ...typography.button,
    color: colors.textInverse,
    marginLeft: spacing.sm,
    fontWeight: "700",
  },
});

export const editStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flex: 1,
    padding: spacing.lg,
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
    backgroundColor: colors.primary + "15",
  },
  roleChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  roleChipTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textMuted,
  },
});
