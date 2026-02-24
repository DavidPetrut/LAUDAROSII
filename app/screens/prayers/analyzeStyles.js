import { StyleSheet } from "react-native";
import { colors, typography, spacing } from "../../public/styles/global";

export const analyzeStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  carouselContainer: {
    backgroundColor: "#1f1f1f",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: "#21c063",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  carouselHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: "#1f1f1f",
  },
  carouselTitle: {
    ...typography.body,
    color: "#fff",
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  medalIcon: {
    width: 32,
    height: 32,
  },
  carouselCount: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  carouselWrapper: {
    overflow: "hidden",
  },
  carouselContent: {
    paddingVertical: spacing.sm,
  },
  carouselItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: 60,
  },
  carouselEmoji: {
    fontSize: 20,
    color: "#21c063",
    marginRight: spacing.sm,
  },
  carouselText: {
    flex: 1,
    ...typography.bodySmall,
    color: "#fff",
  },
  emptyCarousel: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    ...typography.body,
    color: "rgba(255,255,255,0.6)",
  },
  buttonsContainer: {
    gap: spacing.md,
  },
  achievementsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f1f1f",
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f1f1f",
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  timerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f1f1f",
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnIcon: {
    width: 32,
    height: 32,
    marginRight: spacing.md,
  },
  btnEmoji: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  btnTextWrap: {
    flex: 1,
  },
  btnTitle: {
    ...typography.body,
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  btnSubtitle: {
    ...typography.caption,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
});
