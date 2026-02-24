import { StyleSheet, Dimensions } from "react-native";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../public/styles/global";

const { width } = Dimensions.get("window");

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenBg: {
    flex: 1,
    backgroundColor: "#fdfdfd",
  },
  gradientHeader: {
    paddingTop: 40,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gradientHeaderTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textInverse,
    letterSpacing: 2,
  },
  list: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  thumbnail: {
    width: "100%",
    height: 180,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailEmoji: {
    fontSize: 64,
  },
  cardContent: {
    padding: spacing.lg,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + "15",
    marginBottom: spacing.sm,
  },
  categoryText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: "600",
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
  },
  duration: {
    ...typography.caption,
    color: colors.textMuted,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  playButtonText: {
    ...typography.bodySmall,
    color: colors.textInverse,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    marginTop: spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
});

export const detailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    paddingVertical: spacing.sm,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
  },
  thumbnail: {
    width: "100%",
    height: 200,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.lg,
  },
  thumbnailEmoji: {
    fontSize: 80,
  },
  content: {
    padding: spacing.lg,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + "15",
    marginBottom: spacing.md,
  },
  categoryText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: "600",
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  meta: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: spacing.xl,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  playEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  playText: {
    ...typography.button,
    color: colors.textInverse,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "15",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  completeEmoji: {
    fontSize: 18,
    marginRight: spacing.sm,
    color: colors.primary,
  },
  completeText: {
    ...typography.button,
    color: colors.primary,
  },
});
