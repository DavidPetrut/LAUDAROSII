import {
  LEVEL_HEIGHT,
  AVATAR_SIZE,
  SCREEN_HEIGHT,
  AVATAR_STAND_OFFSET,
} from "../constants/dimensions";
import { START_LEVEL_OFFSET } from "../constants/gameConfig";

export const calculatePlatformY = (level) => {
  return -(level + START_LEVEL_OFFSET) * LEVEL_HEIGHT;
};

export const calculateAvatarStandY = (level) => {
  // Avatarul stă deasupra platformei
  // AVATAR_STAND_OFFSET - offset mai mare pentru a nu intra în scară
  return calculatePlatformY(level) - AVATAR_SIZE / 2 - AVATAR_STAND_OFFSET;
};

export const calculateCameraY = (avatarY) => {
  return avatarY - SCREEN_HEIGHT / 2;
};

export const worldToScreenY = (worldY, cameraY) => {
  return worldY - cameraY;
};

export const calculateBackgroundY = (cameraY, baseOffset, scrollFactor) => {
  return baseOffset - cameraY * scrollFactor;
};
