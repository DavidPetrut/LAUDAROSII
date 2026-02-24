import { useCallback } from "react";
import { PrayerIntegrationService } from "../services/prayerIntegrationService";

export const usePrayerGameIntegration = (userId) => {
  const onPrayerCompleted = useCallback(
    async (prayerData) => {
      if (!userId) return null;
      return await PrayerIntegrationService.onPrayerCompleted(
        userId,
        prayerData
      );
    },
    [userId]
  );

  const onPrayerAdded = useCallback(async () => {
    if (!userId) return null;
    return await PrayerIntegrationService.onPrayerAdded(userId);
  }, [userId]);

  const onStreakUpdated = useCallback(
    async (streakCount) => {
      if (!userId) return null;
      return await PrayerIntegrationService.onStreakUpdated(
        userId,
        streakCount
      );
    },
    [userId]
  );

  const checkNotifications = useCallback(async () => {
    if (!userId) return { hasClaimable: false, activeCount: 0 };
    return await PrayerIntegrationService.checkChallengeNotifications(userId);
  }, [userId]);

  return {
    onPrayerCompleted,
    onPrayerAdded,
    onStreakUpdated,
    checkNotifications,
  };
};
