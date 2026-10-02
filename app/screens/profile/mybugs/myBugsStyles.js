import { StyleSheet } from "react-native";
import { spacing, borderRadius, typography } from "../../../public/styles/global";

export const myBugsStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0f0f0" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.body, color: "#6b7280", textAlign: "center" },

  list: { padding: spacing.lg, paddingBottom: 120 },
  intro: { ...typography.bodySmall, color: "#6b7280", marginBottom: spacing.md },

  closeAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#dc2626",
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: "rgba(220,38,38,0.06)",
  },
  closeAllText: { ...typography.bodySmall, color: "#dc2626", fontWeight: "700" },

  card: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  badge: { backgroundColor: "rgba(16,185,129,0.15)", borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeText: { fontSize: 11, color: "#059669", fontWeight: "700" },
  meta: { fontSize: 11, color: "#9ca3af", flexShrink: 1, textAlign: "right", marginLeft: spacing.sm },
  problem: { ...typography.body, color: "#1f2937", lineHeight: 21 },
  note: { ...typography.caption, color: "#9ca3af", marginTop: spacing.xs, fontStyle: "italic" },

  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1, height: 42, borderRadius: borderRadius.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  btnReopen: { borderWidth: 1.5, borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)" },
  btnReopenText: { color: "#b45309", fontWeight: "700", fontSize: 14 },
  btnClose: { backgroundColor: "#10b981" },
  btnCloseText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  reopenBox: { marginTop: spacing.md },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: "top",
    ...typography.body,
    color: "#1f2937",
  },
  btnGhost: { borderWidth: 1.5, borderColor: "#d1d5db", backgroundColor: "#fff" },
  btnGhostText: { color: "#6b7280", fontWeight: "700", fontSize: 14 },
  btnSend: { backgroundColor: "#6366f1" },
  btnSendText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
