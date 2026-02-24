import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
  RefreshControl,
  Animated,
} from "react-native";
import { challengesStyles as styles } from "./styles/challengesStyles";
import ChallengeCard from "../components/ChallengeCard";
import { GameImages } from "../assets";
import { ChallengesApi } from "../api/challengesApi";
import { PlayerApi } from "../api/playerApi";
import { CHALLENGE_STATUS } from "../data/challenges";

const FILTER_TABS = {
  ACTIVE: "ACTIVE",
  COMPLETATE: "COMPLETATE",
};

const ChallengesScreen = ({ userId, onBack, onAlabastUpdate }) => {
  const [challenges, setChallenges] = useState([]);
  const [alabastruCount, setAlabastruCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(FILTER_TABS.ACTIVE);
  const [expandedCards, setExpandedCards] = useState({});
  const [claimingCard, setClaimingCard] = useState(null);

  const shatterAnims = useRef({}).current;

  const loadData = useCallback(async () => {
    try {
      const [playerChallenges, player] = await Promise.all([
        ChallengesApi.getPlayerChallenges(userId),
        PlayerApi.getPlayer(userId),
      ]);

      if (playerChallenges.length === 0) {
        const initialized = await ChallengesApi.initializeChallenges(userId, 1);
        setChallenges(initialized);
      } else {
        setChallenges(playerChallenges);
      }

      setAlabastruCount(player.alabastru.current);
    } catch (error) {
      console.error("Error loading challenges:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Animatie shatter la claim
  const handleClaim = async (challenge) => {
    setClaimingCard(challenge.challengeId);

    if (!shatterAnims[challenge.challengeId]) {
      shatterAnims[challenge.challengeId] = {
        scale: new Animated.Value(1),
        opacity: new Animated.Value(1),
      };
    }

    const anim = shatterAnims[challenge.challengeId];

    Animated.parallel([
      Animated.timing(anim.scale, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(150),
        Animated.parallel([
          Animated.timing(anim.scale, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(async () => {
      try {
        const result = await ChallengesApi.claimChallenge(
          userId,
          challenge.challengeId
        );

        await PlayerApi.updateAlabastru(
          userId,
          result.reward,
          "challenge",
          challenge.challengeId
        );

        const player = await PlayerApi.getPlayer(userId);
        setAlabastruCount(player.alabastru.current);
        onAlabastUpdate?.(player.alabastru.current);

        await loadData();
      } catch (error) {
        console.error("Error claiming challenge:", error);
      } finally {
        setClaimingCard(null);
        anim.scale.setValue(1);
        anim.opacity.setValue(1);
      }
    });
  };

  const toggleCardExpand = (challengeId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [challengeId]: !prev[challengeId],
    }));
  };

  // Filtrare si sortare - completed cards primele
  const getSortedChallenges = () => {
    let filtered;
    if (activeFilter === FILTER_TABS.ACTIVE) {
      filtered = challenges.filter(
        (c) =>
          c.status === CHALLENGE_STATUS.ACTIVE ||
          c.status === CHALLENGE_STATUS.COMPLETED
      );
      filtered.sort((a, b) => {
        if (
          a.status === CHALLENGE_STATUS.COMPLETED &&
          b.status !== CHALLENGE_STATUS.COMPLETED
        )
          return -1;
        if (
          b.status === CHALLENGE_STATUS.COMPLETED &&
          a.status !== CHALLENGE_STATUS.COMPLETED
        )
          return 1;
        return 0;
      });
    } else {
      filtered = challenges.filter(
        (c) => c.status === CHALLENGE_STATUS.CLAIMED
      );
    }
    return filtered;
  };

  const filteredChallenges = getSortedChallenges();

  const getShatterAnim = (challengeId) => {
    if (!shatterAnims[challengeId]) {
      shatterAnims[challengeId] = {
        scale: new Animated.Value(1),
        opacity: new Animated.Value(1),
      };
    }
    return shatterAnims[challengeId];
  };

  return (
    <ImageBackground
      source={GameImages.bgProvocari}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.header}>
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={styles.filterTabBtn}
            onPress={() => setActiveFilter(FILTER_TABS.ACTIVE)}
            accessibilityLabel="Provocări active"
            accessibilityRole="button"
          >
            <Image
              source={GameImages.btnActive}
              style={[
                styles.filterTabActiveImage,
                activeFilter !== FILTER_TABS.ACTIVE && styles.filterTabInactive,
              ]}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterTabBtn}
            onPress={() => setActiveFilter(FILTER_TABS.COMPLETATE)}
            accessibilityLabel="Provocări completate"
            accessibilityRole="button"
          >
            <Image
              source={GameImages.btnCompletate}
              style={[
                styles.filterTabCompletateImage,
                activeFilter !== FILTER_TABS.COMPLETATE &&
                  styles.filterTabInactive,
              ]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onBack}
          accessibilityLabel="Închide provocări"
          accessibilityRole="button"
        >
          <Image
            source={GameImages.xButton}
            style={styles.closeIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#82502f"
          />
        }
      >
        {filteredChallenges.map((challenge) => {
          const anim = getShatterAnim(challenge.challengeId);
          return (
            <Animated.View
              key={challenge.challengeId}
              style={{
                transform: [{ scale: anim.scale }],
                opacity: anim.opacity,
              }}
            >
              <ChallengeCard
                challenge={challenge}
                onClaim={handleClaim}
                isExpanded={expandedCards[challenge.challengeId]}
                onToggleExpand={() => toggleCardExpand(challenge.challengeId)}
              />
            </Animated.View>
          );
        })}

        {filteredChallenges.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {activeFilter === FILTER_TABS.ACTIVE
                ? "Nu există provocări active momentan."
                : "Nu ai completat nicio provocare încă."}
            </Text>
          </View>
        )}
      </ScrollView>
    </ImageBackground>
  );
};

export default ChallengesScreen;
