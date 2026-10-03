import { StyleSheet } from "react-native";
import { spacing, borderRadius, typography } from "../../../public/styles/global";

// Paleta dark locala a ecranului MyBugs (singurul design, fara switch light/dark).
// Oglindeste tokenii dark folositi in Devotional pentru consecventa.
const BG = "#0f0d0d";
const SURF = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.12)";
const TEXT = "#e5e7eb";
const DIM = "rgba(229,231,235,0.6)";
const FAINT = "rgba(229,231,235,0.4)";

export const myBugsStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.body, color: DIM, textAlign: "center" },

  list: { padding: spacing.lg, paddingBottom: 120 },
  intro: { ...typography.bodySmall, color: DIM, marginBottom: spacing.md },

  closeAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#ef4444",
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  closeAllText: { ...typography.bodySmall, color: "#f87171", fontWeight: "700" },

  card: {
    backgroundColor: SURF,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: BORDER,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  badge: { backgroundColor: "rgba(16,185,129,0.18)", borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeText: { fontSize: 11, color: "#34d399", fontWeight: "700" },
  meta: { fontSize: 11, color: FAINT, flexShrink: 1, textAlign: "right", marginLeft: spacing.sm },
  problem: { ...typography.body, color: TEXT, lineHeight: 21 },
  note: { ...typography.caption, color: FAINT, marginTop: spacing.xs, fontStyle: "italic" },

  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1, height: 42, borderRadius: borderRadius.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  btnReopen: { borderWidth: 1.5, borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.12)" },
  btnReopenText: { color: "#fbbf24", fontWeight: "700", fontSize: 14 },
  btnClose: { backgroundColor: "#10b981" },
  btnCloseText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  reopenBox: { marginTop: spacing.md },
  input: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: "top",
    ...typography.body,
    color: TEXT,
  },
  btnGhost: { borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "transparent" },
  btnGhostText: { color: DIM, fontWeight: "700", fontSize: 14 },
  btnSend: { backgroundColor: "#6366f1" },
  btnSendText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
