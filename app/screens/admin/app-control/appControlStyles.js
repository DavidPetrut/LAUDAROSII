import { StyleSheet } from "react-native";
import { colors, typography, spacing, borderRadius } from "../../../public/styles/global";

export const ACCENT = "#7c3aed";
export const ACCENT_SOFT = "rgba(124,58,237,0.12)";

const LEVEL = {
  none: { label: "Nimic", color: colors.textMuted },
  view: { label: "Vedere", color: "#0ea5e9" },
  edit: { label: "Editare", color: "#22c55e" },
};

export const LEVEL_META = LEVEL;

export const ROLE_META = {
  superadmin: { label: "Super Admin", color: "#ef4444" },
  admin: { label: "Admin", color: "#22c55e" },
  developer: { label: "Developer", color: "#14b8a6" },
  editor: { label: "Editor", color: "#f59e0b" },
  user: { label: "Membru", color: "#0ea5e9" },
};

export const ac = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 120 },

  // Hub
  hubCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md,
    borderWidth: 1,
  },
  hubIcon: {
    width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: ACCENT_SOFT,
  },
  hubTitle: { ...typography.body, fontWeight: "800" },
  hubDesc: { ...typography.caption, marginTop: 2 },

  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  statPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statText: { ...typography.caption, fontWeight: "700" },

  // Role picker (chips)
  sectionLabel: { ...typography.caption, color: colors.textMuted, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.md },
  rolesRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  roleChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  roleChipText: { ...typography.bodySmall, fontWeight: "700" },

  // Tabs (Functionalitati / Ecrane)
  tabsRow: { flexDirection: "row", backgroundColor: "rgba(127,127,127,0.12)", borderRadius: 12, padding: 4, gap: 4, marginTop: spacing.md, marginBottom: spacing.sm },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 9, alignItems: "center" },
  tabBtnActive: { backgroundColor: ACCENT },
  tabText: { ...typography.bodySmall, fontWeight: "700", color: colors.textMuted },
  tabTextActive: { color: "#fff" },

  // Capability rows
  groupLabel: { ...typography.caption, color: ACCENT, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.xs },
  capRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  capLabel: { ...typography.body, fontWeight: "700" },
  capDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2, marginBottom: spacing.sm },

  // 3-state segment (Nimic / Vedere / Editare)
  seg: { flexDirection: "row", gap: 6 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", borderWidth: 1.5, borderColor: colors.border },
  segText: { ...typography.caption, fontWeight: "800" },

  // Save bar
  saveBar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.md, borderTopWidth: 1 },
  saveBtn: { backgroundColor: ACCENT, borderRadius: borderRadius.lg, paddingVertical: spacing.md, alignItems: "center" },
  saveBtnText: { ...typography.body, color: "#fff", fontWeight: "800" },
  saveBtnDisabled: { opacity: 0.5 },

  // Members
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, marginBottom: spacing.sm },
  searchInput: { flex: 1, ...typography.body, paddingVertical: 10 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm, borderWidth: 1 },
  memberName: { ...typography.body, fontWeight: "700" },
  memberEmail: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full },
  roleBadgeText: { ...typography.caption, fontWeight: "800", fontSize: 11 },
  bannedTag: { ...typography.caption, color: "#ef4444", fontWeight: "700", fontSize: 10, marginTop: 2 },

  // Member detail
  detailHead: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.sm },
  detailName: { ...typography.h3, fontWeight: "800" },
  detailEmail: { ...typography.bodySmall, color: colors.textMuted },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1.5 },
  actionBtnText: { ...typography.bodySmall, fontWeight: "800" },

  // Empty / loading
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  muted: { ...typography.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
});
