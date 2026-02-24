import { ChallengesApi } from "../api/challengesApi";
import { PlayerApi } from "../api/playerApi";
import { CHALLENGE_TYPES, STAGE_1_CHALLENGES } from "../data/challenges";

export const PrayerIntegrationService = {
  onPrayerCompleted: async (userId, prayerData) => {
    if (!userId) return { updatedChallenges: [] };

    try {
      // Get challenges, auto-initialize if they don't exist
      let challenges = await ChallengesApi.getPlayerChallenges(userId);
      if (challenges.length === 0) {
        challenges = await ChallengesApi.initializeChallenges(userId, 1);
      }
      const updatedChallenges = [];

      for (const challenge of challenges) {
        if (challenge.status !== "ACTIVE") continue;

        const challengeConfig = STAGE_1_CHALLENGES.find(
          (c) => c.id === challenge.challengeId
        );
        if (!challengeConfig) continue;

        let shouldUpdate = false;

        switch (challengeConfig.type) {
          case CHALLENGE_TYPES.PRAY_COUNT:
            if (
              challengeConfig.requirement.tab === "any" ||
              challengeConfig.requirement.tab === prayerData.tab
            ) {
              shouldUpdate = true;
            }
            break;

          case CHALLENGE_TYPES.PERSONAL_PRAYERS:
            if (prayerData.tab === "personal") {
              shouldUpdate = true;
            }
            break;

          case CHALLENGE_TYPES.CHURCH_PRAYERS:
            if (prayerData.tab === "church") {
              shouldUpdate = true;
            }
            break;

          case CHALLENGE_TYPES.PRAY_FOR_PEOPLE:
            if (prayerData.forPerson) {
              shouldUpdate = true;
            }
            break;
        }

        if (shouldUpdate) {
          const updated = await ChallengesApi.updateChallengeProgress(
            userId,
            challenge.challengeId,
            1
          );
          if (updated) {
            updatedChallenges.push(updated);
          }
        }
      }

      const player = await PlayerApi.getPlayer(userId);
      await PlayerApi.updateStats(userId, {
        totalPrayers: player.stats.totalPrayers + 1,
        lastPrayerDate: new Date().toISOString(),
      });

      if (player.stats.totalPrayers === 0) {
        await PlayerApi.unlockAchievement(userId, "first_prayer");
      }

      return { updatedChallenges };
    } catch (error) {
      console.error("PrayerIntegrationService.onPrayerCompleted error:", error);
      return { updatedChallenges: [] };
    }
  },

  onPrayerAdded: async (userId) => {
    if (!userId) return { updatedChallenges: [] };

    try {
      let challenges = await ChallengesApi.getPlayerChallenges(userId);
      if (challenges.length === 0) {
        challenges = await ChallengesApi.initializeChallenges(userId, 1);
      }
      const updatedChallenges = [];

      for (const challenge of challenges) {
        if (challenge.status !== "ACTIVE") continue;

        const challengeConfig = STAGE_1_CHALLENGES.find(
          (c) => c.id === challenge.challengeId
        );
        if (!challengeConfig) continue;

        if (challengeConfig.type === CHALLENGE_TYPES.ADD_PRAYERS) {
          const updated = await ChallengesApi.updateChallengeProgress(
            userId,
            challenge.challengeId,
            1
          );
          if (updated) {
            updatedChallenges.push(updated);
          }
        }
      }

      return { updatedChallenges };
    } catch (error) {
      console.error("PrayerIntegrationService.onPrayerAdded error:", error);
      return { updatedChallenges: [] };
    }
  },

  onStreakUpdated: async (userId, streakCount) => {
    if (!userId) return { updatedChallenges: [], achievements: [] };

    try {
      let challenges = await ChallengesApi.getPlayerChallenges(userId);
      if (challenges.length === 0) {
        challenges = await ChallengesApi.initializeChallenges(userId, 1);
      }
      const updatedChallenges = [];
      const achievements = [];

      for (const challenge of challenges) {
        if (challenge.status !== "ACTIVE") continue;

        const challengeConfig = STAGE_1_CHALLENGES.find(
          (c) => c.id === challenge.challengeId
        );
        if (!challengeConfig) continue;

        if (challengeConfig.type === CHALLENGE_TYPES.DAILY_STREAK) {
          const requiredStreak = challengeConfig.requirement.streakDays;
          if (streakCount >= requiredStreak) {
            const progress = requiredStreak - challenge.progress.current;
            if (progress > 0) {
              const updated = await ChallengesApi.updateChallengeProgress(
                userId,
                challenge.challengeId,
                progress
              );
              if (updated) {
                updatedChallenges.push(updated);
              }
            }
          } else {
            const newProgress = Math.min(streakCount, requiredStreak);
            if (newProgress !== challenge.progress.current) {
              await ChallengesApi.updateChallengeProgress(
                userId,
                challenge.challengeId,
                newProgress - challenge.progress.current
              );
            }
          }
        }
      }

      const player = await PlayerApi.getPlayer(userId);
      const newLongestStreak = Math.max(
        player.stats.longestStreak,
        streakCount
      );

      await PlayerApi.updateStats(userId, {
        currentStreak: streakCount,
        longestStreak: newLongestStreak,
      });

      if (
        streakCount >= 7 &&
        !player.achievements.unlocked.includes("streak_7")
      ) {
        await PlayerApi.unlockAchievement(userId, "streak_7");
        achievements.push("streak_7");
      }

      return { updatedChallenges, achievements };
    } catch (error) {
      console.error("PrayerIntegrationService.onStreakUpdated error:", error);
      return { updatedChallenges: [], achievements: [] };
    }
  },

  checkChallengeNotifications: async (userId) => {
    if (!userId)
      return { readyToClaim: [], activeCount: 0, hasClaimable: false };

    try {
      const challenges = await ChallengesApi.getPlayerChallenges(userId);

      const readyToClaim = challenges.filter((c) => c.status === "COMPLETED");
      const active = challenges.filter((c) => c.status === "ACTIVE");

      return {
        readyToClaim,
        activeCount: active.length,
        hasClaimable: readyToClaim.length > 0,
      };
    } catch (error) {
      console.error(
        "PrayerIntegrationService.checkChallengeNotifications error:",
        error
      );
      return { readyToClaim: [], activeCount: 0, hasClaimable: false };
    }
  },
};
