import { INITIAL_LEVEL, INITIAL_TARGET_LEVEL } from '../constants/levels';

export const createInitialGameState = () => ({
  currentLevel: INITIAL_LEVEL,
  targetLevel: INITIAL_TARGET_LEVEL,
  isPaused: false,
  isFinished: false,
  treeFullyRevealed: false,
});

export const GameActions = {
  ADVANCE_LEVEL: 'ADVANCE_LEVEL',
  SET_PAUSED: 'SET_PAUSED',
  SET_FINISHED: 'SET_FINISHED',
  REVEAL_TREE: 'REVEAL_TREE',
  RESET_GAME: 'RESET_GAME',
};

export const gameReducer = (state, action) => {
  switch (action.type) {
    case GameActions.ADVANCE_LEVEL:
      return {
        ...state,
        currentLevel: action.payload.currentLevel,
        targetLevel: action.payload.targetLevel,
      };
    case GameActions.SET_PAUSED:
      return {
        ...state,
        isPaused: action.payload,
      };
    case GameActions.SET_FINISHED:
      return {
        ...state,
        isFinished: true,
        treeFullyRevealed: true,
      };
    case GameActions.REVEAL_TREE:
      return {
        ...state,
        treeFullyRevealed: true,
      };
    case GameActions.RESET_GAME:
      return createInitialGameState();
    default:
      return state;
  }
};

