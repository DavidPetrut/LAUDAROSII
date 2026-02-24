import { useReducer, useCallback } from 'react';
import { createInitialGameState, gameReducer, GameActions } from '../state/gameState';
import { MAX_LEVEL } from '../constants/gameConfig';

export const useGameState = () => {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialGameState);

  const advanceLevel = useCallback(() => {
    const newCurrentLevel = state.targetLevel;
    const newTargetLevel = Math.min(state.targetLevel + 1, MAX_LEVEL);
    
    dispatch({
      type: GameActions.ADVANCE_LEVEL,
      payload: {
        currentLevel: newCurrentLevel,
        targetLevel: newTargetLevel,
      },
    });
  }, [state.targetLevel]);

  const setPaused = useCallback((paused) => {
    dispatch({ type: GameActions.SET_PAUSED, payload: paused });
  }, []);

  const setFinished = useCallback(() => {
    dispatch({ type: GameActions.SET_FINISHED });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: GameActions.RESET_GAME });
  }, []);

  return {
    ...state,
    advanceLevel,
    setPaused,
    setFinished,
    resetGame,
  };
};

