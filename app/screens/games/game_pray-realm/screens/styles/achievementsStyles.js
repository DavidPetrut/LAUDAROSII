import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");
const CARD_SIZE = width * 0.35;

export const achievementsStyles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  headerSpacer: {
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeIcon: {
    width: 49,
    height: 49,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  grid: {
    alignItems: "center",
    marginTop: -height * 0.02,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  gridRowDouble: {
    gap: 16,
  },
  gridRowSingle: {
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  collectionButton: {
    position: "absolute",
    bottom: 24,
    right: 16,
  },
  collectionButtonImage: {
    width: width * 0.42,
    height: height * 0.065,
  },
});

// Stiluri pentru cardul cu rama din galerie
export const galleryCardStyles = StyleSheet.create({
  frameContainer: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  innerContent: {
    width: CARD_SIZE * 0.6,
    height: CARD_SIZE * 0.6,
    justifyContent: "center",
    alignItems: "center",
  },
  achievementImage: {
    width: "80%",
    height: "80%",
  },
  lockedImage: {
    opacity: 0.3,
    tintColor: "#333",
  },
});

// Stiluri vechi pentru compatibilitate cu AchievementCard
export const achievementCardStyles = StyleSheet.create({
  card: {
    width: (width - 56) / 2,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
    overflow: "hidden",
    opacity: 0.4,
  },
  cardUnlocked: {
    opacity: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  imageContainer: {
    height: 100,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  achievementImage: {
    width: 60,
    height: 60,
  },
  lockedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  lockedIcon: {
    fontSize: 24,
  },
  cardContent: {
    padding: 12,
  },
  achievementName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  achievementDescription: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    lineHeight: 16,
  },
  unlockedDate: {
    color: "rgba(251, 191, 36, 0.7)",
    fontSize: 10,
    marginTop: 8,
  },
});
