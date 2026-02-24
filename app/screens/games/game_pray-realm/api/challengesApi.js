import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  STAGE_1_CHALLENGES,
  CHALLENGE_STATUS,
  CHALLENGE_EXPIRY_DAYS,
} from "../data/challenges";

const STORAGE_KEY_PREFIX = "pray_realm_challenges_";

export const ChallengesApi = {
  getPlayerChallenges: async (userId, autoInitialize = false) => {
    try {
      const data = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
      if (data) {
        const challenges = JSON.parse(data);
        return ChallengesApi.checkExpiredChallenges(challenges);
      }

      // Auto-initialize challenges if none exist and autoInitialize is true
      if (autoInitialize) {
        return await ChallengesApi.initializeChallenges(userId, 1);
      }

      return [];
    } catch (error) {
      console.error("ChallengesApi.getPlayerChallenges error:", error);
      return [];
    }
  },

  initializeChallenges: async (userId, stage = 1) => {
    try {
      const existingChallenges = await ChallengesApi.getPlayerChallenges(
        userId
      );

      const stageChallenges = stage === 1 ? STAGE_1_CHALLENGES : [];
      const now = new Date();
      const expiryDate = new Date(
        now.getTime() + CHALLENGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      );

      const newChallenges = stageChallenges
        .filter(
          (c) => !existingChallenges.some((ec) => ec.challengeId === c.id)
        )
        .map((challenge) => ({
          userId: userId,
          id: `${userId}_${challenge.id}`,
          challengeId: challenge.id,
          stage: challenge.stage,
          status: CHALLENGE_STATUS.ACTIVE,
          progress: {
            current: 0,
            required:
              challenge.requirement.count ||
              challenge.requirement.streakDays ||
              1,
          },
          startedAt: now.toISOString(),
          completedAt: null,
          claimedAt: null,
          expiresAt: expiryDate.toISOString(),
          reward: challenge.reward,
        }));

      const allChallenges = [...existingChallenges, ...newChallenges];
      await AsyncStorage.setItem(
        `${STORAGE_KEY_PREFIX}${userId}`,
        JSON.stringify(allChallenges)
      );

      return allChallenges;
    } catch (error) {
      console.error("ChallengesApi.initializeChallenges error:", error);
      throw error;
    }
  },

  updateChallengeProgress: async (
    userId,
    challengeId,
    progressIncrement = 1
  ) => {
    try {
      const challenges = await ChallengesApi.getPlayerChallenges(userId);
      const challengeIndex = challenges.findIndex(
        (c) =>
          c.challengeId === challengeId && c.status === CHALLENGE_STATUS.ACTIVE
      );

      if (challengeIndex === -1) return null;

      const challenge = challenges[challengeIndex];
      const newProgress = challenge.progress.current + progressIncrement;

      challenges[challengeIndex] = {
        ...challenge,
        progress: {
          ...challenge.progress,
          current: Math.min(newProgress, challenge.progress.required),
        },
        status:
          newProgress >= challenge.progress.required
            ? CHALLENGE_STATUS.COMPLETED
            : CHALLENGE_STATUS.ACTIVE,
        completedAt:
          newProgress >= challenge.progress.required
            ? new Date().toISOString()
            : null,
      };

      await AsyncStorage.setItem(
        `${STORAGE_KEY_PREFIX}${userId}`,
        JSON.stringify(challenges)
      );

      return challenges[challengeIndex];
    } catch (error) {
      console.error("ChallengesApi.updateChallengeProgress error:", error);
      throw error;
    }
  },

  claimChallenge: async (userId, challengeId) => {
    try {
      const challenges = await ChallengesApi.getPlayerChallenges(userId);
      const challengeIndex = challenges.findIndex(
        (c) =>
          c.challengeId === challengeId &&
          c.status === CHALLENGE_STATUS.COMPLETED
      );

      if (challengeIndex === -1) {
        throw new Error("Challenge not found or not completed");
      }

      const challenge = challenges[challengeIndex];

      challenges[challengeIndex] = {
        ...challenge,
        status: CHALLENGE_STATUS.CLAIMED,
        claimedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        `${STORAGE_KEY_PREFIX}${userId}`,
        JSON.stringify(challenges)
      );

      return {
        challenge: challenges[challengeIndex],
        reward: challenge.reward,
      };
    } catch (error) {
      console.error("ChallengesApi.claimChallenge error:", error);
      throw error;
    }
  },

  checkExpiredChallenges: (challenges) => {
    const now = new Date();
    return challenges.map((challenge) => {
      if (
        challenge.status === CHALLENGE_STATUS.ACTIVE &&
        new Date(challenge.expiresAt) < now
      ) {
        return {
          ...challenge,
          status: CHALLENGE_STATUS.EXPIRED,
        };
      }
      return challenge;
    });
  },

  getActiveChallenges: async (userId) => {
    const challenges = await ChallengesApi.getPlayerChallenges(userId);
    return challenges.filter((c) => c.status === CHALLENGE_STATUS.ACTIVE);
  },

  getCompletedChallenges: async (userId) => {
    const challenges = await ChallengesApi.getPlayerChallenges(userId);
    return challenges.filter((c) => c.status === CHALLENGE_STATUS.COMPLETED);
  },

  getClaimedChallenges: async (userId) => {
    const challenges = await ChallengesApi.getPlayerChallenges(userId);
    return challenges.filter((c) => c.status === CHALLENGE_STATUS.CLAIMED);
  },

  getChallengesByStage: async (userId, stage) => {
    const challenges = await ChallengesApi.getPlayerChallenges(userId);
    return challenges.filter((c) => c.stage === stage);
  },
};
