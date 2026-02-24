import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BackArrowIcon, UserAvatar } from "../../global/components";
import { api, showError, formatDate } from "../../global/functions";
import { headerGradient, colors, spacing } from "../../public/styles/global";
import { detailStyles as styles } from "./styles";

export const AnnouncementDetailScreen = ({ route, navigation }) => {
  const { announcementId } = route.params;
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAnnouncement(); }, []);

  const loadAnnouncement = async () => {
    try {
      const data = await api.get(`/announcements/${announcementId}`);
      setAnnouncement(data);
      await api.put(`/announcements/${announcementId}/read`);
    } catch (error) {
      showError("Nu am putut incarca anuntul");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!announcement) return null;

  const author = announcement.authorId;
  const hasBgImg = !!announcement.bgImage;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={headerGradient.colors}
        start={headerGradient.start}
        end={headerGradient.end}
        style={styles.detailHeader}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Inapoi"
        >
          <BackArrowIcon size={32} light />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {announcement.title}
        </Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView bounces={false} style={{ flex: 1 }}>
        {hasBgImg && (
          <Image source={{ uri: announcement.bgImage }} style={styles.bannerImg} />
        )}

        <View style={styles.content}>
          <View style={styles.authorRow}>
            <UserAvatar
              profilePicture={author?.personalData?.profilePicture}
              size={36}
            />
            <View>
              <Text style={styles.authorName}>
                {author?.personalData?.fullName || "Admin"}
              </Text>
              <Text style={styles.date}>{formatDate(announcement.date)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.body}>{announcement.body}</Text>
        </View>
      </ScrollView>
    </View>
  );
};
