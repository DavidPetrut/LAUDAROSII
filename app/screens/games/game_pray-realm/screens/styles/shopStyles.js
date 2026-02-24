import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");
const isTablet = width > 600;
const tabletScale = isTablet ? 0.6 : 1;
const loreScale = isTablet ? 0.65 : 1;

export const shopStyles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  backgroundImage: {
    width: width,
    height: height,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  closeButtonIcon: {
    width: width * 0.15 * tabletScale,
    height: width * 0.15 * tabletScale,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 24,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 2,
  },
  treasureContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  treasureBagIcon: {
    width: 96,
    height: 96,
  },
  treasureCountBadge: {
    position: "absolute",
    top: 0,
    right: -20,
    backgroundColor: "rgba(139, 92, 246, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    minWidth: 40,
    alignItems: "center",
  },
  treasureCountText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  treasureIcon: {
    width: 24,
    height: 24,
  },
  treasureCount: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: "45%", // Spațiu pentru bottom panel cu lore
  },
  sectionTitle: {
    color: "#8b5cf6",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    marginBottom: 16,
    marginTop: 10,
    textTransform: "uppercase",
  },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  carouselContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 16,
    textAlign: "center",
  },
  // Wrapper pentru carduri de misiuni în carusel
  missionCardWrapper: {
    width: width * 0.75,
    maxWidth: 320,
  },
  // Bottom Navigation Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 2,
    borderTopColor: "rgba(139, 92, 246, 0.5)",
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  tabButtonActive: {
    backgroundColor: "rgba(139, 92, 246, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.8)",
  },
  tabText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  // Tab buttons with images
  tabButtonImage: {
    opacity: 0.6,
  },
  tabButtonImageActive: {
    opacity: 1,
  },
  tabButtonIcon: {
    width: width * 0.32 * (isTablet ? 0.72 : 1),
    height: width * 0.22 * (isTablet ? 0.72 : 1),
  },
  tabButtonsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: isTablet ? 5 : 10,
  },
  // Treasure container in bottom bar
  bottomTreasureContainer: {
    position: isTablet ? "absolute" : "relative",
    right: isTablet ? 10 : undefined,
    top: isTablet ? 5 : undefined,
    alignItems: "center",
    justifyContent: "center",
    padding: isTablet ? 5 : 0,
  },
  bottomTreasureBagIcon: {
    width: width * 0.2 * (isTablet ? 0.55 : 1),
    height: width * 0.2 * (isTablet ? 0.55 : 1),
  },
  bottomTreasureCountBadge: {
    position: "absolute",
    top: isTablet ? 0 : -5,
    right: isTablet ? 0 : -15,
    backgroundColor: "rgba(139, 92, 246, 0.95)",
    paddingHorizontal: width * 0.025 * (isTablet ? 0.7 : 1),
    paddingVertical: isTablet ? 2 : 4,
    borderRadius: width * 0.035,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
    minWidth: width * 0.1 * (isTablet ? 0.6 : 1),
    alignItems: "center",
  },
  bottomTreasureCountText: {
    color: "#fff",
    fontSize: isTablet ? 20 : width * 0.035,
    fontWeight: "700",
  },
  // Bottom Panel (Nav + Lore)
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: isTablet ? "26%" : "32%",
    borderTopWidth: 0,
    borderTopColor: "rgba(139, 92, 246, 0.5)",
    flexDirection: "column",
  },
  bottomPanelBgImage: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    width: "100%",
    height: "100%",
  },
  bottomNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: isTablet ? "space-between" : "center",
    gap: isTablet ? 0 : 10,
    paddingHorizontal: isTablet ? 20 : 20,
    paddingTop: isTablet ? 0 : 5,
    paddingBottom: 0,
    marginBottom: isTablet ? -25 : 0,
  },
  // Lore Section
  loreContainer: {
    paddingHorizontal: 15,
    paddingBottom: 10,
    paddingTop: isTablet ? 0 : 0,
    marginTop: isTablet ? -5 : 0,
  },
  loreBgImage: {
    borderRadius: 12,
  },
  loreCenterContent: {
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: isTablet ? 50 : 10,
    paddingTop: isTablet ? 15 : 5,
  },
  loreRowContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 3,
    marginTop: isTablet ? -15 : 0,
  },
  loreTextContainer: {
    flex: 1,
    paddingRight: "3%",
  },
  loreText: {
    color: "#181818",
    fontSize: isTablet ? 20 : 16,
    lineHeight: isTablet ? 28 : 24,
    fontFamily: "IMFellEnglish-Italic",
    textAlign: "center",
    maxWidth: isTablet ? "70%" : "100%",
  },
  loreImage: {
    width: width * 0.28 * loreScale,
    height: width * 0.25 * loreScale,
    alignSelf: "flex-end",
    position: "relative",
    top: isTablet ? 25 : 54,
    marginLeft: -25,
  },
  // Special layout for sword
  loreSwordContent: {
    flex: 1,
    flexDirection: "row",
    padding: "3%",
    alignItems: "center",
  },
  loreSwordLeftColumn: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  loreSwordImage: {
    width: width * 0.35 * loreScale,
    height: width * 0.2 * loreScale,
    marginTop: 8,
    marginLeft: 10,
  },
  loreSwordRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  loreTextContainerSmall: {
    flex: 1,
    paddingRight: "2%",
  },
  loreTextSmall: {
    color: "#181818",
    fontSize: isTablet ? 20 : 16,
    lineHeight: isTablet ? 28 : 24,
    fontFamily: "IMFellEnglish-Italic",
    textAlign: "left",
  },
  loreBelzyImage: {
    width: width * 0.25 * loreScale,
    height: "100%",
  },
});

export const shopItemStyles = StyleSheet.create({
  card: {
    width: width * 0.56 * tabletScale,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: width * 0.05 * tabletScale,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.4)",
    overflow: "hidden",
  },
  cardOwned: {
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  cardSelected: {
    borderColor: "#8b5cf6",
    borderWidth: 3,
    transform: [{ scale: 1.02 }],
  },
  imageContainer: {
    height: width * 0.48 * tabletScale,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  itemImage: {
    width: width * 0.32 * tabletScale,
    height: width * 0.32 * tabletScale,
  },
  ownedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(34, 197, 94, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ownedBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  // Quantity badge - afișează câte ai
  quantityBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(139, 92, 246, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  quantityBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  ownedText: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardContent: {
    padding: width * 0.03 * tabletScale,
  },
  itemName: {
    color: "#fff",
    fontSize: width * 0.042 * tabletScale,
    fontWeight: "700",
    marginBottom: 4,
  },
  itemDescription: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: width * 0.028 * tabletScale,
    lineHeight: width * 0.042 * tabletScale,
    marginBottom: width * 0.03 * tabletScale,
  },
  priceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: width * 0.025 * tabletScale,
    borderRadius: width * 0.025 * tabletScale,
    gap: 6,
  },
  priceButtonEnabled: {
    backgroundColor: "#8b5cf6",
  },
  priceButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  priceButtonOwned: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
  },
  priceIcon: {
    width: width * 0.045 * tabletScale,
    height: width * 0.045 * tabletScale,
  },
  priceText: {
    fontSize: width * 0.035 * tabletScale,
    fontWeight: "700",
  },
  priceTextEnabled: {
    color: "#fff",
  },
  priceTextDisabled: {
    color: "rgba(255, 255, 255, 0.4)",
  },
  priceTextOwned: {
    color: "#22c55e",
  },
});
