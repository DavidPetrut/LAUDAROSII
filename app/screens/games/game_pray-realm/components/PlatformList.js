import React, { useMemo } from "react";
import Platform from "./Platform";
import { getVisibleLevelsRange, isBreakLevel } from "../utils/levelUtils";
import { calculatePlatformY, worldToScreenY } from "../utils/positionUtils";
import { MAX_LEVEL } from "../constants/gameConfig";
import { GameImages, getStepImageForLevel } from "../assets";

const PlatformList = ({
  currentLevel,
  cameraY,
  onLevelPress,
  onPayFee,
  isLevelUnlocked,
  canAffordLevel,
  isFeePaid,
  canAffordFee,
  onShowToast,
  onShowToolToast,
  feeMultiplier = 1,
  hasHammer = false, // Dacă player-ul are cel puțin un ciocan
}) => {
  const { start, end } = getVisibleLevelsRange(currentLevel, MAX_LEVEL);

  const platforms = useMemo(() => {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  }, [start, end]);

  return (
    <>
      {platforms.map((level) => {
        const worldY = calculatePlatformY(level);
        const screenY = worldToScreenY(worldY, cameraY);
        const showLevelInfo = level > currentLevel;
        const isUnlocked = isLevelUnlocked?.(level) ?? false;
        const canAfford = canAffordLevel?.(level) ?? false;
        const feePaid = isFeePaid?.(level) ?? false;
        const affordFee = canAffordFee?.(level) ?? false;

        // Verifică dacă nivelul necesită un tool și dacă player-ul îl are
        const needsHammer = isBreakLevel(level);
        const hasRequiredTool = !needsHammer || hasHammer;

        return (
          <Platform
            key={level}
            level={level}
            screenY={screenY}
            showLevelInfo={showLevelInfo}
            stepImage={getStepImageForLevel(level)}
            hammerImage={GameImages.hammer}
            trophyImage={GameImages.trophy}
            isUnlocked={isUnlocked}
            canAfford={canAfford}
            onPress={onLevelPress}
            onPayFee={onPayFee}
            currentPlayerLevel={currentLevel}
            isFeePaid={feePaid}
            canAffordFee={affordFee}
            onShowToast={onShowToast}
            onShowToolToast={onShowToolToast}
            feeMultiplier={feeMultiplier}
            hasRequiredTool={hasRequiredTool}
          />
        );
      })}
    </>
  );
};

export default React.memo(PlatformList);
