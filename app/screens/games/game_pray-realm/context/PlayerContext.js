import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { PlayerApi } from "../api/playerApi";
import { ChallengesApi } from "../api/challengesApi";
import { INITIAL_PLAYER_DATA } from "../db/schema";

const PlayerContext = createContext(null);

export const PlayerProvider = ({ children, userId }) => {
  const [player, setPlayer] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPlayer = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      let playerData = await PlayerApi.getPlayer(userId);

      if (!playerData || !playerData.id) {
        playerData = await PlayerApi.createPlayer(userId);
      }

      setPlayer(playerData);

      const playerChallenges = await ChallengesApi.getPlayerChallenges(userId);
      if (playerChallenges.length === 0) {
        const initialized = await ChallengesApi.initializeChallenges(userId, 1);
        setChallenges(initialized);
      } else {
        setChallenges(playerChallenges);
      }
    } catch (err) {
      console.error("Error loading player:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPlayer();
  }, [loadPlayer]);

  const refreshPlayer = useCallback(async () => {
    await loadPlayer();
  }, [loadPlayer]);

  const updateAlabastru = useCallback(
    async (amount, source, sourceId) => {
      if (!userId) return;

      try {
        const updated = await PlayerApi.updateAlabastru(
          userId,
          amount,
          source,
          sourceId
        );
        setPlayer((prev) => ({
          ...prev,
          alabastru: updated,
        }));
        return updated;
      } catch (err) {
        console.error("Error updating alabastru:", err);
        throw err;
      }
    },
    [userId]
  );

  const unlockLevel = useCallback(
    async (level, cost) => {
      if (!userId) return;

      try {
        const updatedProgress = await PlayerApi.unlockLevel(
          userId,
          level,
          cost
        );
        setPlayer((prev) => ({
          ...prev,
          progress: updatedProgress,
        }));
        await refreshPlayer();
        return updatedProgress;
      } catch (err) {
        console.error("Error unlocking level:", err);
        throw err;
      }
    },
    [userId, refreshPlayer]
  );

  const completeStage = useCallback(
    async (stage) => {
      if (!userId) return;

      try {
        const updatedPlayer = await PlayerApi.completeStage(userId, stage);
        setPlayer(updatedPlayer);
        return updatedPlayer;
      } catch (err) {
        console.error("Error completing stage:", err);
        throw err;
      }
    },
    [userId]
  );

  const claimChallenge = useCallback(
    async (challengeId) => {
      if (!userId) return;

      try {
        const result = await ChallengesApi.claimChallenge(userId, challengeId);
        await updateAlabastru(result.reward, "challenge", challengeId);

        const updatedChallenges = await ChallengesApi.getPlayerChallenges(
          userId
        );
        setChallenges(updatedChallenges);

        return result;
      } catch (err) {
        console.error("Error claiming challenge:", err);
        throw err;
      }
    },
    [userId, updateAlabastru]
  );

  const updateChallengeProgress = useCallback(
    async (challengeId, increment = 1) => {
      if (!userId) return;

      try {
        const updated = await ChallengesApi.updateChallengeProgress(
          userId,
          challengeId,
          increment
        );

        const updatedChallenges = await ChallengesApi.getPlayerChallenges(
          userId
        );
        setChallenges(updatedChallenges);

        return updated;
      } catch (err) {
        console.error("Error updating challenge progress:", err);
        throw err;
      }
    },
    [userId]
  );

  const isNewPlayer = useMemo(() => {
    if (!player) return true;
    return (
      player.progress.currentLevel === 1 && player.stats.totalPrayers === 0
    );
  }, [player]);

  const value = useMemo(
    () => ({
      player,
      challenges,
      loading,
      error,
      isNewPlayer,

      refreshPlayer,
      updateAlabastru,
      unlockLevel,
      completeStage,
      claimChallenge,
      updateChallengeProgress,
    }),
    [
      player,
      challenges,
      loading,
      error,
      isNewPlayer,
      refreshPlayer,
      updateAlabastru,
      unlockLevel,
      completeStage,
      claimChallenge,
      updateChallengeProgress,
    ]
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return context;
};
