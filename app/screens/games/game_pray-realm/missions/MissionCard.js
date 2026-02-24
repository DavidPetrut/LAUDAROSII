import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
} from "react-native";
import { challengeCardStyles } from "../screens/styles/challengesStyles";
import { GameImages } from "../assets";

/**
 * Card pentru misiuni - identic cu ChallengeCard dar cu modificări:
 * - Header cu avatar admin + "Misiunea lui {admin.name}"
 * - Fără bara de progres
 * - "Ai terminat misiunea? CERE RASPLATA" în loc de progress
 * - Butonul devine "ASTEAPTA APROBARE" când apesi
 */
const MissionCard = ({
  mission,
  onRequestReward,
  onClaimReward,
  isExpanded,
  onToggleExpand,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const {
    id,
    title,
    description,
    reward,
    expiresAt,
    createdBy,
    userStatus = {},
  } = mission;

  const status = userStatus.status || "pending";
  const isPending = status === "pending";
  const isRequested = status === "requested";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isClaimed = status === "claimed";

  const getDaysRemaining = () => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getHoursRemaining = () => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60));
    return Math.max(0, diff);
  };

  const getButtonLabel = () => {
    if (isClaimed) return "CÂȘTIGAT";
    if (isApproved) return "CÂȘTIGAT";
    if (isRejected) return "REFUZAT";
    return "INCOMPLET";
  };

  const handleRequestReward = async () => {
    if (isRequesting) return;
    setIsRequesting(true);
    try {
      await onRequestReward?.(id);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleClaimReward = async () => {
    await onClaimReward?.(id);
  };

  return (
    <ImageBackground
      source={GameImages.bgCard}
      style={[styles.card, isApproved && styles.cardApproved]}
      imageStyle={styles.cardImage}
      resizeMode="cover"
    >
      {/* Header cu avatar admin */}
      <View style={styles.adminHeader}>
        <View style={styles.adminInfo}>
          {createdBy?.avatar ? (
            <Image
              source={{ uri: createdBy.avatar }}
              style={styles.adminAvatar}
            />
          ) : (
            <View style={styles.adminAvatarPlaceholder}>
              <Text style={styles.adminAvatarText}>
                {createdBy?.name?.[0]?.toUpperCase() || "A"}
              </Text>
            </View>
          )}
          <Text style={styles.adminName}>
            Misiunea lui {createdBy?.name || "Admin"}
          </Text>
        </View>
      </View>

      {/* Titlu și acțiuni */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>

        <View style={styles.headerActions}>
          <View style={styles.stageTag}>
            <Text style={styles.stageTagText}>MISIUNE</Text>
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

      {/* Descriere expandată */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
      )}

      {/* Secțiunea de cerere răsplată (în loc de progress bar) */}
      {isPending && (
        <View style={styles.requestContainer}>
          <Text style={styles.requestText}>Ai terminat misiunea?</Text>
          <TouchableOpacity
            style={styles.requestButton}
            onPress={handleRequestReward}
            disabled={isRequesting}
            activeOpacity={0.7}
          >
            <Text style={styles.requestButtonText}>CERE RĂSPLATA</Text>
          </TouchableOpacity>
        </View>
      )}

      {isRequested && (
        <View style={styles.requestContainer}>
          <View style={styles.waitingBadge}>
            <Text style={styles.waitingText}>AȘTEAPTĂ APROBARE</Text>
          </View>
        </View>
      )}

      {isRejected && (
        <View style={styles.requestContainer}>
          <Text style={styles.rejectedText}>Cererea ta a fost refuzată</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.expiryContainer}>
          {!isClaimed && (
            <Text style={styles.expiryText}>
              Expiră în {getDaysRemaining()} zile ({getHoursRemaining()}h)
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.claimButton,
            isClaimed && styles.claimButtonClaimed,
            isApproved && !isClaimed && styles.claimButtonReady,
          ]}
          onPress={handleClaimReward}
          disabled={!isApproved || isClaimed}
          activeOpacity={0.7}
          accessibilityLabel={getButtonLabel()}
          accessibilityRole="button"
        >
          {!isClaimed && !isApproved && (
            <>
              <Image
                source={GameImages.alabastru}
                style={styles.rewardIcon}
                resizeMode="contain"
              />
              <Text style={styles.rewardAmount}>+{reward}</Text>
            </>
          )}
          {isApproved && !isClaimed && (
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
              (isApproved || isClaimed) && styles.claimButtonTextComplete,
            ]}
          >
            {getButtonLabel()}
          </Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  // Refolosesc stilurile din challengeCardStyles
  ...challengeCardStyles,

  // Stiluri noi pentru admin header
  adminHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(48, 44, 38, 0.15)",
  },
  adminInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  adminAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(130, 80, 47, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  adminAvatarText: {
    color: "#302c26",
    fontSize: 12,
    fontWeight: "700",
  },
  adminName: {
    color: "rgba(48, 44, 38, 0.7)",
    fontSize: 11,
    fontStyle: "italic",
  },

  // Stiluri pentru cerere răsplată
  requestContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 8,
  },
  requestText: {
    color: "#302c26",
    fontSize: 12,
    marginRight: 8,
  },
  requestButton: {
    backgroundColor: "rgba(130, 80, 47, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#82502f",
  },
  requestButtonText: {
    color: "#82502f",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  waitingBadge: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  waitingText: {
    color: "#b45309",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  rejectedText: {
    color: "#dc2626",
    fontSize: 12,
    fontStyle: "italic",
  },

  // Card aprobat
  cardApproved: {
    borderColor: "#4ade80",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // Override pentru butonul claim - mai vizibil
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    backgroundColor: "rgba(74, 222, 128, 0.25)",
    borderWidth: 2,
    borderColor: "#4ade80",
  },
  claimButtonReady: {
    backgroundColor: "rgba(74, 222, 128, 0.35)",
    borderColor: "#22c55e",
    borderWidth: 2.5,
  },
  claimButtonClaimed: {
    backgroundColor: "rgba(74, 222, 128, 0.2)",
    borderColor: "#4ade80",
    borderWidth: 2,
  },
  claimButtonText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  claimButtonTextComplete: {
    color: "#166534",
  },
  rewardAmount: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "800",
  },
});

export default React.memo(MissionCard);
