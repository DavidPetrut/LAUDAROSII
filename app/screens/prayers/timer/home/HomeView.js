import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { QuoteCard } from "./QuoteCard";

/**
 * Ecranul principal Devotional: citatul zilei + doua actiuni mari (Incepe
 * rugaciunea / Incepe devotional). Butonul de devotional se schimba in functie
 * de starea planului activ (neexistent / de facut azi / completat azi).
 */
export const HomeView = ({ quote, defaultDevotional, hasResume, onToast, onStartPrayer, onStartDevotional, onCreateDevotional }) => {
  const dev = defaultDevotional;

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <QuoteCard quote={quote} onToast={onToast} />

      <TouchableOpacity style={styles.bigBtn} onPress={onStartPrayer} activeOpacity={0.9}>
        <Ionicons name="flame-outline" size={26} color="#fff" />
        <Text style={styles.bigBtnText}>Începe rugăciunea</Text>
      </TouchableOpacity>

      {!dev && (
        <TouchableOpacity style={[styles.bigBtn, styles.bigBtnGhost]} onPress={onCreateDevotional} activeOpacity={0.9}>
          <Ionicons name="add-circle-outline" size={26} color="#10b981" />
          <Text style={[styles.bigBtnText, { color: "#10b981" }]}>Creează un devotional</Text>
        </TouchableOpacity>
      )}

      {dev && dev.completedToday && (
        <View style={[styles.bigBtn, styles.bigBtnDone]}>
          <Ionicons name="checkmark-done" size={26} color="#10b981" />
          <Text style={[styles.bigBtnText, { color: "#10b981" }]}>Devotional completat</Text>
        </View>
      )}

      {dev && !dev.completedToday && (
        <TouchableOpacity style={styles.bigBtn} onPress={() => onStartDevotional(dev)} activeOpacity={0.9}>
          <Ionicons name={hasResume ? "play-forward-outline" : "book-outline"} size={26} color="#fff" />
          <Text style={styles.bigBtnText}>{hasResume ? "Continuă devotionalul" : "Începe devotional"}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default HomeView;
