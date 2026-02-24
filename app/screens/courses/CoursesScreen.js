import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { headerGradient } from "../../public/styles/global";
import { api, showError } from "../../global/functions";
import { styles } from "./styles";

const categoryIcons = {
  music: "🎵",
  worship: "🙏",
  technical: "🔧",
  leadership: "👑",
};

export const CoursesScreen = ({ navigation }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    try {
      const data = await api.get("/courses");
      setCourses(data);
    } catch (error) {
      showError("Nu am putut incarca cursurile");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCourses();
    setRefreshing(false);
  };

  const renderCourse = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("CourseDetail", { courseId: item._id })}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={styles.thumbnail}>
        <Text style={styles.thumbnailEmoji}>
          {categoryIcons[item.category] || "🎓"}
        </Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category || "General"}</Text>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description || "Curs pentru echipa"}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.duration}>
            {item.duration ? `${item.duration} min` : "Video"}
          </Text>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => item.videoUrl && Linking.openURL(item.videoUrl)}
          >
            <Text style={styles.playButtonText}>Priveste</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={headerGradient.colors}
        start={headerGradient.start}
        end={headerGradient.end}
        style={styles.gradientHeader}
      >
        <View style={styles.headerContent}>
          <Ionicons name="book" size={28} color="#fff" />
          <Text style={styles.gradientHeaderTitle}>CURSURI</Text>
        </View>
      </LinearGradient>

      <View style={styles.screenBg}>

      <FlatList
        data={courses}
        renderItem={renderCourse}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyText}>
              Niciun curs disponibil momentan.
            </Text>
          </View>
        }
      />
      </View>
    </View>
  );
};
