import { StyleSheet } from "react-native";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../public/styles/global";

export const personalStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: "#e8e8e8",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  backIcon: {
    width: 28,
    height: 28,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: "PilotCommand",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: 6,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterActive: { backgroundColor: colors.primary },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  filterTextActive: { color: colors.textInverse, fontWeight: "600" },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: 100 },
  empty: { alignItems: "center", paddingTop: spacing.xxl },
  emptyEmoji: { fontSize: 64, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabText: { fontSize: 28, color: colors.textInverse, lineHeight: 30 },
});

export const personalModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeBtn: { fontSize: 24, color: colors.textMuted },

  // Textarea wrapper cu counter integrat
  textareaWrapper: {
    position: "relative",
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    paddingBottom: spacing.xl + 8,
    minHeight: 140,
    ...typography.body,
    color: colors.textPrimary,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: colors.border,
  },
  charCountInside: {
    position: "absolute",
    bottom: 10,
    right: 12,
    fontSize: 11,
    color: "#a1a1aa",
    fontWeight: "400",
  },

  // Toggle urgent modern cu BulbToggle
  urgentToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    paddingVertical: 8,
    marginBottom: spacing.md,
  },
  urgentLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  urgentTagImage: {
    width: 18,
    height: 18,
    marginRight: 10,
    resizeMode: "contain",
  },
  urgentLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  urgentLabelActive: {
    color: colors.error,
    fontWeight: "700",
  },

  sectionLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "500",
  },

  // Mood buttons moderne
  moodsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.lg,
  },
  moodBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  moodActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
    shadowColor: colors.success,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  moodText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  moodTextActive: {
    color: colors.textInverse,
    fontWeight: "600",
  },

  // Buton Adaugă - success, dreapta jos
  submitRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.xs,
  },
  submitBtn: {
    backgroundColor: colors.success,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: {
    fontSize: 14,
    color: colors.textInverse,
    fontWeight: "600",
  },
});
