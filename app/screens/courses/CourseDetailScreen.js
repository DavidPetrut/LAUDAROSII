import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import {
  api,
  showError,
  showSuccess,
  formatDate,
} from "../../global/functions";
import { ScreenHeader } from "../../global/components";
import { detailStyles as styles } from "./styles";

export const CourseDetailScreen = ({ route, navigation }) => {
  const { courseId } = route.params;
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourse();
  }, []);

  const loadCourse = async () => {
    try {
      const data = await api.get(`/courses/${courseId}`);
      setCourse(data);
    } catch (error) {
      showError("Nu am putut încarca cursul");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async () => {
    try {
      await api.put(`/courses/progress/${courseId}`, { completed: true });
      showSuccess("Curs marcat ca finalizat!");
    } catch (error) {
      showError("Eroare la salvare");
    }
  };

  const openVideo = () => {
    if (course?.videoUrl) {
      Linking.openURL(course.videoUrl);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!course) return null;

  return (
    <View style={styles.container}>
      <ScreenHeader title={course.title} />

      <ScrollView>
        <View style={styles.thumbnail}>
          <Text style={styles.thumbnailEmoji}>🎓</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {course.category || "General"}
            </Text>
          </View>

          <Text style={styles.title}>{course.title}</Text>

          <View style={styles.meta}>
            <Text style={styles.metaText}>
              ⏱️ {course.duration ? `${course.duration} min` : "Video"}
            </Text>
            <Text style={styles.metaText}>
              📅 {formatDate(course.postedAt)}
            </Text>
          </View>

          <Text style={styles.description}>
            {course.description ||
              "Acest curs ofera informații valoroase pentru echipa."}
          </Text>

          <TouchableOpacity style={styles.playButton} onPress={openVideo}>
            <Text style={styles.playEmoji}>▶️</Text>
            <Text style={styles.playText}>Vizioneaza Acum</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.completeButton}
            onPress={markComplete}
          >
            <Text style={styles.completeEmoji}>✓</Text>
            <Text style={styles.completeText}>Marcheaza ca Finalizat</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};
