import React, { createContext, useContext, useReducer, useMemo } from "react";
import {
  createInitialGameState,
  gameReducer,
  GameActions,
} from "../state/gameState";

const GameContext = createContext(null);

export const GameProvider = ({ children, initialLevel = 1 }) => {
  const [state, dispatch] = useReducer(gameReducer, { initialLevel }, () =>
    createInitialGameState()
  );

  const actions = useMemo(
    () => ({
      advanceLevel: (currentLevel, targetLevel) => {
        dispatch({
          type: GameActions.ADVANCE_LEVEL,
          payload: { currentLevel, targetLevel },
        });
      },
      setPaused: (paused) => {
        dispatch({ type: GameActions.SET_PAUSED, payload: paused });
      },
      setFinished: () => {
        dispatch({ type: GameActions.SET_FINISHED });
      },
      revealTree: () => {
        dispatch({ type: GameActions.REVEAL_TREE });
      },
      resetGame: () => {
        dispatch({ type: GameActions.RESET_GAME });
      },
    }),
    []
  );

  const value = useMemo(
    () => ({
      state,
      actions,
    }),
    [state, actions]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within GameProvider");
  }
  return context;
};
