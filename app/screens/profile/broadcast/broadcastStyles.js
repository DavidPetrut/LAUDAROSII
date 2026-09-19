import { StyleSheet } from "react-native";
import { colors, typography, spacing, borderRadius } from "../../../public/styles/global";

const ACCENT = "#0ea5e9";

export const broadcastStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.md },

  segment: { flexDirection: "row", gap: spacing.xs, padding: spacing.md, paddingBottom: 0 },
  segItem: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surface, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  segActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  segText: { ...typography.caption, color: colors.textSecondary, fontWeight: "700" },
  segTextActive: { color: "#fff" },

  label: { ...typography.caption, color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { ...typography.caption, color: colors.textSecondary, fontWeight: "700" },
  chipTextActive: { color: "#fff" },

  audiencePill: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", backgroundColor: "rgba(14,165,233,0.12)", borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.sm },
  audienceText: { ...typography.caption, color: ACCENT, fontWeight: "700" },

  input: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  textArea: { minHeight: 110, textAlignVertical: "top" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs },
  charCount: { ...typography.caption, color: colors.textMuted },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border },
  switchTitle: { ...typography.body, color: colors.textPrimary, fontWeight: "700" },
  switchDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  primaryBtn: { backgroundColor: ACCENT, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: "center", marginTop: spacing.lg, flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  primaryBtnText: { ...typography.body, color: "#fff", fontWeight: "800" },
  ghostBtn: { paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: "center", marginTop: spacing.sm, borderWidth: 1.5, borderColor: ACCENT, flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  ghostBtnText: { ...typography.body, color: ACCENT, fontWeight: "700" },
  disabled: { opacity: 0.5 },

  saveTplRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  linkText: { ...typography.caption, color: ACCENT, fontWeight: "700" },

  listItem: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border },
  listTitle: { ...typography.body, color: colors.textPrimary, fontWeight: "700" },
  listMsg: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  listMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  badge: { alignSelf: "flex-start", borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2, marginTop: spacing.xs },
  badgeText: { ...typography.caption, fontWeight: "700" },
  cancelText: { ...typography.caption, color: colors.error, fontWeight: "700", marginTop: spacing.sm },

  userRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border },
  userName: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  userTags: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  searchBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.sm },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, padding: 0 },

  addTagRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  tagDelete: { padding: spacing.xs },
  emptyText: { ...typography.bodySmall, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg },
  sheetTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  dayCell: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  dayCellActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  dayCellText: { ...typography.bodySmall, color: colors.textPrimary },
  dayCellTextActive: { color: "#fff", fontWeight: "700" },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  monthLabel: { ...typography.body, color: colors.textPrimary, fontWeight: "700" },
});
