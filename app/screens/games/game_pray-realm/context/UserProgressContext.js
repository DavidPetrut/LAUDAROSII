import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

const UserProgressContext = createContext(null);

const initialProgress = {
  userId: null,
  currentRealm: 1,
  currentLevel: 1,
  totalPoints: 0,
  completedLevels: [],
  unlockedLevels: [1],
  achievements: [],
  lastPlayedAt: null,
};

export const UserProgressProvider = ({ children, userId }) => {
  const [progress, setProgress] = useState({
    ...initialProgress,
    userId,
  });

  const updateProgress = useCallback((updates) => {
    setProgress((prev) => ({
      ...prev,
      ...updates,
      lastPlayedAt: new Date().toISOString(),
    }));
  }, []);

  const addPoints = useCallback((points) => {
    setProgress((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints + points,
    }));
  }, []);

  const completeLevel = useCallback((level) => {
    setProgress((prev) => {
      if (prev.completedLevels.includes(level)) return prev;

      const newCompletedLevels = [...prev.completedLevels, level];
      const newUnlockedLevels = prev.unlockedLevels.includes(level + 1)
        ? prev.unlockedLevels
        : [...prev.unlockedLevels, level + 1];

      return {
        ...prev,
        completedLevels: newCompletedLevels,
        unlockedLevels: newUnlockedLevels,
        currentLevel: Math.max(prev.currentLevel, level + 1),
      };
    });
  }, []);

  const addAchievement = useCallback((achievement) => {
    setProgress((prev) => {
      if (prev.achievements.some((a) => a.id === achievement.id)) return prev;
      return {
        ...prev,
        achievements: [...prev.achievements, achievement],
      };
    });
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({
      ...initialProgress,
      userId,
    });
  }, [userId]);

  const value = useMemo(
    () => ({
      progress,
      updateProgress,
      addPoints,
      completeLevel,
      addAchievement,
      resetProgress,
    }),
    [
      progress,
      updateProgress,
      addPoints,
      completeLevel,
      addAchievement,
      resetProgress,
    ]
  );

  return (
    <UserProgressContext.Provider value={value}>
      {children}
    </UserProgressContext.Provider>
  );
};

export const useUserProgress = () => {
  const context = useContext(UserProgressContext);
  if (!context) {
    throw new Error("useUserProgress must be used within UserProgressProvider");
  }
  return context;
};
