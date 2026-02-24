import { StyleSheet, Dimensions } from "react-native";
import { colors, typography, spacing } from "../../../public/styles/global";

const { width, height } = Dimensions.get("window");

export const timerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: "#10b981",
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
  timerSetup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  setupTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  timeColumn: {
    alignItems: "center",
  },
  timeValue: {
    fontSize: 64,
    fontWeight: "300",
    color: colors.textPrimary,
    marginVertical: spacing.xs,
  },
  timeLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  timeSeparator: {
    fontSize: 48,
    color: colors.textPrimary,
    marginHorizontal: spacing.md,
    fontWeight: "200",
  },
  arrowBtn: {
    width: 60,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    fontSize: 20,
    color: colors.textInverse,
    fontWeight: "600",
  },
  presetContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
  presetBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.border,
    borderRadius: 20,
  },
  presetActive: {
    backgroundColor: "#10b981",
  },
  presetText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "600",
  },
  presetTextActive: {
    color: colors.textInverse,
  },
  startBtn: {
    backgroundColor: "#10b981",
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: spacing.lg,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnText: {
    ...typography.h3,
    color: colors.textInverse,
    fontWeight: "700",
  },
  programsSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  programCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  programEmoji: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  programDuration: {
    ...typography.caption,
    color: colors.textMuted,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  overlayTimer: {
    fontSize: 72,
    fontWeight: "200",
    color: "#fff",
    marginBottom: spacing.xl,
  },
  overlayLabel: {
    ...typography.body,
    color: "rgba(255,255,255,0.6)",
    marginBottom: spacing.xxl,
  },
  stopBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtnText: {
    fontSize: 28,
    color: colors.textInverse,
  },
});
