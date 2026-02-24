import { StyleSheet } from "react-native";
import { colors, typography, spacing } from "../../../public/styles/global";

export const analysisStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  backArrow: {
    fontSize: 22,
    color: colors.textInverse,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textInverse,
    fontFamily: "PilotCommand",
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  retryText: {
    color: colors.textInverse,
    fontWeight: "600",
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  cardEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  verseCard: {
    backgroundColor: "#10b981" + "15",
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
  },
  verseRef: {
    ...typography.caption,
    color: "#10b981",
    fontWeight: "700",
    marginBottom: 4,
  },
  verseText: {
    ...typography.body,
    color: colors.textPrimary,
    fontStyle: "italic",
  },
  messageText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  chartContainer: {
    marginTop: spacing.sm,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  chartLabel: {
    width: 80,
    ...typography.caption,
    color: colors.textMuted,
  },
  chartBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: "hidden",
  },
  chartFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  chartPercent: {
    width: 40,
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: "right",
  },
});
