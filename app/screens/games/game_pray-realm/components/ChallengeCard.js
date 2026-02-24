import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
} from "react-native";
import { challengeCardStyles as styles } from "../screens/styles/challengesStyles";
import { GameImages } from "../assets";
import { getChallengeById, CHALLENGE_STATUS } from "../data/challenges";

// Card pentru provocari cu bg papyrus si stilizare noua
const ChallengeCard = ({ challenge, onClaim, isExpanded, onToggleExpand }) => {
  const challengeData = getChallengeById(challenge.challengeId);
  if (!challengeData) return null;

  const { status, progress, expiresAt, reward } = challenge;
  const isCompleted = status === CHALLENGE_STATUS.COMPLETED;
  const isClaimed = status === CHALLENGE_STATUS.CLAIMED;
  const isExpired = status === CHALLENGE_STATUS.EXPIRED;
  const isActive = status === CHALLENGE_STATUS.ACTIVE;

  const progressPercent = Math.min(
    (progress.current / progress.required) * 100,
    100
  );

  const getDaysRemaining = () => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getButtonLabel = () => {
    if (isClaimed) return "COMPLET";
    if (isCompleted) return "COMPLET";
    if (isExpired) return "EXPIRAT";
    return "INCOMPLET";
  };

  return (
    <ImageBackground
      source={GameImages.bgCard}
      style={[styles.card, isCompleted && styles.cardCompleted]}
      imageStyle={styles.cardImage}
      resizeMode="cover"
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{challengeData.title}</Text>

        <View style={styles.headerActions}>
          <View style={styles.stageTag}>
            <Text style={styles.stageTagText}>STAGE {challenge.stage}</Text>
          </View>

          <TouchableOpacity
            onPress={onToggleExpand}
            accessibilityLabel="Mai multe informații"
            accessibilityRole="button"
            style={styles.infoButton}
          >
            <Image
              source={GameImages.moreInfo}
              style={styles.infoIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.cardDescription}>
            {challengeData.description}
          </Text>
          <Text style={styles.cardAction}>{challengeData.action}</Text>
        </View>
      )}

      {isActive && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress.current} / {progress.required}
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.expiryContainer}>
          {!isClaimed && !isExpired && (
            <Text style={styles.expiryText}>
              Expiră în {getDaysRemaining()} zile
            </Text>
          )}
          {isExpired && <Text style={styles.expiryText}>Expirat</Text>}
        </View>

        <TouchableOpacity
          style={[
            styles.claimButton,
            isClaimed && styles.claimButtonClaimed,
            isCompleted && !isClaimed && styles.claimButtonReady,
          ]}
          onPress={() => isCompleted && !isClaimed && onClaim?.(challenge)}
          disabled={!isCompleted || isClaimed}
          activeOpacity={0.7}
          accessibilityLabel={getButtonLabel()}
          accessibilityRole="button"
        >
          {!isClaimed && !isCompleted && (
            <>
              <Image
                source={GameImages.alabastru}
                style={styles.rewardIcon}
                resizeMode="contain"
              />
              <Text style={styles.rewardAmount}>+{reward}</Text>
            </>
          )}
          <Text
            style={[
              styles.claimButtonText,
              (isCompleted || isClaimed) && styles.claimButtonTextComplete,
            ]}
          >
            {getButtonLabel()}
          </Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

export default React.memo(ChallengeCard);
