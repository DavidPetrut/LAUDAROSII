import { StyleSheet } from "react-native";
import { typography, spacing, borderRadius } from "../../../public/styles/global";

// Tema intunecata a tabului Devotional (peste fundalul negru comun).
const ACCENT = "#10b981";
const SURF = "rgba(255,255,255,0.06)";
const SURF2 = "rgba(255,255,255,0.1)";
const BORDER = "rgba(255,255,255,0.12)";
const TEXT = "#e5e7eb";
const DIM = "rgba(229,231,235,0.6)";
const FAINT = "rgba(229,231,235,0.4)";
const SHEET_BG = "#1a1f2b";
const PLAYER_BG = "#050505";
const PLAYER_TEXT = "#d4d4d8";

export const devotionalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0d0d" },
  content: { flex: 1, paddingHorizontal: spacing.md },
  bg: { flex: 1 },

  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { ...typography.body, color: DIM, marginTop: spacing.md },

  // ---- Sectiuni / carduri ----
  introCard: { backgroundColor: SURF, borderRadius: borderRadius.xl, padding: spacing.lg, marginTop: spacing.md, borderWidth: 1, borderColor: BORDER },
  introTitle: { ...typography.h3, color: TEXT },
  introDesc: { ...typography.bodySmall, color: DIM, marginTop: spacing.xs },
  stepLabel: { ...typography.caption, color: DIM, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm },

  // ---- Chips / optiuni ----
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: SURF, borderWidth: 1, borderColor: BORDER },
  chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { ...typography.caption, color: DIM, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  daysRow: { flexDirection: "row", justifyContent: "space-between" },
  dayChip: { width: 40, alignItems: "center", paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: SURF, borderWidth: 1, borderColor: BORDER },

  optRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optCard: { flexGrow: 1, flexBasis: "45%", paddingVertical: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: SURF, alignItems: "center", borderWidth: 1.5, borderColor: BORDER },
  optCardActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  optCardText: { ...typography.body, color: TEXT, fontWeight: "700" },
  optCardTextActive: { color: "#fff" },

  helperNote: { ...typography.caption, color: DIM, marginTop: spacing.sm },
  errorNote: { ...typography.caption, color: "#f87171", marginTop: spacing.md },
  noteSoft: { ...typography.caption, color: DIM, marginTop: spacing.sm, fontStyle: "italic" },

  // ---- Inputuri (fara fundal, text deschis) ----
  inputBox: { ...typography.body, color: TEXT, backgroundColor: "transparent", borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.25)", paddingHorizontal: 0, paddingVertical: spacing.sm },
  inputMultiline: { minHeight: 72, textAlignVertical: "top" },
  inputCard: { backgroundColor: SURF, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.sm, borderWidth: 1, borderColor: BORDER },
  inputHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  inputLabel: { ...typography.caption, color: DIM, fontWeight: "700" },
  charCount: { ...typography.caption, color: FAINT },
  previewCard: { backgroundColor: SURF2, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.sm },
  previewTitle: { ...typography.body, color: TEXT, fontWeight: "700" },
  previewBody: { ...typography.bodySmall, color: DIM, marginTop: 2 },

  // ---- Butoane ----
  startBtn: { backgroundColor: ACCENT, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: "center", marginTop: spacing.xl },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { ...typography.h3, color: "#fff", fontWeight: "800" },
  skipBtn: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.sm },
  skipBtnText: { ...typography.bodySmall, color: DIM, fontWeight: "600" },

  // ---- Home (fundal negru) ----
  quoteCard: { backgroundColor: SURF, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: BORDER, padding: spacing.lg, paddingTop: spacing.xl, marginTop: spacing.md },
  quoteCopyBtn: { position: "absolute", top: spacing.md, right: spacing.md, zIndex: 2 },
  quoteMark: { fontSize: 40, color: "rgba(16,185,129,0.6)", fontFamily: "IMFellEnglish-Italic", marginBottom: -spacing.md },
  quoteText: { fontSize: 20, lineHeight: 30, color: TEXT, fontFamily: "IMFellEnglish-Italic" },
  quoteAuthor: { ...typography.bodySmall, color: DIM, textAlign: "right", marginTop: spacing.md, fontStyle: "italic" },
  bigBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: ACCENT, paddingVertical: spacing.lg, borderRadius: borderRadius.xl, marginTop: spacing.lg },
  bigBtnGhost: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: ACCENT },
  bigBtnDone: { backgroundColor: "rgba(16,185,129,0.12)" },
  bigBtnText: { ...typography.h3, color: "#fff", fontWeight: "800" },

  // ---- Meniu mic ----
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: spacing.xl },
  menuSheet: { backgroundColor: "#1f2937", borderRadius: borderRadius.lg, width: "100%", maxWidth: 320, paddingVertical: spacing.sm },
  menuHeader: { ...typography.caption, color: DIM, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  menuItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  menuItemText: { ...typography.body, color: TEXT, fontWeight: "600" },
  menuDivider: { height: 1, backgroundColor: BORDER, marginHorizontal: spacing.md },
  colorSheet: { backgroundColor: SHEET_BG, borderRadius: borderRadius.lg, width: "100%", maxWidth: 340, padding: spacing.lg },

  // ---- Bottom sheet ----
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: SHEET_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: spacing.xl },
  sheetHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: BORDER, marginBottom: spacing.md },
  sheetTitle: { ...typography.h3, color: TEXT, marginBottom: spacing.sm },
  taskEditRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  taskColorBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },

  // ---- Icon picker ----
  pickerContainer: { flex: 1, backgroundColor: "#0f0d0d", paddingTop: spacing.xxl },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  pickerTitle: { ...typography.h3, color: TEXT },
  searchBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: SURF, borderRadius: borderRadius.full, borderWidth: 1, borderColor: BORDER, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginHorizontal: spacing.md, marginTop: spacing.sm },
  searchInput: { flex: 1, ...typography.body, color: TEXT, padding: 0 },
  pickerCategory: { ...typography.caption, color: DIM, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm, marginHorizontal: spacing.md },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingHorizontal: spacing.md },
  iconCell: { width: 56, height: 56, borderRadius: borderRadius.lg, backgroundColor: SURF, borderWidth: 1.5, borderColor: BORDER, alignItems: "center", justifyContent: "center" },

  // ---- Culori ----
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  swatchActive: { borderWidth: 2, borderColor: "#fff" },

  // ---- Imagine devotional ----
  headerImage: { height: 180, borderRadius: borderRadius.lg, overflow: "hidden", justifyContent: "flex-end", backgroundColor: SURF, marginTop: spacing.md },
  headerImageRadius: { borderRadius: borderRadius.lg },
  headerImageEmpty: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  headerImageEmptyText: { ...typography.caption, color: DIM, marginTop: spacing.xs },
  headerNameBar: { backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerNameInput: { fontSize: 18, fontFamily: "Raleway", fontWeight: "700", color: "#fff", padding: 0 },
  presetRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  presetThumb: { width: 64, height: 44, borderRadius: borderRadius.md, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  presetThumbActive: { borderColor: ACCENT },
  presetThumbImg: { width: "100%", height: "100%" },
  presetUpload: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.md, height: 44, borderRadius: borderRadius.md, borderWidth: 1, borderColor: BORDER },
  presetUploadText: { ...typography.caption, color: TEXT, fontWeight: "600" },

  // ---- Timeline momente ----
  tlRow: { flexDirection: "row", alignItems: "center", minHeight: 68 },
  tlTime: { width: 40, textAlign: "right", marginRight: spacing.sm, ...typography.caption, color: DIM },
  tlNodeCol: { width: 48, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  tlLineTop: { position: "absolute", top: 0, height: "50%", left: 23, width: 2, backgroundColor: BORDER },
  tlLineBottom: { position: "absolute", bottom: 0, height: "50%", left: 23, width: 2, backgroundColor: BORDER },
  tlNode: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", zIndex: 1 },
  tlAddNode: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: ACCENT, borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: "#0f0d0d", zIndex: 1 },
  tlContent: { flex: 1, marginLeft: spacing.md, justifyContent: "center" },
  tlTitle: { ...typography.body, color: TEXT, fontWeight: "700" },
  tlMeta: { ...typography.caption, color: DIM, marginTop: 2 },
  tlAddLabel: { ...typography.body, color: ACCENT, fontWeight: "700" },

  // ---- Adauga rapid ----
  suggestionChip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: SURF, borderRadius: borderRadius.full, borderWidth: 1, borderColor: BORDER, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  suggestionText: { ...typography.caption, color: TEXT, fontWeight: "600" },

  // ---- Repetabil ----
  repeatRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: SURF, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: BORDER },
  repeatTitle: { ...typography.body, color: TEXT, fontWeight: "700" },
  repeatDesc: { ...typography.caption, color: DIM, marginTop: 2 },

  // ---- "Ce lipseste" (validare buton) ----
  missingCard: { backgroundColor: "rgba(245,158,11,0.12)", borderRadius: borderRadius.lg, borderWidth: 1, borderColor: "rgba(245,158,11,0.4)", padding: spacing.md, marginTop: spacing.lg },
  missingTitle: { ...typography.bodySmall, color: "#fbbf24", fontWeight: "700", marginBottom: spacing.xs },
  missingItem: { ...typography.bodySmall, color: DIM, marginTop: 2 },

  // ---- Card devotional (icon fallback) ----
  devCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: SURF, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.sm, borderWidth: 1.5, borderColor: BORDER },
  devCardDefault: { borderColor: ACCENT },
  devCardIcon: { width: 48, height: 48, borderRadius: borderRadius.md, alignItems: "center", justifyContent: "center" },
  devCardName: { ...typography.body, color: TEXT, fontWeight: "700" },
  devCardMeta: { ...typography.caption, color: DIM, marginTop: 2 },
  defaultBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  defaultBadgeText: { ...typography.caption, color: ACCENT, fontWeight: "700" },

  // ---- Card devotional (imagine) ----
  devImageCard: { height: 120, borderRadius: borderRadius.lg, overflow: "hidden", marginTop: spacing.sm, borderWidth: 1.5, borderColor: "transparent" },
  devImageBg: { flex: 1, justifyContent: "flex-end" },
  devImageBadge: { position: "absolute", top: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  devImageBar: { backgroundColor: "rgba(0,0,0,0.55)", padding: spacing.md },
  devImageName: { ...typography.body, color: "#fff", fontWeight: "700" },
  devImageMeta: { ...typography.caption, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  // ---- Liste / share ----
  listHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.lg },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: ACCENT, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  newBtnText: { ...typography.caption, color: "#fff", fontWeight: "700" },
  shareRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "rgba(16,185,129,0.12)", borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.sm, borderWidth: 1, borderColor: "rgba(16,185,129,0.35)" },
  shareAccept: { backgroundColor: ACCENT, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  shareAcceptText: { ...typography.caption, color: "#fff", fontWeight: "700" },
  shareDecline: { padding: spacing.sm },
  userRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: SURF, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.sm, borderWidth: 1, borderColor: BORDER },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: SURF2, alignItems: "center", justifyContent: "center" },
  userName: { ...typography.body, color: TEXT, fontWeight: "600", flex: 1 },

  // ---- Personale hub / stats ----
  hubRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: SURF, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.sm, borderWidth: 1, borderColor: BORDER },
  hubIcon: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: "rgba(16,185,129,0.15)", alignItems: "center", justifyContent: "center" },
  hubTitle: { ...typography.body, color: TEXT, fontWeight: "700" },
  hubDesc: { ...typography.caption, color: DIM, marginTop: 2 },
  emptyPersonal: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyTitle: { ...typography.h3, color: TEXT, marginBottom: spacing.sm, marginTop: spacing.sm },
  statCard: { backgroundColor: SURF, borderRadius: borderRadius.xl, padding: spacing.lg, marginTop: spacing.md, borderWidth: 1, borderColor: BORDER },
  statLabel: { ...typography.caption, color: DIM, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  statBig: { ...typography.h1, color: TEXT, marginTop: spacing.xs },
  statScore: { ...typography.bodySmall, color: ACCENT, fontWeight: "700", marginTop: spacing.sm },
  progressTrack: { height: 10, borderRadius: borderRadius.full, backgroundColor: SURF2, marginTop: spacing.md, overflow: "hidden" },
  progressFill: { height: 10, borderRadius: borderRadius.full, backgroundColor: ACCENT },
  chartCard: { backgroundColor: SURF, borderRadius: borderRadius.xl, padding: spacing.md, borderWidth: 1, borderColor: BORDER, alignItems: "center" },

  // ---- Notificari (memento-uri) ----
  timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.lg, marginBottom: spacing.sm },
  stepBtn: { width: 48, height: 48, borderRadius: borderRadius.full, backgroundColor: SURF, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontSize: 26, color: TEXT, fontWeight: "700" },
  timeValue: { fontSize: 40, fontFamily: "Raleway", color: TEXT, fontWeight: "700", minWidth: 120, textAlign: "center" },
  reminderRow: { flexDirection: "row", alignItems: "center", backgroundColor: SURF, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.sm, borderWidth: 1, borderColor: BORDER },
  reminderTime: { ...typography.h3, color: TEXT },
  reminderTitle: { ...typography.bodySmall, color: DIM, fontWeight: "600", marginTop: 2 },
  reminderDays: { ...typography.caption, color: FAINT, marginTop: 2 },
  reminderDelete: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  reminderDeleteText: { ...typography.bodySmall, color: "#f87171", fontWeight: "700" },

  // ---- Player overlay (negru, text gri) ----
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: PLAYER_BG, alignItems: "center", justifyContent: "center", zIndex: 100 },
  overlayTimer: { fontSize: 92, fontFamily: "Raleway", color: PLAYER_TEXT, fontWeight: "500", letterSpacing: 3 },
  overlayTrack: { ...typography.body, color: "rgba(212,212,216,0.55)", marginTop: spacing.md, textAlign: "center", paddingHorizontal: spacing.xl },
  controlsWrap: { alignItems: "center" },
  overlayHint: { position: "absolute", ...typography.caption, color: "rgba(212,212,216,0.3)", textAlign: "center", paddingHorizontal: spacing.xl },

  // ---- Controale player ----
  ctrlPause: { width: 96, height: 96, borderRadius: 48, borderWidth: 1.5, borderColor: "rgba(212,212,216,0.25)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.03)" },
  ctrlPauseIcon: { fontSize: 26, color: PLAYER_TEXT, letterSpacing: 2 },
  ctrlPauseLabel: { ...typography.caption, color: "rgba(212,212,216,0.6)", marginTop: 4 },
  ctrlRow: { flexDirection: "row", gap: spacing.md },
  ctrlResume: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.full, backgroundColor: ACCENT },
  ctrlResumeText: { ...typography.body, color: "#fff", fontWeight: "700" },
  ctrlStop: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: "rgba(212,212,216,0.35)" },
  ctrlStopText: { ...typography.body, color: PLAYER_TEXT, fontWeight: "700" },

  // ---- Runner devotional ----
  runnerStep: { ...typography.body, color: "rgba(212,212,216,0.5)", marginBottom: spacing.lg, letterSpacing: 2 },
  runnerIcon: { width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  runnerTitle: { ...typography.h2, color: "#e5e7eb", textAlign: "center", paddingHorizontal: spacing.xl },
  runnerTimer: { fontSize: 56, fontFamily: "Raleway", color: "#d4d4d8", fontWeight: "500", marginTop: spacing.md },
});
