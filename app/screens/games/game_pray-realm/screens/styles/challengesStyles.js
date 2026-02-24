import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const challengesStyles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  filterTabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterTabBtn: {
    padding: 2,
    justifyContent: "center",
  },
  filterTabActiveImage: {
    width: width * 0.26,
    height: height * 0.05,
  },
  filterTabCompletateImage: {
    width: width * 0.36,
    height: height * 0.06,
  },
  filterTabInactive: {
    opacity: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    width: 43,
    height: 43,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
});

// Stiluri pentru cardul de provocare cu bg papyrus si text inchis
export const challengeCardStyles = StyleSheet.create({
  card: {
    marginBottom: 14,
    borderRadius: 14,
    overflow: "hidden",
    padding: 14,
    minHeight: 100,
    borderWidth: 2,
    borderColor: "#82502f",
  },
  cardCompleted: {
    borderColor: "#4ade80",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  cardImage: {
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: {
    color: "#302c26",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stageTag: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#302c26",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stageTagText: {
    color: "#302c26",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  infoButton: {
    padding: 4,
  },
  infoIcon: {
    width: 36,
    height: 36,
  },
  expandedContent: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(48, 44, 38, 0.2)",
  },
  cardDescription: {
    color: "#302c26",
    fontSize: 13,
    lineHeight: 19,
  },
  cardAction: {
    color: "rgba(48, 44, 38, 0.7)",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 5,
    backgroundColor: "rgba(48, 44, 38, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#82502f",
    borderRadius: 3,
  },
  progressText: {
    color: "rgba(48, 44, 38, 0.7)",
    fontSize: 11,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 12,
  },
  expiryContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  expiryText: {
    color: "rgba(48, 44, 38, 0.6)",
    fontSize: 11,
  },
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#302c26",
  },
  claimButtonReady: {
    backgroundColor: "rgba(74, 222, 128, 0.2)",
    borderColor: "#4ade80",
  },
  claimButtonClaimed: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    borderColor: "#4ade80",
  },
  claimButtonText: {
    color: "#302c26",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  claimButtonTextComplete: {
    color: "#16a34a",
  },
  rewardIcon: {
    width: 16,
    height: 16,
  },
  rewardAmount: {
    color: "#302c26",
    fontSize: 13,
    fontWeight: "700",
  },
});
