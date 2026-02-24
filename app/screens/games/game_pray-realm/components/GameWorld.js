import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { gameStyles } from "../styles/gameStyles";
import Background from "./Background";
import PlatformList from "./PlatformList";
import AvatarWithBuffs from "./AvatarWithBuffs";
import { GameImages } from "../assets";

const GameWorld = ({
  avatarY,
  cameraY,
  currentLevel,
  revealProgress,
  isFullyRevealed,
  avatarImage,
  onLevelPress,
  onPayFee,
  isLevelUnlocked,
  canAffordLevel,
  isFeePaid,
  canAffordFee,
  onShowToast,
  onShowToolToast,
  feeMultiplier = 1,
  hasHammer = false,
  hasShield = false,
  hasSword = false,
  avatarRef,
}) => {
  const [cameraYValue, setCameraYValue] = useState(0);

  // Ascultă modificările cameraY pentru a re-renda componentele
  useEffect(() => {
    const listenerId = cameraY.addListener(({ value }) => {
      setCameraYValue(value);
    });

    // Set valoarea inițială
    setCameraYValue(cameraY._value || 0);

    return () => {
      cameraY.removeListener(listenerId);
    };
  }, [cameraY]);

  return (
    <View style={gameStyles.gameArea}>
      <Background
        cameraY={cameraYValue}
        revealProgress={revealProgress}
        isFullyRevealed={isFullyRevealed}
        stoneImage={GameImages.treePiatra}
        treeImage={GameImages.tree}
        currentLevel={currentLevel}
      />

      <PlatformList
        currentLevel={currentLevel}
        cameraY={cameraYValue}
        onLevelPress={onLevelPress}
        onPayFee={onPayFee}
        isLevelUnlocked={isLevelUnlocked}
        canAffordLevel={canAffordLevel}
        isFeePaid={isFeePaid}
        canAffordFee={canAffordFee}
        onShowToast={onShowToast}
        onShowToolToast={onShowToolToast}
        feeMultiplier={feeMultiplier}
        hasHammer={hasHammer}
      />

      {/* Avatar cu buff-uri */}
      <AvatarWithBuffs
        ref={avatarRef}
        avatarY={avatarY}
        cameraY={cameraY}
        avatarImage={avatarImage}
        hasShield={hasShield}
        hasSword={hasSword}
      />
    </View>
  );
};

export default React.memo(GameWorld);
