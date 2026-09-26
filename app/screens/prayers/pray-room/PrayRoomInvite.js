import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { ScreenHeader, TiledBackground, UserAvatar } from "../../../global/components";
import { api, showError, showSuccess } from "../../../global/functions";
import { useTheme } from "../../../global/context";
import { prayRoomStyles as styles } from "./styles";

const BG_LIGHT = require("../../../public/images/day-light-mode-background.png");
const BG_DARK = require("../../../public/images/dark-mode-small.png");

const ICON_MAP = {
  room_icon1: require("../../../public/icons/room_icon1.png"),
  room_icon2: require("../../../public/icons/room_icon2.png"),
  room_icon3: require("../../../public/icons/room_icon3.png"),
};
const TYPE_LABELS = { common: "Motive Comune", targeted: "Motive de Grup", roulette: "Tragere la Sort" };

export const PrayRoomInvite = ({ navigation, route }) => {
  const { roomId } = route.params;
  const { isDarkMode, theme } = useTheme();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/pray-rooms/invites")
      .then((list) => setInvite((list || []).find((i) => i._id === roomId) || null))
      .catch(() => setInvite(null))
      .finally(() => setLoading(false));
  }, [roomId]);

  const accept = async () => {
    setBusy(true);
    try {
      const room = await api.post(`/pray-rooms/${roomId}/accept-invite`);
      showSuccess("Ai intrat in camera");
      navigation.replace("PrayRoomScreen", { roomId: room._id });
    } catch (e) {
      showError(e.response?.data?.error || e.message || "Eroare");
      setBusy(false);
    }
  };

  const refuse = async () => {
    setBusy(true);
    try {
      await api.post(`/pray-rooms/${roomId}/refuse-invite`);
      showSuccess("Invitatie refuzata");
      navigation.goBack();
    } catch (e) {
      showError(e.response?.data?.error || e.message || "Eroare");
      setBusy(false);
    }
  };

  return (
    <TiledBackground tileSource={BG_DARK} solidSource={BG_LIGHT} useTiled={isDarkMode} style={styles.container}>
      <ScreenHeader title="Invitatie" onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color="#7c3aed" /></View>
      ) : !invite ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Invitatia nu mai e valabila</Text>
          <Text style={styles.emptySubtitle}>Poate a expirat. Cere codul ca sa intri.</Text>
        </View>
      ) : (
        <View style={styles.inviteDetailWrap}>
          <Image source={ICON_MAP[invite.icon] || ICON_MAP.room_icon1} style={styles.inviteDetailIcon} />
          <Text style={styles.inviteDetailName}>{invite.name}</Text>
          <Text style={styles.inviteDetailType}>{TYPE_LABELS[invite.roomType]}</Text>

          <View style={styles.inviteInviter}>
            <UserAvatar profilePicture={invite.createdBy?.personalData?.profilePicture} size={36} />
            <Text style={styles.inviteInviterText}>
              Te-a invitat {invite.createdBy?.personalData?.fullName || "Cineva"}
            </Text>
          </View>

          <View style={styles.inviteActions}>
            <TouchableOpacity style={[styles.inviteRefuseBtn, busy && styles.btnDisabled]} onPress={refuse} disabled={busy}>
              <Text style={styles.inviteRefuseText}>Refuza</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.inviteAcceptBtn, busy && styles.btnDisabled]} onPress={accept} disabled={busy}>
              <Text style={styles.inviteAcceptText}>Particip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TiledBackground>
  );
};
