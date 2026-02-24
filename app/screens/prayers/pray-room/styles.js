import { StyleSheet, Platform } from "react-native";
import { colors, typography, spacing } from "../../../public/styles/global";

export const prayRoomStyles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { ...typography.body, color: "#fff" },

  // Entry - fullscreen split
  entryCardFull: { flex: 1, overflow: "hidden" },
  entryBgImage: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  entryBgImg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  entryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  entryTitleFull: {
    fontSize: 28,
    fontFamily: "PilotCommand",
    color: "#fff",
    letterSpacing: 3,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    zIndex: 2,
  },
  entryBackBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: spacing.md,
    zIndex: 10,
  },

  // Join
  joinContainer: { flex: 1, padding: spacing.xl, justifyContent: "center" },
  joinLabel: { ...typography.body, color: "#fff", marginBottom: spacing.md, textAlign: "center" },
  joinInput: {
    backgroundColor: "#1f1f1f", borderRadius: 16, padding: spacing.lg,
    fontSize: 28, color: "#fff", textAlign: "center", letterSpacing: 8, marginBottom: spacing.lg,
  },
  joinBtn: { backgroundColor: "#21c063", borderRadius: 16, padding: spacing.lg, alignItems: "center" },
  joinBtnText: { ...typography.body, color: "#fff", fontWeight: "700" },

  // Setup
  setupContainer: { flex: 1 },
  setupBackBtnAbs: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: spacing.md,
    zIndex: 10,
  },

  // Type Selection
  typeSelectionContainer: { flex: 1 },
  typeCardFull: { flex: 1, overflow: "hidden" },
  typeGradient: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  typeLabel: { fontSize: 24, fontFamily: "PilotCommand", color: "#fff", letterSpacing: 2, textAlign: "center" },
  typeSoon: { fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: "600", letterSpacing: 1 },
  typeIcon: { width: 48, height: 48 },

  stepContainer: { flex: 1, padding: spacing.xl, justifyContent: "center" },
  stepTitle: { ...typography.h2, color: "#fff", textAlign: "center", marginBottom: spacing.xl },
  setupInput: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: spacing.lg,
    fontSize: 18, color: "#fff", textAlign: "center", marginBottom: spacing.lg,
  },
  optionsColumn: { gap: spacing.md, marginBottom: spacing.xl },
  optionCard: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: spacing.lg,
    alignItems: "center", borderWidth: 2, borderColor: "transparent",
  },
  optionSelected: { borderColor: "#21c063", backgroundColor: "rgba(33,192,99,0.2)" },
  optionText: { ...typography.body, color: "#fff", fontWeight: "600" },
  daysRow: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, marginBottom: spacing.xl, flexWrap: "wrap" },
  dayBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  daySelected: { backgroundColor: "#21c063" },
  dayText: { color: "#fff", fontWeight: "600" },
  dayTextSelected: { color: "#fff" },
  nextBtn: {
    backgroundColor: "rgba(33,192,99,0.15)", padding: spacing.lg, alignItems: "center",
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(33,192,99,0.4)", marginTop: spacing.md,
  },
  nextBtnText: { color: "#21c063", fontWeight: "700", fontSize: 16 },
  createBtn: { backgroundColor: "#21c063", borderRadius: 16, padding: spacing.lg, alignItems: "center" },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.6 },

  // Room List
  listContent: { padding: spacing.md, paddingBottom: 120 },
  roomCard: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderRadius: 16, marginBottom: spacing.md },
  roomIcon: { width: 48, height: 48, marginRight: spacing.md },
  roomInfo: { flex: 1 },
  roomName: { ...typography.body, fontWeight: "700" },
  roomMeta: { ...typography.caption, marginTop: 2 },
  roomChevron: { fontSize: 24, fontWeight: "300" },

  // Room Header (title + actiuni)
  roomHeader: { position: "relative" },
  headerActions: {
    position: "absolute", right: spacing.md, top: Platform.OS === "ios" ? 50 : 30,
    flexDirection: "row", gap: 8, zIndex: 10,
  },
  headerActionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center",
  },

  // Finalize
  finalizeBtn: {
    backgroundColor: "rgba(239,68,68,0.2)", marginHorizontal: spacing.md,
    marginBottom: spacing.sm, padding: spacing.sm, borderRadius: 12, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.4)",
  },
  finalizeBtnText: { color: "#ef4444", fontWeight: "600", fontSize: 14 },

  // Prayer Card
  prayerCard: { borderRadius: 16, padding: spacing.md, marginBottom: spacing.md },
  prayerHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  prayerAuthor: { ...typography.body, fontWeight: "600", marginLeft: spacing.sm },
  prayerText: { ...typography.body, lineHeight: 22 },
  prayBtn: { backgroundColor: "#21c063", borderRadius: 12, padding: spacing.md, alignItems: "center", marginTop: spacing.md },
  prayBtnText: { color: "#fff", fontWeight: "700" },
  completedBadge: { backgroundColor: "rgba(33,192,99,0.2)", borderRadius: 12, padding: spacing.sm, alignItems: "center", marginTop: spacing.md },
  completedText: { color: "#21c063", fontWeight: "600" },

  // Milestone Bar
  milestoneContainer: { margin: spacing.md, backgroundColor: "#1f1f1f", borderRadius: 16, padding: spacing.md },
  milestoneHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  milestoneIcon: { width: 28, height: 28, marginRight: spacing.sm },
  milestoneLabel: { flex: 1, color: "#fff", fontWeight: "600" },
  milestonePercent: { color: "#21c063", fontWeight: "700", fontSize: 18 },
  milestoneTrack: { height: 12, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 6, overflow: "hidden" },
  milestoneProgress: { height: "100%", borderRadius: 6 },

  // Empty State
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: spacing.xl * 2 },
  emptyEmoji: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { ...typography.h3, color: "#fff", marginBottom: spacing.sm, textAlign: "center" },
  emptySubtitle: { ...typography.body, color: "rgba(255,255,255,0.6)" },

  // FAB
  fab: {
    position: "absolute", right: spacing.lg, bottom: 90,
    width: 56, height: 56, borderRadius: 16, backgroundColor: "#21c063",
    justifyContent: "center", alignItems: "center",
    elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  fabDisabled: { backgroundColor: "#444", opacity: 0.6 },
  fabText: { color: "#fff", fontSize: 28, fontWeight: "600" },
  fabImage: { width: 32, height: 32 },
  maxRoomsHint: {
    position: "absolute", bottom: 70, right: spacing.lg,
    color: "#ef4444", fontSize: 12, textAlign: "right", maxWidth: 160,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: spacing.lg },
  modalContent: { borderRadius: 20, padding: spacing.lg },
  modalTitle: { ...typography.h3, marginBottom: spacing.md, textAlign: "center" },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: spacing.md,
    minHeight: 120, textAlignVertical: "top", marginBottom: spacing.md,
  },
  modalButtons: { flexDirection: "row", gap: spacing.md },
  modalCancel: { flex: 1, padding: spacing.md, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center" },
  modalCancelText: { color: "#fff" },
  modalSubmit: { flex: 1, padding: spacing.md, borderRadius: 12, backgroundColor: "#21c063", alignItems: "center" },
  modalSubmitText: { color: "#fff", fontWeight: "700" },

  // Final Score Modal
  finalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: spacing.lg },
  finalCard: { backgroundColor: "#1f1f1f", borderRadius: 24, padding: spacing.xl, alignItems: "center", width: "100%", maxWidth: 320 },
  finalEmoji: { fontSize: 72, marginBottom: spacing.md },
  finalTitle: { ...typography.h2, color: "#fff", marginBottom: spacing.lg, textAlign: "center" },
  finalScoreCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, justifyContent: "center", alignItems: "center", marginBottom: spacing.lg },
  finalScoreText: { fontSize: 36, fontWeight: "700" },
  finalVerdict: { ...typography.body, fontWeight: "600", textAlign: "center", marginBottom: spacing.xl },
  finalBtn: { backgroundColor: "#21c063", borderRadius: 16, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  finalBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Settings menu modal
  settingsOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: spacing.lg,
  },
  settingsCard: {
    backgroundColor: "#1f1f1f", borderRadius: 16, padding: spacing.sm, width: "100%", maxWidth: 300,
  },
  settingsOption: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md, borderRadius: 12,
  },
  settingsOptionTextDanger: { color: "#ef4444", fontSize: 15, fontWeight: "600" },
  settingsOptionTextWarn: { color: "#f59e0b", fontSize: 15, fontWeight: "600" },
  settingsCancel: {
    padding: spacing.md, alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", marginTop: spacing.sm,
  },
  settingsCancelText: { color: "#888", fontSize: 15 },

  // Roulette - reveal button centrat
  revealCenterWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  revealCenterBtn: {
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24,
    borderWidth: 1.5, borderColor: "#21c063", backgroundColor: "rgba(33,192,99,0.12)",
  },
  revealCenterText: { color: "#21c063", fontWeight: "700", fontSize: 15, letterSpacing: 0.5 },
  waitingText: { color: "#666", fontSize: 14, textAlign: "center" },

  // Vitraliu 100%
  vitraliu100Wrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  vitraliuImg: { width: "80%", height: "60%", maxWidth: 320, maxHeight: 400 },
});
