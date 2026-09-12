import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Animated,
  Alert,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { gameStyles } from "../styles/gameStyles";
import {
  GameWorld,
  WinOverlay,
  GameToast,
  Toolbar,
  BelzyDeadIndicator,
} from "../components";
import {
  useGameState,
  useCamera,
  useReveal,
  useInventory,
  useActiveBuffs,
} from "../hooks";
import { calculateAvatarStandY } from "../utils/positionUtils";
import { MAX_LEVEL } from "../constants/gameConfig";
import { getLevelCost, getUnlockFee } from "../data/levelCosts";
import { TOOL_TYPES } from "../data/shopItems";
import { PlayerApi } from "../api/playerApi";
import { GameImages, getToolImage } from "../assets";
import { SCREEN_WIDTH, SCREEN_HEIGHT, rem } from "../constants/dimensions";
import {
  BelzyOverlay,
  useBelzy,
  isBelzyDead,
  BelzyShieldBlock,
  BelzySwordScene,
  BelzyPunishmentOverlay,
  WHEEL_PUNISHMENT_TYPES,
} from "../belzy";
import { isBreakLevel } from "../utils/levelUtils";
import InventoryScreen from "./InventoryScreen";
import { DragProvider } from "../../../../global/components/DragAndDrop";
import { useTesting } from "../../../../global/testing";
import DailyRewardModal, {
  hasDailyUnclaimed,
  isNewDay,
} from "../components/DailyRewardModal";

const GamePlayScreen = ({
  userId,
  avatarImage,
  initialLevel = 1,
  alabastruCount = 0,
  unlockedLevels = [1],
  onBack,
  onLevelUnlocked,
  onStageComplete,
  onAlabastUpdate,
}) => {
  const playerAvatar = avatarImage || GameImages.defaultAvatar;
  const gameState = useGameState();
  const { isFinished } = gameState;
  const { setLayer, clearLayer } = useTesting();

  // Layer intern pentru modul de testare (jocul Pray Realm)
  useEffect(() => {
    setLayer({
      screen: "Joc: Pray Realm",
      folder: "screens/games/game_pray-realm",
      file: "screens/games/game_pray-realm/screens/GamePlayScreen.js",
    });
    return () => clearLayer();
  }, [setLayer, clearLayer]);

  const bgVideoPlayer = useVideoPlayer(GameImages.bgDarkVideo, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const [playerAlabastru, setPlayerAlabastru] = useState(alabastruCount);
  const [playerUnlockedLevels, setPlayerUnlockedLevels] =
    useState(unlockedLevels);
  const [paidFees, setPaidFees] = useState([]); // Track which levels have had fees paid
  const [pendingLevel, setPendingLevel] = useState(null); // Level waiting for Belzy result

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTitle, setToastTitle] = useState("");
  const [toastIcon, setToastIcon] = useState(null);
  const [toastSubtitle, setToastSubtitle] = useState("");

  // Inventory state
  const [showInventory, setShowInventory] = useState(false);

  // Belzy dead state
  const [belzyIsDead, setBelzyIsDead] = useState(false);

  // Shield/Sword encounter states
  const [showShieldBlock, setShowShieldBlock] = useState(false);
  const [showSwordScene, setShowSwordScene] = useState(false);
  const [shieldBlockLevel, setShieldBlockLevel] = useState(null);
  const [swordSceneLevel, setSwordSceneLevel] = useState(null);

  // Punishment wheel state
  const [showPunishmentWheel, setShowPunishmentWheel] = useState(false);
  const [punishmentLevel, setPunishmentLevel] = useState(null);

  // Daily reward state
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [hasDailyPending, setHasDailyPending] = useState(false);
  const dailyPulseAnim = useRef(new Animated.Value(1)).current;

  const { cameraY, updateCamera } = useCamera();

  // Inventory hook
  const { inventory, hasHammer, hammerCount, useTool, loadInventory } =
    useInventory(userId);

  // Belzy hook
  const {
    showBelzy,
    belzyLevel,
    checkBelzyTrigger,
    triggerBelzy,
    handleBelzyResult,
    loadDefeatedLevels,
    pendingFeeMultiplier,
    setPendingFeeMultiplier,
    killBelzy,
    closeBelzy,
  } = useBelzy(userId);

  // Active Buffs hook (Shield, Sword pe avatar)
  const {
    activeBuffs,
    hasShield,
    hasSword,
    handleAvatarDrop,
    deactivateShield,
    deactivateSword,
    loadActiveBuffs,
  } = useActiveBuffs(userId);

  // Ref pentru avatar (pentru a triggera aura explosion)
  const avatarRef = useRef(null);

  const maxUnlockedLevel = Math.max(...playerUnlockedLevels, 1);
  const { revealProgress, isFullyRevealed, forceFullReveal, resetReveal } =
    useReveal(maxUnlockedLevel);

  const avatarY = useRef(
    new Animated.Value(calculateAvatarStandY(initialLevel))
  ).current;
  const animationRef = useRef(null);

  // Background transition: dark -> light când ajunge la level 25
  const bgLightOpacity = useRef(new Animated.Value(0)).current;
  const isLightBackground = maxUnlockedLevel >= 25;

  useEffect(() => {
    Animated.timing(bgLightOpacity, {
      toValue: isLightBackground ? 1 : 0,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, [isLightBackground]);

  // Animatie pulsing pentru daily icon
  useEffect(() => {
    if (hasDailyPending) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(dailyPulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(dailyPulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [hasDailyPending]);

  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        const player = await PlayerApi.getPlayer(userId);
        console.log("Loaded player:", player);
        setPlayerAlabastru(player.alabastru.current);
        setPlayerUnlockedLevels(player.progress.unlockedLevels);
        setPaidFees(player.progress.paidFees || []);

        // Load Belzy defeated levels
        loadDefeatedLevels();

        // Load inventory
        loadInventory();

        // Load active buffs
        loadActiveBuffs();

        // Check if Belzy is dead
        const belzyDead = await isBelzyDead(userId);
        setBelzyIsDead(belzyDead);

        // Check pentru daily reward
        const dailyPending = await hasDailyUnclaimed(userId);
        setHasDailyPending(dailyPending);

        // Afiseaza daily modal o singura data pe zi la intrare
        if (dailyPending && player.dailyReward?.lastClaimDate) {
          const showedToday = !isNewDay(player.dailyReward.lastShownDate);
          if (!showedToday) {
            setTimeout(() => setShowDailyReward(true), 800);
            await PlayerApi.updateDailyReward(userId, {
              ...player.dailyReward,
              lastShownDate: new Date().toISOString(),
            });
          }
        } else if (dailyPending && !player.dailyReward?.lastClaimDate) {
          setTimeout(() => setShowDailyReward(true), 800);
        }

        const playerLevel = Math.max(...player.progress.unlockedLevels);
        const levelY = calculateAvatarStandY(playerLevel);
        avatarY.setValue(levelY);
        updateCamera(levelY);

        // Check pentru stări pending Belzy (pentru refresh/exit)
        const pendingPunishment = await PlayerApi.getPendingPunishment(userId);
        if (pendingPunishment?.punishment) {
          // Utilizatorul a ieșit după ce roata s-a oprit - aplică pedeapsa direct
          console.log(
            "Applying pending punishment:",
            pendingPunishment.punishment
          );
          setTimeout(() => {
            applyPendingPunishment(
              pendingPunishment.punishment,
              pendingPunishment.level
            );
          }, 500);
        } else if (player.belzy?.pendingBelzyLevel) {
          // Utilizatorul a ieșit în timpul quiz-ului - arată roata direct
          console.log(
            "Showing wheel for pending Belzy level:",
            player.belzy.pendingBelzyLevel
          );
          setTimeout(() => {
            setPunishmentLevel(player.belzy.pendingBelzyLevel);
            setShowPunishmentWheel(true);
          }, 500);
        }
      } catch (error) {
        console.error("Error loading player data:", error);
      }
    };
    loadPlayerData();
  }, [userId, loadDefeatedLevels]);

  const handleStageComplete = useCallback(() => {
    gameState.setFinished();
    forceFullReveal();
    onStageComplete?.();
  }, [gameState, forceFullReveal, onStageComplete]);

  const moveToLevel = useCallback(
    (level) => {
      const targetY = calculateAvatarStandY(level);
      const currentY = avatarY._value || 0;
      const distance = Math.abs(currentY - targetY);
      const baseDuration = level === MAX_LEVEL ? 2000 : 1200;
      const duration = Math.max(baseDuration, distance * 2);

      if (animationRef.current) {
        animationRef.current.stop();
      }

      animationRef.current = Animated.timing(avatarY, {
        toValue: targetY,
        duration: duration,
        useNativeDriver: false,
      });

      animationRef.current.start(({ finished }) => {
        if (finished && level === MAX_LEVEL) {
          setTimeout(() => handleStageComplete(), 600);
        }
      });
    },
    [avatarY, handleStageComplete]
  );

  // Handle paying the unlock fee (persisted to storage)
  const handlePayFee = useCallback(
    async (level, fee) => {
      console.log("handlePayFee called:", {
        level,
        fee,
        playerAlabastru,
        pendingFeeMultiplier,
      });

      // Apply Belzy multiplier if player lost previously
      const actualMultiplier =
        pendingFeeMultiplier > 1 ? pendingFeeMultiplier : 1;
      const baseFee = fee === "free" ? 0 : fee;
      const finalFee = baseFee * actualMultiplier;

      if (finalFee > 0 && playerAlabastru < finalFee) {
        Alert.alert(
          "Alabastru Insuficient",
          actualMultiplier > 1
            ? `Belzy te-a pedepsit! Ai nevoie de ${finalFee} Alabastru (x${actualMultiplier}) pentru nivelul ${level}.`
            : `Ai nevoie de ${finalFee} Alabastru pentru a debloca nivelul ${level}.`
        );
        return;
      }

      try {
        // Use PlayerApi to persist the paid fee
        await PlayerApi.payUnlockFee(userId, level, finalFee);
        if (finalFee > 0) {
          setPlayerAlabastru((prev) => prev - finalFee);
        }
        setPaidFees((prev) => [...prev, level]);
        setPendingFeeMultiplier(1); // Reset multiplier after successful payment
        console.log("Fee paid and persisted for level:", level);

        // Check if Belzy should appear at this level (AFTER paying fee)
        if (checkBelzyTrigger(level)) {
          console.log("Belzy will appear at level:", level);
          setPendingLevel(level);

          // Verifică buff-urile active
          if (hasShield) {
            // Shield blochează Belzy complet
            console.log("Shield active - blocking Belzy!");
            setShieldBlockLevel(level);
            setShowShieldBlock(true);
          } else if (hasSword) {
            // Sword oferă opțiunea de a ucide Belzy
            console.log("Sword active - sword scene!");
            setSwordSceneLevel(level);
            setShowSwordScene(true);
          } else {
            // Fără buff-uri - quiz normal
            triggerBelzy(level);
          }
        }
      } catch (error) {
        console.error("Error paying fee:", error);
        Alert.alert("Eroare", "Nu am putut plăti taxa de unlock.");
      }
    },
    [
      userId,
      playerAlabastru,
      pendingFeeMultiplier,
      checkBelzyTrigger,
      triggerBelzy,
      setPendingFeeMultiplier,
    ]
  );

  // Handle climbing to the next level (after fee is paid)
  const handleUnlockLevel = useCallback(
    async (level) => {
      console.log("handleUnlockLevel called:", {
        level,
        playerAlabastru,
        hasHammer,
      });
      const cost = getLevelCost(level);

      // Verifică dacă e break level și dacă are ciocanul
      if (isBreakLevel(level) && !hasHammer) {
        handleShowToolToast(TOOL_TYPES.HAMMER);
        return;
      }

      if (playerAlabastru < cost) {
        Alert.alert(
          "Alabastru Insuficient",
          `Ai nevoie de ${cost} Alabastru pentru a urca la nivelul ${level}.`
        );
        return;
      }

      try {
        console.log("Unlocking level:", level, "cost:", cost);

        // Consumă ciocanul dacă e break level
        if (isBreakLevel(level)) {
          const toolUsed = await useTool(TOOL_TYPES.HAMMER, 1);
          if (!toolUsed) {
            handleShowToolToast(TOOL_TYPES.HAMMER);
            return;
          }
          console.log("Hammer used for break level:", level);
        }

        await PlayerApi.unlockLevel(userId, level, cost);
        setPlayerAlabastru((prev) => prev - cost);
        setPlayerUnlockedLevels((prev) => [...prev, level]);
        setPaidFees((prev) => prev.filter((l) => l !== level)); // Remove paid fee
        onLevelUnlocked?.(level);
        onAlabastUpdate?.(playerAlabastru - cost);

        if (level === 25) {
          moveToLevel(level);
          setTimeout(() => {
            console.log("Auto-advancing to level 26 (trophy)!");
            setPlayerUnlockedLevels((prev) => [...prev, 26]);
            moveToLevel(26);
          }, 1500);
        } else {
          moveToLevel(level);
        }
      } catch (error) {
        console.error("Error unlocking level:", error);
        Alert.alert("Eroare", error.message || "Nu am putut debloca nivelul");
      }
    },
    [
      userId,
      playerAlabastru,
      hasHammer,
      onLevelUnlocked,
      onAlabastUpdate,
      moveToLevel,
      useTool,
    ]
  );

  useEffect(() => {
    const initialY = calculateAvatarStandY(initialLevel);
    avatarY.setValue(initialY);
    updateCamera(initialY);
  }, []);

  useEffect(() => {
    const listenerId = avatarY.addListener(({ value }) => {
      updateCamera(value);
    });
    return () => avatarY.removeListener(listenerId);
  }, [avatarY, updateCamera]);

  useEffect(() => {
    return () => {
      if (animationRef.current) animationRef.current.stop();
    };
  }, []);

  const handleOverlayClose = useCallback(() => {
    onBack?.();
  }, [onBack]);

  // Handle Belzy encounter result
  const handleBelzyComplete = useCallback(
    async (playerWon, level) => {
      console.log("Belzy encounter complete:", { playerWon, level });

      // Închide BelzyOverlay imediat
      closeBelzy();

      if (!playerWon) {
        // Player lost - arată roata pedepselor
        setPunishmentLevel(level);
        setShowPunishmentWheel(true);
      } else {
        // Player won - marchează encounter-ul
        await handleBelzyResult(true, level);
      }
      setPendingLevel(null);
    },
    [handleBelzyResult, closeBelzy]
  );

  // Salvează pedeapsa IMEDIAT când roata se oprește (pentru persistență)
  const handlePunishmentDetermined = useCallback(
    async (punishment, level) => {
      console.log("Punishment determined, saving:", punishment?.id);
      await PlayerApi.setPendingPunishment(userId, level, punishment);
    },
    [userId]
  );

  // Aplică pedeapsa pending (la revenire în joc după refresh/exit)
  const applyPendingPunishment = useCallback(
    async (punishment, level) => {
      console.log("Applying pending punishment:", punishment?.id);

      // Marchează encounter-ul ca pierdut
      await handleBelzyResult(false, level);

      // Aplică pedeapsa
      await applyPunishmentLogic(punishment, level);

      // Șterge pedeapsa pending
      await PlayerApi.clearPendingPunishment(userId);

      // Arată toast cu pedeapsa
      handleShowToast(punishment.belzyMessage || "Pedeapsa a fost aplicată!");
    },
    [userId, handleBelzyResult]
  );

  // Logica de aplicare a pedepsei (refolosită)
  const applyPunishmentLogic = useCallback(
    async (punishment, level) => {
      switch (punishment.id) {
        case WHEEL_PUNISHMENT_TYPES.TAX_X2:
          const player = await PlayerApi.getPlayer(userId);
          setPaidFees(player.progress.paidFees || []);
          break;

        case WHEEL_PUNISHMENT_TYPES.GO_BACK:
          const currentMax = Math.max(...playerUnlockedLevels);
          const newLevel = Math.max(1, currentMax - 2);
          const newUnlockedLevels = playerUnlockedLevels.filter(
            (l) => l <= newLevel
          );
          setPlayerUnlockedLevels(newUnlockedLevels);
          const newPaidFees = paidFees.filter((l) => l <= newLevel);
          setPaidFees(newPaidFees);
          const targetY = calculateAvatarStandY(newLevel);
          Animated.timing(avatarY, {
            toValue: targetY,
            duration: 2000,
            useNativeDriver: false,
          }).start();
          const currentPlayer = await PlayerApi.getPlayer(userId);
          await PlayerApi.updatePlayer(userId, {
            progress: {
              ...currentPlayer.progress,
              unlockedLevels: newUnlockedLevels,
              currentLevel: newLevel,
              paidFees: newPaidFees,
            },
          });
          break;

        case WHEEL_PUNISHMENT_TYPES.MINUS_100:
          const lost100 = Math.min(playerAlabastru, 100);
          setPlayerAlabastru(Math.max(0, playerAlabastru - 100));
          await PlayerApi.updateAlabastru(userId, -lost100);
          break;

        case WHEEL_PUNISHMENT_TYPES.MINUS_75:
          const lost75 = Math.min(playerAlabastru, 75);
          setPlayerAlabastru(Math.max(0, playerAlabastru - 75));
          await PlayerApi.updateAlabastru(userId, -lost75);
          break;

        case WHEEL_PUNISHMENT_TYPES.NO_PUNISHMENT:
          // Nu face nimic
          break;
      }
    },
    [userId, playerAlabastru, playerUnlockedLevels, paidFees, avatarY]
  );

  // Handle punishment complete (după ce se învârte roata)
  const handlePunishmentComplete = useCallback(
    async (punishment) => {
      console.log("Punishment selected:", punishment);
      setShowPunishmentWheel(false);

      // Șterge pedeapsa pending (a fost aplicată)
      await PlayerApi.clearPendingPunishment(userId);

      // Marchează encounter-ul ca pierdut
      await handleBelzyResult(false, punishmentLevel);

      // Aplică pedeapsa cu feedback vizual
      switch (punishment.id) {
        case WHEEL_PUNISHMENT_TYPES.TAX_X2:
          // Fee-ul se dublează
          const player = await PlayerApi.getPlayer(userId);
          setPaidFees(player.progress.paidFees || []);
          // Toast feedback
          handleShowToast("Taxa de unlock s-a dublat! 💰x2");
          break;

        case WHEEL_PUNISHMENT_TYPES.GO_BACK:
          // Trimite înapoi 2 nivele cu animație
          const currentMax = Math.max(...playerUnlockedLevels);
          const newLevel = Math.max(1, currentMax - 2);

          const newUnlockedLevels = playerUnlockedLevels.filter(
            (l) => l <= newLevel
          );
          setPlayerUnlockedLevels(newUnlockedLevels);

          const newPaidFees = paidFees.filter((l) => l <= newLevel);
          setPaidFees(newPaidFees);

          // Animație de coborâre
          const targetY = calculateAvatarStandY(newLevel);
          Animated.timing(avatarY, {
            toValue: targetY,
            duration: 2000,
            useNativeDriver: false,
          }).start();

          // IMPORTANT: Păstrăm toate câmpurile din progress (inclusiv stageIntrosWatched)
          const currentPlayer = await PlayerApi.getPlayer(userId);
          await PlayerApi.updatePlayer(userId, {
            progress: {
              ...currentPlayer.progress,
              unlockedLevels: newUnlockedLevels,
              currentLevel: newLevel,
              paidFees: newPaidFees,
            },
          });

          handleShowToast(`Te-ai întors la nivelul ${newLevel}! ⬇️`);
          break;

        case WHEEL_PUNISHMENT_TYPES.MINUS_100:
          const lost100 = Math.min(playerAlabastru, 100);
          const newAlabastru100 = Math.max(0, playerAlabastru - 100);
          setPlayerAlabastru(newAlabastru100);
          await PlayerApi.updateAlabastru(userId, -lost100);
          handleShowToast(`-${lost100}`, GameImages.alabastru);
          break;

        case WHEEL_PUNISHMENT_TYPES.MINUS_75:
          const lost75 = Math.min(playerAlabastru, 75);
          const newAlabastru75 = Math.max(0, playerAlabastru - 75);
          setPlayerAlabastru(newAlabastru75);
          await PlayerApi.updateAlabastru(userId, -lost75);
          handleShowToast(`-${lost75}`, GameImages.alabastru);
          break;

        case WHEEL_PUNISHMENT_TYPES.NO_PUNISHMENT:
          handleShowToast("Ai scăpat fără pedeapsă! 🍀");
          break;
      }

      setPunishmentLevel(null);
    },
    [
      userId,
      punishmentLevel,
      playerAlabastru,
      playerUnlockedLevels,
      paidFees,
      handleBelzyResult,
      avatarY,
      updateCamera,
    ]
  );

  const handleRestartGame = useCallback(async () => {
    try {
      await PlayerApi.resetPlayerForTesting(userId);
      const player = await PlayerApi.getPlayer(userId);
      setPlayerAlabastru(player.alabastru.current);
      setPlayerUnlockedLevels(player.progress.unlockedLevels);
      setPaidFees([]);
      setPendingLevel(null);
      setPendingFeeMultiplier(1);
      loadDefeatedLevels(); // Reload Belzy data
      loadInventory(); // Reload inventory

      const levelY = calculateAvatarStandY(1);
      avatarY.setValue(levelY);
      updateCamera(levelY);
      gameState.resetGame();
      resetReveal();
      console.log("Game restarted!");
    } catch (error) {
      console.error("Error restarting game:", error);
    }
  }, [
    userId,
    avatarY,
    updateCamera,
    gameState,
    resetReveal,
    loadDefeatedLevels,
    loadInventory,
    setPendingFeeMultiplier,
  ]);

  const handleExit = useCallback(() => {
    onBack?.();
  }, [onBack]);

  // Toast handler - simplu (doar mesaj)
  const handleShowToast = useCallback((message, icon = null) => {
    setToastTitle("");
    setToastIcon(icon);
    setToastSubtitle("");
    setToastMessage(message);
    setToastVisible(true);
  }, []);

  // Handler pentru next day (dev/testing)
  const handleNextDay = useCallback(async () => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      if (player.dailyReward) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        await PlayerApi.updateDailyReward(userId, {
          ...player.dailyReward,
          lastClaimDate: yesterday.toISOString(),
          lastShownDate: yesterday.toISOString(),
        });
      }
      setHasDailyPending(true);
      handleShowToast("S-a trecut la ziua următoare!");
    } catch (error) {
      console.error("Error advancing day:", error);
    }
  }, [userId, handleShowToast]);

  // Handler pentru daily reward claimed
  const handleDailyRewardClaimed = useCallback(
    (reward) => {
      if (reward.type === "alabastru") {
        setPlayerAlabastru((prev) => prev + reward.amount);
        onAlabastUpdate?.(playerAlabastru + reward.amount);
      }
      setHasDailyPending(false);
      loadInventory();
    },
    [playerAlabastru, onAlabastUpdate, loadInventory]
  );

  // Toast handler - pentru tool necesar (cu titlu, iconă și subtitlu)
  const handleShowToolToast = useCallback((toolId) => {
    const toolImage = getToolImage(toolId);
    setToastTitle("Obiecte necesare");
    setToastIcon(toolImage);
    setToastSubtitle("Se găsește în magazin");
    setToastMessage("");
    setToastVisible(true);
  }, []);

  const handleHideToast = useCallback(() => {
    setToastVisible(false);
    // Reset toast state
    setToastTitle("");
    setToastIcon(null);
    setToastSubtitle("");
    setToastMessage("");
  }, []);

  // Handler pentru când se face drag start din toolbar
  const handleToolbarDragStart = useCallback((item) => {
    console.log("Drag started:", item);
  }, []);

  // Handler pentru când se face drop (din toolbar pe avatar)
  const handleToolbarDragEnd = useCallback(
    async (item, dropResult) => {
      console.log("Drag ended:", item, dropResult);

      if (dropResult && dropResult.zoneId === "avatar-drop-zone") {
        // S-a făcut drop pe avatar
        const result = await handleAvatarDrop(item);

        if (result.success) {
          // Reload inventory pentru a actualiza counter-ele
          loadInventory();
          handleShowToast(result.message);
        } else {
          // Afișează toast cu eroarea
          handleShowToast(result.message);
        }
      }
    },
    [handleAvatarDrop, loadInventory, handleShowToast]
  );

  // Handler pentru când shield blochează Belzy
  const handleShieldBlockComplete = useCallback(
    async (level) => {
      setShowShieldBlock(false);
      setShieldBlockLevel(null);

      // Dezactivează scutul (a fost consumat)
      await deactivateShield();

      // Trigger aura explosion pe avatar
      if (avatarRef.current) {
        avatarRef.current.triggerAuraExplosion();
      }

      // Mark encounter as completed (player "won" without quiz)
      await handleBelzyResult(true, level);
    },
    [deactivateShield, handleBelzyResult]
  );

  // Handler pentru când sword ucide pe Belzy
  const handleSwordSceneComplete = useCallback(
    async (level) => {
      setShowSwordScene(false);
      setSwordSceneLevel(null);

      // Ucide pe Belzy permanent (actualizează și state-ul local)
      await killBelzy();
      setBelzyIsDead(true);

      // Dezactivează sabia (a fost consumată)
      await deactivateSword();

      // Clear pending Belzy
      await handleBelzyResult(true, level);
    },
    [killBelzy, deactivateSword, handleBelzyResult]
  );

  // Handler când jucătorul alege să nu folosească sabia (quiz normal)
  const handleSwordSkip = useCallback(
    (level) => {
      setShowSwordScene(false);
      setSwordSceneLevel(null);

      // Trigger normal Belzy overlay
      triggerBelzy(level);
    },
    [triggerBelzy]
  );

  // Handler când sabia e folosită (începe animația)
  const handleUseSword = useCallback((level) => {
    console.log("Sword used at level:", level);
  }, []);

  // Inventory handlers
  const handleOpenInventory = useCallback(() => {
    setShowInventory(true);
  }, []);

  const handleCloseInventory = useCallback(() => {
    setShowInventory(false);
  }, []);

  const isLevelUnlocked = (level) => playerUnlockedLevels.includes(level);
  const canAffordLevel = (level) => playerAlabastru >= getLevelCost(level);
  const isFeePaid = (level) => {
    return paidFees.includes(level);
  };
  const canAffordFee = (level) => {
    const fee = getUnlockFee(level);
    if (fee === "free" || fee === 0) return true;
    // Apply multiplier if Belzy punished player
    const actualFee =
      fee * (pendingFeeMultiplier > 1 ? pendingFeeMultiplier : 1);
    return playerAlabastru >= actualFee;
  };

  return (
    <DragProvider>
      <View style={gameStyles.container}>
        {/* Background dark video - loops automatically */}
        <VideoView
          player={bgVideoPlayer}
          style={styles.backgroundVideo}
          contentFit="contain"
          nativeControls={false}
        />

        {/* Background light - fade in la level 25 */}
        <Animated.Image
          source={GameImages.bgLight}
          style={[styles.backgroundImage, { opacity: bgLightOpacity }]}
          resizeMode="cover"
        />

        <GameWorld
          avatarY={avatarY}
          cameraY={cameraY}
          currentLevel={maxUnlockedLevel}
          revealProgress={revealProgress}
          isFullyRevealed={isFullyRevealed}
          avatarImage={playerAvatar}
          onLevelPress={handleUnlockLevel}
          onPayFee={handlePayFee}
          isLevelUnlocked={isLevelUnlocked}
          canAffordLevel={canAffordLevel}
          isFeePaid={isFeePaid}
          canAffordFee={canAffordFee}
          onShowToast={handleShowToast}
          onShowToolToast={handleShowToolToast}
          feeMultiplier={pendingFeeMultiplier}
          hasHammer={hasHammer}
          hasShield={hasShield}
          hasSword={hasSword}
          avatarRef={avatarRef}
        />

        {/* Background opac pentru zona de jos - ascunde scările */}
        <View style={styles.bottomOverlay} />

        {/* Toolbar - Bottom Left */}
        <View style={styles.toolbarContainer}>
          <Toolbar
            inventory={inventory}
            onBackpackPress={handleOpenInventory}
            onDragStart={handleToolbarDragStart}
            onDragEnd={handleToolbarDragEnd}
          />
        </View>

        {/* DEV: Restart button */}
        <TouchableOpacity
          style={styles.restartButton}
          onPress={handleRestartGame}
          activeOpacity={0.7}
        >
          <Text style={styles.restartText}>🔄</Text>
        </TouchableOpacity>

        {/* DEV: Next Day button */}
        <TouchableOpacity
          style={styles.nextDayButton}
          onPress={handleNextDay}
          activeOpacity={0.7}
        >
          <Text style={styles.nextDayText}>📅</Text>
        </TouchableOpacity>

        {/* Daily Reward Pulsing Icon - deasupra level */}
        {hasDailyPending && (
          <Animated.View
            style={[
              styles.dailyPulseContainer,
              { transform: [{ scale: dailyPulseAnim }] },
            ]}
          >
            <TouchableOpacity
              style={styles.dailyPulseButton}
              onPress={() => setShowDailyReward(true)}
              activeOpacity={0.8}
              accessibilityLabel="Daily Reward"
              accessibilityRole="button"
            >
              <Image
                source={GameImages.dailyIcon}
                style={styles.dailyPulseIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Belzy Dead Indicator - deasupra level */}
        {belzyIsDead && (
          <View style={styles.belzyDeadContainer}>
            <BelzyDeadIndicator visible={true} />
          </View>
        )}

        {/* Current Level - sub restart button */}
        <View style={styles.levelContainer}>
          <Text style={styles.levelLabel}>LEVEL</Text>
          <Text style={styles.levelNumber}>{maxUnlockedLevel}</Text>
        </View>

        {/* Exit Button - sub level */}
        <TouchableOpacity
          style={styles.exitButton}
          onPress={handleExit}
          activeOpacity={0.7}
        >
          <Image
            source={GameImages.door1}
            style={styles.exitIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <WinOverlay visible={isFinished} onClose={handleOverlayClose} />

        {/* Belzy Encounter Overlay */}
        <BelzyOverlay
          visible={showBelzy}
          level={belzyLevel}
          onComplete={handleBelzyComplete}
          onClose={() => setPendingLevel(null)}
        />

        {/* Belzy Shield Block Overlay */}
        <BelzyShieldBlock
          visible={showShieldBlock}
          level={shieldBlockLevel}
          onComplete={handleShieldBlockComplete}
        />

        {/* Belzy Sword Scene Overlay */}
        <BelzySwordScene
          visible={showSwordScene}
          level={swordSceneLevel}
          onUseSword={handleUseSword}
          onSkipSword={handleSwordSkip}
          onComplete={handleSwordSceneComplete}
        />

        {/* Belzy Punishment Wheel Overlay */}
        <BelzyPunishmentOverlay
          visible={showPunishmentWheel}
          level={punishmentLevel}
          onPunishmentComplete={handlePunishmentComplete}
          onPunishmentDetermined={handlePunishmentDetermined}
        />

        {/* Inventory Screen Overlay */}
        {showInventory && (
          <InventoryScreen
            inventory={inventory}
            alabastru={playerAlabastru}
            onClose={handleCloseInventory}
          />
        )}

        {/* Game Toast - pentru mesaje rapide */}
        <GameToast
          visible={toastVisible}
          message={toastMessage}
          title={toastTitle}
          icon={toastIcon}
          subtitle={toastSubtitle}
          onHide={handleHideToast}
          duration={2500}
          variant={toastIcon ? "warning" : "default"}
        />

        {/* Daily Reward Modal */}
        <DailyRewardModal
          visible={showDailyReward}
          onClose={() => setShowDailyReward(false)}
          userId={userId}
          onRewardClaimed={handleDailyRewardClaimed}
          onShowToast={handleShowToast}
        />

      </View>
    </DragProvider>
  );
};

const styles = StyleSheet.create({
  // ========== BACKGROUND VIDEO - FULL SCREEN, CENTERED ==========
  backgroundVideo: {
    position: "absolute",
    top: -(SCREEN_HEIGHT * 0.075),
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    // NU folosi zIndex negativ: pe Android view-ul dispare in spatele parintelui.
    // Fiind primul copil, ordinea naturala il tine oricum in spatele restului.
    zIndex: 0,
    backgroundColor: "#0a0a15",
  },
  // Style for inner video element (web compatibility)
  videoInner: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  // ========== BACKGROUND IMAGE - FULL SCREEN, RESPONSIVE ==========
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    // idem: fara zIndex negativ (Android). E al doilea copil => sta peste video, sub GameWorld.
    zIndex: 0,
  },

  // ========== BOTTOM OVERLAY - Ascunde scările ==========
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "12%",
    backgroundColor: "#0a0a15",
    zIndex: 999,
  },
  // ========== TOOLBAR CONTAINER ==========
  toolbarContainer: {
    position: "absolute",
    bottom: "-6%",
    left: "-18%",
    zIndex: 1000,
  },
  // Exit button - deasupra toolbar (cel mai jos)
  exitButton: {
    position: "absolute",
    bottom: "20%",
    right: rem(16),
    alignItems: "center",
    justifyContent: "center",
    width: rem(58.5),
    height: rem(58.5),
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: rem(12),
    borderWidth: 2,
    borderColor: "rgba(139, 90, 43, 0.9)",
    zIndex: 100,
  },
  exitIcon: {
    width: rem(58.5),
    height: rem(58.5),
  },
  // Belzy dead indicator - deasupra level
  belzyDeadContainer: {
    position: "absolute",
    bottom: "40%",
    right: rem(16),
    zIndex: 100,
  },
  // Level container - deasupra exit button
  levelContainer: {
    position: "absolute",
    bottom: "30%",
    right: rem(16),
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: rem(14),
    paddingVertical: rem(8),
    borderRadius: rem(12),
    borderWidth: 2,
    borderColor: "rgba(139, 90, 43, 0.9)",
    zIndex: 100,
  },
  levelLabel: {
    color: "#d4a574",
    fontSize: rem(9),
    fontWeight: "700",
    letterSpacing: 1,
  },
  levelNumber: {
    color: "#fff",
    fontSize: rem(22),
    fontWeight: "800",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Restart button - sus de tot în colț
  restartButton: {
    position: "absolute",
    top: rem(20),
    right: rem(16),
    backgroundColor: "rgba(100, 100, 120, 0.8)",
    width: rem(40),
    height: rem(40),
    borderRadius: rem(20),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 100,
  },
  restartText: {
    fontSize: rem(18),
  },
  // Next Day button - lângă restart
  nextDayButton: {
    position: "absolute",
    top: rem(20),
    right: rem(64),
    backgroundColor: "rgba(100, 100, 120, 0.8)",
    width: rem(40),
    height: rem(40),
    borderRadius: rem(20),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 100,
  },
  nextDayText: {
    fontSize: rem(18),
  },
  // Daily Pulsing Icon - deasupra level button
  dailyPulseContainer: {
    position: "absolute",
    bottom: "40%",
    right: rem(16),
    zIndex: 9999,
    elevation: 999,
  },
  dailyPulseButton: {
    backgroundColor: "rgba(251, 191, 36, 0.5)",
    borderRadius: rem(30),
    padding: rem(10),
    borderWidth: 2.5,
    borderColor: "rgba(251, 191, 36, 0.9)",
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  dailyPulseIcon: {
    width: rem(35),
    height: rem(35),
  },
});

export default GamePlayScreen;
