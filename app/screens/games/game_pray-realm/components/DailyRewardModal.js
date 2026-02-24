import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
} from "react-native";
import { GameImages } from "../assets";
import { PlayerApi } from "../api/playerApi";

const { width, height } = Dimensions.get("window");

// Dimensiuni pentru modal - papyrus vertical
const MODAL_WIDTH = Math.min(300, width * 0.82) * 1.7;
const MODAL_HEIGHT = MODAL_WIDTH * 1.5 * 1.3;
const GRID_WIDTH = MODAL_WIDTH * 0.78 * 0.7;
const CELL_SIZE = (GRID_WIDTH - 18) / 4;

// Configuratie rewards pentru 28 zile
const DAILY_REWARDS = [
  { day: 1, type: "alabastru", amount: 15 },
  { day: 2, type: "alabastru", amount: 15 },
  { day: 3, type: "alabastru", amount: 25 },
  { day: 4, type: "alabastru", amount: 30 },
  { day: 5, type: "hammer", amount: 1 },
  { day: 6, type: "alabastru", amount: 30 },
  { day: 7, type: "alabastru", amount: 40 },
  { day: 8, type: "alabastru", amount: 40 },
  { day: 9, type: "alabastru", amount: 40 },
  { day: 10, type: "alabastru", amount: 40 },
  { day: 11, type: "shield", amount: 1 },
  { day: 12, type: "alabastru", amount: 50 },
  { day: 13, type: "alabastru", amount: 50 },
  { day: 14, type: "alabastru", amount: 50 },
  { day: 15, type: "alabastru", amount: 50 },
  { day: 16, type: "hammer", amount: 1 },
  { day: 17, type: "shield", amount: 1 },
  { day: 18, type: "alabastru", amount: 50 },
  { day: 19, type: "alabastru", amount: 50 },
  { day: 20, type: "alabastru", amount: 50 },
  { day: 21, type: "alabastru", amount: 50 },
  { day: 22, type: "alabastru", amount: 50 },
  { day: 23, type: "alabastru", amount: 50 },
  { day: 24, type: "alabastru", amount: 50 },
  { day: 25, type: "alabastru", amount: 50 },
  { day: 26, type: "hammer", amount: 1 },
  { day: 27, type: "shield", amount: 1 },
  { day: 28, type: "alabastru", amount: 100 },
];

const getRewardIcon = (type) => {
  switch (type) {
    case "alabastru":
      return GameImages.alabastru;
    case "hammer":
      return GameImages.hammer;
    case "shield":
      return GameImages.shield;
    default:
      return GameImages.alabastru;
  }
};

export const isNewDay = (lastClaimDate) => {
  if (!lastClaimDate) return true;
  const last = new Date(lastClaimDate);
  const now = new Date();
  return (
    last.getDate() !== now.getDate() ||
    last.getMonth() !== now.getMonth() ||
    last.getFullYear() !== now.getFullYear()
  );
};

// Calculeaza cate zile calendaristice au trecut de la o data
const getDaysPassed = (fromDate) => {
  if (!fromDate) return 0;

  const from = new Date(fromDate);
  const now = new Date();

  // Resetam la inceputul zilei pentru calcul corect
  from.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - from.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

// Verifica daca userul a dat claim AZI
const hasClaimedToday = (lastClaimDate) => {
  if (!lastClaimDate) return false;
  return getDaysPassed(lastClaimDate) === 0;
};

export const hasDailyUnclaimed = async (userId) => {
  try {
    const player = await PlayerApi.getPlayer(userId);

    // Daca nu exista dailyReward, inseamna ca nu a dat claim niciodata
    if (!player.dailyReward) return true;

    const { lastClaimDate } = player.dailyReward;

    // Daca nu exista lastClaimDate, nu a dat claim niciodata
    if (!lastClaimDate) return true;

    // Daca a dat claim azi, nu mai are nimic de facut
    // Daca e o zi noua (lastClaimDate nu e azi), poate da claim
    return !hasClaimedToday(lastClaimDate);
  } catch {
    return false;
  }
};

const DailyRewardModal = ({
  visible,
  onClose,
  userId,
  onRewardClaimed,
  onShowToast,
}) => {
  const [claimedDays, setClaimedDays] = useState([]);
  const [lostDays, setLostDays] = useState([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [isClaiming, setIsClaiming] = useState(false);

  const slideAnim = useRef(new Animated.Value(-height)).current;

  useEffect(() => {
    if (visible) {
      setIsClaiming(false);
      loadDailyRewardData();
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadDailyRewardData = async () => {
    try {
      const player = await PlayerApi.getPlayer(userId);

      if (!player.dailyReward) {
        // Prima oara - incepe de la ziua 1
        setClaimedDays([]);
        setLostDays([]);
        setCurrentDay(1);
        return;
      }

      let {
        claimedDays: claimed,
        lostDays: lost,
        lastClaimedDay,
        lastClaimDate,
      } = player.dailyReward;

      claimed = claimed || [];
      lost = lost || [];
      lastClaimedDay = lastClaimedDay || 0;

      // Daca a dat claim azi, arata starea curenta fara modificari
      if (hasClaimedToday(lastClaimDate)) {
        setClaimedDays(claimed);
        setLostDays(lost);
        setCurrentDay(lastClaimedDay + 1 > 28 ? 1 : lastClaimedDay + 1);
        return;
      }

      // Calculeaza cate zile au trecut de la ultimul claim
      const daysPassed = getDaysPassed(lastClaimDate);

      if (daysPassed > 0 && lastClaimDate) {
        // Ziua pe care ar trebui sa fie userul AZI
        // Daca a dat claim ieri pe ziua X, azi e ziua X+1
        // Daca au trecut 2 zile de la claim pe ziua X, azi e ziua X+2 (si X+1 e pierduta)
        const todayDay = lastClaimedDay + daysPassed;

        // Marcheaza zilele ratate ca pierdute (toate intre lastClaimedDay+1 si todayDay-1)
        for (
          let missedDay = lastClaimedDay + 1;
          missedDay < todayDay;
          missedDay++
        ) {
          if (
            missedDay <= 28 &&
            !claimed.includes(missedDay) &&
            !lost.includes(missedDay)
          ) {
            lost.push(missedDay);
          }
        }

        // Ziua curenta pentru claim
        let currentDayToSet = todayDay;

        // Daca am trecut de 28, resetam ciclul
        if (currentDayToSet > 28) {
          currentDayToSet = 1;
          claimed = [];
          lost = [];
        }

        // Salveaza starea actualizata (doar lost days, nu currentDay - ala e calculat)
        await PlayerApi.updateDailyReward(userId, {
          claimedDays: claimed,
          lostDays: lost,
          lastClaimedDay: lastClaimedDay,
          lastClaimDate: lastClaimDate,
        });

        setClaimedDays(claimed);
        setLostDays(lost);
        setCurrentDay(currentDayToSet);
      } else {
        // Nicio zi trecuta sau fara lastClaimDate - prima zi
        setClaimedDays(claimed);
        setLostDays(lost);
        setCurrentDay(lastClaimedDay + 1 > 28 ? 1 : lastClaimedDay + 1);
      }
    } catch (error) {
      console.error("Error loading daily reward:", error);
    }
  };

  // Animatie inchidere modal
  const closeWithAnimation = (reward) => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      slideAnim.setValue(-height);
      setIsClaiming(false);

      // Toast apare DUPA ce modalul s-a inchis - foloseste toast-ul global
      if (reward) {
        const icon = getRewardIcon(reward.type);
        onShowToast?.(`+${reward.amount}`, icon);
      }
    });
  };

  const handleClaimReward = async (day) => {
    if (
      isClaiming ||
      claimedDays.includes(day) ||
      lostDays.includes(day) ||
      day !== currentDay
    )
      return;

    setIsClaiming(true);

    const reward = DAILY_REWARDS.find((r) => r.day === day);
    if (!reward) {
      setIsClaiming(false);
      return;
    }

    try {
      const newClaimedDays = [...claimedDays, day];
      const shouldReset = day === 28;

      await PlayerApi.updateDailyReward(userId, {
        claimedDays: shouldReset ? [] : newClaimedDays,
        lostDays: shouldReset ? [] : lostDays,
        lastClaimedDay: shouldReset ? 0 : day,
        lastClaimDate: new Date().toISOString(),
      });

      // Adauga reward-ul in inventar/alabastru
      if (reward.type === "alabastru") {
        await PlayerApi.updateAlabastru(
          userId,
          reward.amount,
          "daily_reward",
          day
        );
      } else if (reward.type === "hammer" || reward.type === "shield") {
        await PlayerApi.addToInventory(
          userId,
          "tools",
          reward.type,
          reward.amount
        );
      }

      setClaimedDays(shouldReset ? [] : newClaimedDays);
      setLostDays(shouldReset ? [] : lostDays);
      // Urmatoarea zi va fi calculata la urmatoarea deschidere
      // Dar pentru UI aratam ca deja a dat claim azi
      setCurrentDay(shouldReset ? 1 : day + 1);
      onRewardClaimed?.(reward);

      closeWithAnimation(reward);
    } catch (error) {
      console.error("Error claiming daily reward:", error);
      setIsClaiming(false);
    }
  };

  const renderDayCell = (reward) => {
    const isClaimed = claimedDays.includes(reward.day);
    const isLost = lostDays.includes(reward.day);
    const isClaimable =
      reward.day === currentDay && !isClaimed && !isLost && !isClaiming;
    const isDisabled = isClaimed || isLost || !isClaimable || isClaiming;

    return (
      <TouchableOpacity
        key={reward.day}
        style={[
          styles.dayCell,
          isClaimed && styles.dayCellClaimed,
          isLost && styles.dayCellLost,
          isClaimable && styles.dayCellClaimable,
        ]}
        onPress={() => handleClaimReward(reward.day)}
        disabled={isDisabled}
        activeOpacity={0.7}
        accessibilityLabel={`Ziua ${reward.day}: ${reward.amount} ${
          reward.type
        }${isLost ? " - pierdut" : ""}`}
        accessibilityRole="button"
      >
        <Image
          source={getRewardIcon(reward.type)}
          style={[
            styles.rewardIcon,
            (isClaimed || isLost) && styles.rewardIconDisabled,
          ]}
          resizeMode="contain"
        />
        <Text
          style={[
            styles.rewardAmount,
            isClaimed && styles.rewardAmountClaimed,
            isLost && styles.rewardAmountLost,
          ]}
        >
          {reward.amount}
        </Text>
        <View
          style={[
            styles.dayBadge,
            isClaimed && styles.dayBadgeClaimed,
            isLost && styles.dayBadgeLost,
          ]}
        >
          <Text style={styles.dayNumber}>{reward.day}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGrid = () => {
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const rowItems = DAILY_REWARDS.slice(i * 4, (i + 1) * 4);
      rows.push(
        <View key={`row-${i}`} style={styles.gridRow}>
          {rowItems.map(renderDayCell)}
        </View>
      );
    }
    return rows;
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Image
            source={GameImages.bgDaily}
            style={styles.backgroundImage}
            resizeMode="contain"
          />

          <View style={styles.contentOverlay}>
            <View style={styles.gridContainer}>{renderGrid()}</View>

            <TouchableOpacity
              style={[
                styles.closeButton,
                isClaiming && styles.closeButtonDisabled,
              ]}
              onPress={() => closeWithAnimation(null)}
              disabled={isClaiming}
              accessibilityLabel="Închide"
              accessibilityRole="button"
            >
              <Image
                source={GameImages.xButton}
                style={styles.closeIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: MODAL_WIDTH,
    height: MODAL_HEIGHT,
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  contentOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: MODAL_HEIGHT * 0.06,
    paddingBottom: MODAL_HEIGHT * 0.1,
    paddingHorizontal: MODAL_WIDTH * 0.11,
  },
  closeButton: {
    marginTop: 10,
    zIndex: 10,
    padding: 5,
  },
  closeButtonDisabled: {
    opacity: 0.4,
  },
  closeIcon: {
    width: 50,
    height: 50,
  },
  gridContainer: {
    width: GRID_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  gridRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: "#face89",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#82502f",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  dayCellClaimed: {
    backgroundColor: "rgba(200, 180, 140, 0.5)",
    borderColor: "rgba(100, 80, 60, 0.4)",
    opacity: 0.6,
  },
  dayCellLost: {
    backgroundColor: "rgba(120, 80, 80, 0.4)",
    borderColor: "rgba(100, 50, 50, 0.5)",
    opacity: 0.5,
  },
  dayCellClaimable: {
    backgroundColor: "#fec72d",
    borderColor: "#b66b15",
    borderWidth: 3,
    shadowColor: "#b66b15",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  rewardIcon: {
    width: CELL_SIZE * 0.4,
    height: CELL_SIZE * 0.4,
  },
  rewardAmount: {
    color: "#302c26",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 1,
  },
  rewardAmountClaimed: {
    color: "rgba(48, 44, 38, 0.5)",
  },
  rewardAmountLost: {
    color: "rgba(100, 50, 50, 0.6)",
  },
  rewardIconDisabled: {
    opacity: 0.4,
  },
  dayBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#451207",
    borderRadius: 8,
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  dayBadgeClaimed: {
    backgroundColor: "rgba(69, 18, 7, 0.5)",
  },
  dayBadgeLost: {
    backgroundColor: "rgba(80, 40, 40, 0.6)",
  },
  dayNumber: {
    color: "#fff",
    fontSize: 7,
    fontWeight: "700",
  },
});

export default DailyRewardModal;
