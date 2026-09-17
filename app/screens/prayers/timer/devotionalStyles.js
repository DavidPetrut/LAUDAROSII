import { StyleSheet } from "react-native";
import { colors, typography, spacing } from "../../../public/styles/global";

const ACCENT = "#10b981";

export const devotionalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.md },

  hero: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  heroEmoji: { fontSize: 44, marginBottom: spacing.sm },
  heroTitle: { ...typography.h2, color: colors.textPrimary, fontWeight: "800", letterSpacing: 1 },
  heroDesc: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs, textAlign: "center" },

  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
  chipActive: { backgroundColor: ACCENT },
  chipText: { ...typography.caption, color: colors.textMuted, fontWeight: "700" },
  chipTextActive: { color: colors.textInverse },

  toggleRow: { flexDirection: "row", gap: spacing.sm },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  toggleActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  toggleText: { ...typography.body, color: colors.textPrimary, fontWeight: "700" },
  toggleTextActive: { color: colors.textInverse },

  note: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },

  startBtn: {
    backgroundColor: ACCENT,
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: "center",
    marginTop: spacing.xl,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { ...typography.h3, color: colors.textInverse, fontWeight: "800" },

  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { ...typography.body, color: colors.textMuted, marginTop: spacing.md },

  // ---- Player overlay ----
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  stopBtn: {
    position: "absolute",
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  stopIcon: { fontSize: 24, color: "#fff" },
  overlayTimer: {
    fontSize: 96,
    fontFamily: "Raleway",
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 4,
  },
  overlayTrack: {
    ...typography.body,
    color: "rgba(255,255,255,0.6)",
    marginTop: spacing.lg,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  overlayHint: {
    position: "absolute",
    bottom: 40,
    ...typography.caption,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
});
