import React, { useState } from "react";
import { View, Image, TouchableOpacity, Text, StyleSheet } from "react-native";
import { platformStyles } from "../styles/platformStyles";
import {
  STEP_SCALE,
  SCREEN_WIDTH,
  rem,
  BADGE_SCALE,
} from "../constants/dimensions";
import { isBreakLevel, isTrophyLevel } from "../utils/levelUtils";
import { MAX_LEVEL } from "../constants/gameConfig";
import { getLevelCost, getUnlockFee } from "../data/levelCosts";
import LevelNumber from "./LevelNumber";
import HammerIcon from "./HammerIcon";
import TrophyIcon from "./TrophyIcon";
import Explosion from "./Explosion";
import DisabledOverlay from "./DisabledOverlay";
import { GameImages } from "../assets";

// Dimensiuni responsive pentru trepte
const STEP_WIDTH = rem(200) * STEP_SCALE;
const STEP_HEIGHT = rem(100) * STEP_SCALE;

// Badge scale pentru alabastru/fees - 50% mai mari pe mobil
const badgeRem = (size) => rem(size) * BADGE_SCALE;

const Platform = ({
  level,
  screenY,
  showLevelInfo,
  stepImage,
  hammerImage,
  trophyImage,
  isUnlocked,
  canAfford,
  onPress,
  onPayFee,
  currentPlayerLevel,
  isFeePaid,
  canAffordFee,
  onShowToast, // Callback pentru a afișa toast când nu ai bani
  onShowToolToast, // Callback pentru toast cu tool necesar
  feeMultiplier = 1, // Multiplicator pentru fee (x2 când Belzy te-a pedepsit)
  hasRequiredTool = true, // Dacă player-ul are tool-ul necesar (hammer pt break levels)
}) => {
  const [showExplosion, setShowExplosion] = useState(false);

  const isTrophy = isTrophyLevel(level, MAX_LEVEL);
  const isBreak = isBreakLevel(level);
  const cost = getLevelCost(level);
  const baseFee = getUnlockFee(level);
  const isNextLevel = level === currentPlayerLevel + 1;
  const showCostBadge = showLevelInfo && !isUnlocked && level > 1 && !isTrophy;
  const isFree = baseFee === "free" || baseFee === 0;

  // Calculează fee-ul real (cu multiplicator dacă Belzy te-a pedepsit)
  const unlockFee = isFree ? baseFee : baseFee * feeMultiplier;

  // Break level fără hammer = disabled
  const needsToolButMissing = isBreak && !hasRequiredTool;

  const handlePress = () => {
    console.log("Platform pressed:", {
      level,
      isNextLevel,
      isUnlocked,
      canAfford,
      isFeePaid,
      unlockFee,
      isFree,
      canAffordFee,
      hasRequiredTool,
      needsToolButMissing,
    });

    if (isNextLevel) {
      // Verifică dacă e break level și nu are tool-ul
      if (needsToolButMissing) {
        onShowToolToast?.("hammer");
        return;
      }

      if (!isFeePaid) {
        // Verifică dacă poate plăti fee-ul
        if (!isFree && !canAffordFee) {
          onShowToast?.("Nu ai suficient Alabastru!");
          return;
        }
        // ARE bani sau e FREE - trigger explosion și plătește
        setShowExplosion(true);
        onPayFee?.(level, unlockFee);
      } else {
        // Fee plătit, verifică dacă poate urca
        if (!canAfford) {
          onShowToast?.("Nu ai suficient Alabastru!");
          return;
        }
        // Fee paid, now pay the cost to climb
        onPress?.(level);
      }
    }
  };

  // Handler pentru click pe hammer disabled
  const handleHammerPress = () => {
    if (needsToolButMissing) {
      onShowToolToast?.("hammer");
    }
  };

  const handleExplosionComplete = () => {
    setShowExplosion(false);
  };

  // Show fee display for ALL next levels that haven't paid (including free ones)
  const showFee = isNextLevel && !isFeePaid;
  const showCost = isNextLevel && isFeePaid;

  // Badge-ul e disabled dacă: nu are bani SAU nu are tool-ul necesar
  const isBadgeDisabled =
    needsToolButMissing ||
    (!showFee && !canAfford) ||
    (showFee && !canAffordFee && !isFree);

  return (
    <View
      style={[platformStyles.container, { top: screenY - STEP_HEIGHT / 2 }]}
    >
      <Image
        source={stepImage}
        style={[
          platformStyles.stepImage,
          { width: STEP_WIDTH, height: STEP_HEIGHT },
        ]}
      />

      {/* Level info - doar pentru trophy și nivele deblocate */}
      {showLevelInfo && (isTrophy || isUnlocked) && (
        <View style={platformStyles.levelInfoContainer}>
          {isTrophy ? (
            <TrophyIcon trophyImage={trophyImage} />
          ) : (
            <>
              {isBreak && <HammerIcon hammerImage={hammerImage} />}
              <LevelNumber level={level} />
            </>
          )}
        </View>
      )}

      {/* Cost Badge - pentru nivele neblocate */}
      {showCostBadge && (
        <View
          style={[
            styles.badgeContainer,
            // Pentru break levels când arătăm costul, layout orizontal cu hammer în stânga
            isBreak && showCost && styles.badgeContainerBreak,
          ]}
        >
          {/* Hammer în stânga pentru break levels - doar când fee e plătit */}
          {isBreak && showCost && (
            <TouchableOpacity
              onPress={handleHammerPress}
              activeOpacity={needsToolButMissing ? 0.7 : 1}
              disabled={!needsToolButMissing}
            >
              <View style={styles.hammerWrapper}>
                <Image
                  source={hammerImage}
                  style={[
                    styles.hammerLeft,
                    needsToolButMissing && styles.hammerDisabled,
                  ]}
                  resizeMode="contain"
                />
                {/* Overlay gri pentru hammer disabled */}
                {needsToolButMissing && (
                  <View style={styles.hammerDisabledOverlay} />
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* Explosion animation - triggered when paying fee */}
          <Explosion
            visible={showExplosion}
            onComplete={handleExplosionComplete}
            size={240}
          />

          <TouchableOpacity
            style={[
              styles.costBadge,
              // Mută badge-ul mai în dreapta pentru break levels când fee e plătit
              isBreak && showCost && styles.costBadgeBreakOffset,
              // Stiluri active/disabled
              showCost &&
                canAfford &&
                !needsToolButMissing &&
                styles.costBadgeActive,
              showCost &&
                (!canAfford || needsToolButMissing) &&
                styles.costBadgeNoMoney,
              showFee &&
                canAffordFee &&
                !needsToolButMissing &&
                styles.costBadgeFee,
              showFee &&
                (!canAffordFee || needsToolButMissing) &&
                !isFree &&
                styles.costBadgeNoMoney,
              !isNextLevel && styles.costBadgeDisabled,
            ]}
            onPress={handlePress}
            disabled={!isNextLevel}
            activeOpacity={0.7}
          >
            {!isNextLevel ? (
              // Nivele viitoare - lock + level number
              <View style={styles.badgeContent}>
                <Text style={styles.lockIcon}>🔒</Text>
                <Text style={styles.levelInBadge}>{level}</Text>
              </View>
            ) : showFee ? (
              // Next level - needs unlock fee: lock + alabastru + fee (or FREE)
              <View style={styles.badgeContent}>
                <Text style={styles.lockIcon}>🔒</Text>
                <Image
                  source={GameImages.alabastru}
                  style={styles.alabastruIconSmall}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.feeText,
                    isFree
                      ? styles.feeTextFree
                      : canAffordFee && !needsToolButMissing
                      ? styles.feeTextActive
                      : styles.feeTextNoMoney,
                  ]}
                >
                  {isFree ? "FREE" : unlockFee}
                </Text>
              </View>
            ) : (
              // Next level (fee paid or free) - alabastru cost
              <View style={styles.badgeContent}>
                <Image
                  source={GameImages.alabastru}
                  style={styles.alabastruIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.costText,
                    canAfford && !needsToolButMissing
                      ? styles.costTextActive
                      : styles.costTextNoMoney,
                  ]}
                >
                  {cost}
                </Text>
                {(!canAfford || needsToolButMissing) && (
                  <Text style={styles.lockIconSmall}>🔒</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Badge container - poziție (nu se scalează cu BADGE_SCALE)
  badgeContainer: {
    position: "absolute",
    alignSelf: "center",
    top: rem(-28),
    alignItems: "center",
    justifyContent: "center",
  },
  badgeContainerBreak: {
    flexDirection: "row",
    alignItems: "center",
    top: rem(-35),
  },
  hammerWrapper: {
    position: "relative",
  },
  hammerLeft: {
    width: badgeRem(55),
    height: badgeRem(55),
    marginRight: 0,
  },
  hammerDisabled: {
    opacity: 0.4,
  },
  hammerDisabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(100, 100, 110, 0.5)",
    borderRadius: badgeRem(8),
  },
  costBadgeBreakOffset: {
    marginLeft: badgeRem(5),
  },
  // Cost badge - SCALAT cu BADGE_SCALE (50% mai mare pe mobil)
  costBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: badgeRem(12),
    paddingVertical: badgeRem(7),
    borderRadius: badgeRem(18),
    minWidth: badgeRem(75),
    backgroundColor: "rgba(30, 30, 50, 0.85)",
    borderWidth: 2,
    borderColor: "rgba(139, 92, 246, 0.6)",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: badgeRem(3) },
    shadowOpacity: 0.4,
    shadowRadius: badgeRem(6),
    elevation: 6,
  },
  costBadgeActive: {
    backgroundColor: "rgba(30, 60, 45, 0.9)",
    borderColor: "rgba(34, 197, 94, 0.8)",
    shadowColor: "#22c55e",
  },
  costBadgeFee: {
    backgroundColor: "rgba(80, 60, 30, 0.9)",
    borderColor: "rgba(251, 191, 36, 0.8)",
    shadowColor: "#fbbf24",
  },
  costBadgeLocked: {
    backgroundColor: "rgba(60, 40, 80, 0.9)",
    borderColor: "rgba(167, 139, 250, 0.6)",
    shadowColor: "#a78bfa",
  },
  // Badge când NU ai bani sau tool - disabled look (roșiatic)
  costBadgeNoMoney: {
    backgroundColor: "rgba(50, 30, 35, 0.9)",
    borderColor: "rgba(239, 100, 100, 0.7)",
    shadowColor: "#ef4444",
  },
  costBadgeDisabled: {
    backgroundColor: "rgba(40, 40, 50, 0.7)",
    borderColor: "rgba(100, 100, 120, 0.4)",
  },
  badgeContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  // Alabastru icons - SCALATE cu BADGE_SCALE (50% mai mari pe mobil)
  alabastruIcon: {
    width: badgeRem(26),
    height: badgeRem(26),
    marginRight: badgeRem(5),
  },
  alabastruIconSmall: {
    width: badgeRem(20),
    height: badgeRem(20),
    marginLeft: badgeRem(5),
    marginRight: badgeRem(4),
  },
  // Text - SCALAT cu BADGE_SCALE (50% mai mare pe mobil)
  costText: {
    fontSize: badgeRem(16),
    fontWeight: "800",
  },
  feeText: {
    fontSize: badgeRem(14),
    fontWeight: "700",
  },
  costTextActive: {
    color: "#4ade80",
  },
  costTextLocked: {
    color: "#e2e8f0",
  },
  // Cost text când NU ai bani - disabled gri închis
  costTextNoMoney: {
    color: "#6b7280",
  },
  feeTextActive: {
    color: "#fbbf24",
  },
  feeTextLocked: {
    color: "#e2e8f0",
  },
  // Text când NU ai bani - disabled gri închis
  feeTextNoMoney: {
    color: "#6b7280",
  },
  feeTextFree: {
    color: "#4ade80",
    fontWeight: "800",
  },
  lockIcon: {
    fontSize: badgeRem(16),
  },
  lockIconSmall: {
    fontSize: badgeRem(12),
    marginLeft: badgeRem(5),
  },
  levelInBadge: {
    fontSize: badgeRem(14),
    fontWeight: "700",
    color: "#94a3b8",
    marginLeft: badgeRem(5),
  },
});

export default React.memo(Platform);
