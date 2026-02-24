import { useEffect, useRef, useCallback } from 'react';
import { PAUSE_TIME, MAX_LEVEL } from '../constants/gameConfig';

export const useGameLoop = (gameState, actions) => {
  const { currentLevel, targetLevel, isPaused, isFinished } = gameState;
  const { advanceLevel, setPaused, setFinished } = actions;
  
  const pauseTimeoutRef = useRef(null);

  const handleLevelReached = useCallback((level) => {
    setPaused(true);
    
    if (level === MAX_LEVEL) {
      setTimeout(() => setFinished(), 600);
      return;
    }

    pauseTimeoutRef.current = setTimeout(() => {
      advanceLevel();
      setPaused(false);
    }, PAUSE_TIME);
  }, [setPaused, setFinished, advanceLevel]);

  const handleFinished = useCallback(() => {
    setFinished();
  }, [setFinished]);

  const cleanup = useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    handleLevelReached,
    handleFinished,
  };
};

