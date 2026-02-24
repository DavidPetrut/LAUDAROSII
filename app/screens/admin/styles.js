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
  },
  statsRow: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: "center",
  },
  statNumber: {
    ...typography.h1,
    color: colors.textInverse,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textInverse,
    opacity: 0.85,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  list: {
    padding: spacing.md,
    paddingTop: 0,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 24,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  userEmail: {
    ...typography.caption,
    color: colors.textMuted,
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  roleText: {
    ...typography.caption,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
  seedBtn: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.success,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
  },
  seedBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
