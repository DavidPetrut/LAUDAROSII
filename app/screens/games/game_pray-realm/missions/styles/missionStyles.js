import { StyleSheet } from "react-native";
import { rem } from "../../constants/dimensions";

/**
 * Stiluri pentru componentele de misiuni
 * Refolosesc majoritatea din challengeCardStyles
 */
export const missionStyles = StyleSheet.create({
  // Container pentru caruselul de misiuni
  carouselContainer: {
    paddingHorizontal: rem(16),
    paddingVertical: rem(12),
  },
  carouselTitle: {
    color: "#fbbf24",
    fontSize: rem(18),
    fontWeight: "800",
    marginBottom: rem(12),
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: rem(40),
    paddingHorizontal: rem(20),
  },
  emptyIcon: {
    fontSize: rem(48),
    marginBottom: rem(16),
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: rem(14),
    textAlign: "center",
  },

  // Card container în carusel
  cardWrapper: {
    width: rem(280),
    marginRight: rem(12),
  },
});
