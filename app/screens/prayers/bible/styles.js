import { StyleSheet } from "react-native";
import { spacing, borderRadius, fonts } from "../../../public/styles/global";

const ACCENT = "#21c063";

// Paleta se schimba dupa tema; marimea textului de citit dupa fontScale.
export const makeStyles = (isDark, fontScale = 1) => {
  const bg = isDark ? "#121212" : "#ffffff";
  const surface = isDark ? "#1c1c1e" : "#ffffff";
  const sheetBg = isDark ? "#1c1c1e" : "#ffffff";
  const textMain = isDark ? "#e6e7e9" : "#1e293b";
  // Textul de citit: putin mai deschis in dark ca sa iasa mai bine pe fundal negru.
  const readingText = isDark ? "#f4f4f6" : "#1e293b";
  const textSoft = isDark ? "rgba(255,255,255,0.55)" : "#64748b";
  const textFaint = isDark ? "rgba(255,255,255,0.4)" : "#94a3b8";
  const divider = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const chipBg = isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9";
  const overlay = "rgba(0,0,0,0.5)";

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },

    // Bara slim de sus (stil YouVersion)
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
      backgroundColor: bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: divider,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    iconTxt: { fontSize: 20, color: textMain },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: borderRadius.full,
      backgroundColor: chipBg,
    },
    chipText: {
      fontFamily: fonts.body,
      fontWeight: "700",
      fontSize: 15,
      color: textMain,
    },
    chipCaret: { fontSize: 11, color: textSoft },
    topSpacer: { flex: 1 },

    // Zona de citit
    readerContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 200,
    },
    paragraph: { color: textMain },
    dropCap: {
      fontFamily: fonts.reading,
      fontSize: 44 * fontScale,
      lineHeight: 40 * fontScale,
      color: textSoft,
    },
    verseNum: {
      fontWeight: "700",
      fontSize: 15 * fontScale,
      color: textFaint,
    },
    verseText: {
      fontFamily: fonts.reading,
      fontSize: 18 * fontScale,
      lineHeight: 32 * fontScale,
      color: readingText,
    },
    verseActive: {
      backgroundColor: isDark ? "rgba(33,192,99,0.18)" : "rgba(33,192,99,0.12)",
    },

    loadingWrap: { paddingTop: spacing.xxl, alignItems: "center" },
    errorWrap: { padding: spacing.xl, alignItems: "center" },
    errorText: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: textSoft,
      textAlign: "center",
      marginBottom: spacing.md,
    },
    retryBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: ACCENT,
    },
    retryTxt: { color: "#fff", fontFamily: fonts.body, fontWeight: "700" },

    // Bara de navigare - container minimalist full-width, fix deasupra taburilor
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: bg,
    },
    playCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: divider,
    },
    switcherPill: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      height: 46,
      borderRadius: 23,
      paddingHorizontal: spacing.xs,
      backgroundColor: surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: divider,
    },
    switcherArrow: { width: 40, height: 46, alignItems: "center", justifyContent: "center" },
    switcherArrowDisabled: { opacity: 0.3 },
    switcherTitle: {
      flex: 1,
      textAlign: "center",
      textAlignVertical: "center",
      includeFontPadding: false,
      lineHeight: 20,
      fontFamily: fonts.body,
      fontWeight: "700",
      fontSize: 15,
      color: textMain,
    },

    // --- Sheet-uri (bottom sheet reutilizat in modul) ---
    overlay: { flex: 1, backgroundColor: overlay, justifyContent: "flex-end" },
    sheet: {
      backgroundColor: sheetBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: spacing.sm,
      maxHeight: "82%",
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: textFaint,
      marginBottom: spacing.sm,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    sheetHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    sheetTitle: {
      fontFamily: fonts.heading,
      fontSize: 18,
      color: textMain,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    sheetClose: { fontSize: 22, color: textSoft, paddingHorizontal: spacing.sm },
    sheetScroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

    // Randuri liste (versiuni / carti)
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: divider,
    },
    rowActive: {},
    rowTitle: { fontFamily: fonts.body, fontSize: 16, color: textMain, fontWeight: "600" },
    rowSub: { fontFamily: fonts.body, fontSize: 12, color: textSoft, marginTop: 2 },
    rowCheck: { fontSize: 18, color: ACCENT },
    groupLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      fontWeight: "700",
      color: textFaint,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },

    // Grila de capitole (ca in screenshot YouVersion)
    bookRow: {
      paddingVertical: 15,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
    },
    bookRowActive: { backgroundColor: chipBg },
    bookName: { fontFamily: fonts.body, fontSize: 17, color: textMain, fontWeight: "600" },
    bookNameActive: { color: ACCENT },
    chapterGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    chapterCell: {
      width: 52,
      height: 52,
      borderRadius: borderRadius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: chipBg,
    },
    chapterCellActive: { backgroundColor: ACCENT },
    chapterCellTxt: { fontFamily: fonts.body, fontSize: 16, fontWeight: "700", color: textMain },
    chapterCellTxtActive: { color: "#fff" },

    // Display sheet (font + comparare)
    displayRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
    },
    displayLabel: { fontFamily: fonts.body, fontSize: 15, color: textMain, fontWeight: "600" },
    stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    stepBtn: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      backgroundColor: chipBg,
      alignItems: "center",
      justifyContent: "center",
    },
    stepBtnTxt: { fontSize: 20, color: textMain, fontWeight: "700" },
    stepValue: { fontFamily: fonts.body, fontSize: 15, color: textSoft, minWidth: 44, textAlign: "center" },

    // Verse action sheet (comparare)
    verseRefTitle: {
      fontFamily: fonts.heading,
      fontSize: 16,
      color: ACCENT,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    compareBlock: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: divider },
    compareCode: { fontFamily: fonts.body, fontSize: 12, fontWeight: "700", color: textSoft, marginBottom: 2 },
    compareText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: textMain },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: 14,
    },
    actionTxt: { fontFamily: fonts.body, fontSize: 16, color: textMain, fontWeight: "600" },
    hint: { fontFamily: fonts.body, fontSize: 13, color: textSoft, paddingVertical: spacing.sm },

    // Radacina cuvantului (Strong's)
    strongVerse: {
      fontFamily: fonts.body,
      fontSize: 17,
      lineHeight: 30,
      color: textMain,
      marginBottom: spacing.md,
    },
    strongWord: { color: ACCENT, fontWeight: "700" },
    defPanel: {
      backgroundColor: chipBg,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    defCode: {
      fontFamily: fonts.body,
      fontWeight: "700",
      fontSize: 13,
      color: ACCENT,
      marginBottom: spacing.xs,
    },
    defText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: textMain },
    defEmpty: { fontFamily: fonts.body, fontSize: 14, color: textSoft, paddingVertical: spacing.md },
  });
};
