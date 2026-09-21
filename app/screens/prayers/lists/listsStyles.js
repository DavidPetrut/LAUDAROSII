import { StyleSheet } from "react-native";
import { colors, typography, spacing, borderRadius } from "../../../public/styles/global";

const ACCENT = "#21c063";
const PUBLIC_ACCENT = "#f59e0b";

// Tema intunecata pentru ecranul de creare lista (inspirat din Devotionale).
const DARK_BG = "#0f0d0d";
const SURF = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.12)";
const TEXT = "#e5e7eb";
const DIM = "rgba(229,231,235,0.6)";

export const listsStyles = StyleSheet.create({
  // ---- Grid de liste (max 4 rows, fara scroll, dinamic) ----
  grid: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm },
  row: { flex: 1, borderRadius: borderRadius.lg, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  rowPublic: { borderColor: PUBLIC_ACCENT, borderWidth: 2.5 },
  rowBg: { flex: 1, justifyContent: "flex-end" },
  rowOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.28)" },
  rowBar: { backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowTitle: { ...typography.body, color: "#fff", fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, flex: 1 },
  rowMeta: { ...typography.caption, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  publicBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: PUBLIC_ACCENT, borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2, position: "absolute", top: 8, left: 8 },
  publicBadgeText: { ...typography.caption, color: "#1e293b", fontWeight: "800", fontSize: 10, letterSpacing: 0.5 },
  expiredPill: { backgroundColor: "rgba(0,0,0,0.6)", borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  expiredPillText: { ...typography.caption, color: "#f87171", fontWeight: "700", fontSize: 10 },

  // ---- Row de adaugare lista noua ----
  addRow: { flex: 1, borderRadius: borderRadius.lg, borderWidth: 2, borderColor: ACCENT, borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(33,192,99,0.06)", gap: spacing.xs },
  addRowText: { ...typography.body, color: ACCENT, fontWeight: "700" },

  // ---- Bara de sus a sub-ecranelor (detaliu/creare) ----
  subHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, gap: spacing.sm },
  subBack: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  subTitle: { ...typography.h3, flex: 1 },
  subAction: { paddingHorizontal: spacing.sm, height: 40, alignItems: "center", justifyContent: "center" },

  // ---- Detaliu lista (carduri) ----
  detailList: { padding: spacing.md, paddingTop: spacing.sm, paddingBottom: 120 },
  empty: { alignItems: "center", paddingTop: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textMuted },
  fab: {
    position: "absolute", right: 16, width: 56, height: 56, borderRadius: 16,
    alignItems: "center", justifyContent: "center", elevation: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  fabText: { fontSize: 28, color: "#fff", lineHeight: 30 },

  // ---- Stare expirata (detaliu) ----
  expiredBanner: { backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.35)", borderRadius: borderRadius.lg, padding: spacing.md, margin: spacing.md, gap: spacing.sm },
  expiredTitle: { ...typography.body, color: colors.error, fontWeight: "700" },
  expiredDesc: { ...typography.caption, color: colors.textSecondary },
  expiredActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  expiredBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  expiredBtnReload: { backgroundColor: ACCENT },
  expiredBtnEnd: { borderWidth: 1.5, borderColor: colors.error },
  expiredBtnReloadText: { ...typography.bodySmall, color: "#fff", fontWeight: "700" },
  expiredBtnEndText: { ...typography.bodySmall, color: colors.error, fontWeight: "700" },

  // ---- Ecran creare lista (dark) ----
  createWrap: { flex: 1, backgroundColor: DARK_BG },
  createContent: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  createTitle: { ...typography.h3, color: TEXT, textAlign: "center", paddingVertical: spacing.md },
  stepLabel: { ...typography.caption, color: DIM, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm },
  durationRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  durationChip: { flexGrow: 1, flexBasis: "45%", paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: SURF, alignItems: "center", borderWidth: 1.5, borderColor: BORDER },
  durationChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  durationText: { ...typography.body, color: TEXT, fontWeight: "700" },
  durationTextActive: { color: "#fff" },
  customRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  customInput: { flex: 1, ...typography.body, color: TEXT, backgroundColor: "transparent", borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.25)", paddingVertical: spacing.sm },
  customUnit: { ...typography.body, color: DIM },
  saveBtn: { backgroundColor: ACCENT, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: "center", marginTop: spacing.xl },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...typography.h3, color: "#fff", fontWeight: "800" },
  cancelBtn: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.sm },
  cancelBtnText: { ...typography.bodySmall, color: DIM, fontWeight: "600" },

  // ---- Meniu context lista (editeaza/sterge) ----
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: spacing.xl },
  menuSheet: { backgroundColor: "#1f2937", borderRadius: borderRadius.lg, width: "100%", maxWidth: 320, paddingVertical: spacing.sm },
  menuHeader: { ...typography.caption, color: DIM, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  menuItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  menuItemText: { ...typography.body, color: TEXT, fontWeight: "600" },
  menuDivider: { height: 1, backgroundColor: BORDER, marginHorizontal: spacing.md },
});
