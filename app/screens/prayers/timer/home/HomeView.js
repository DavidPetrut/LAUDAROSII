import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { QuoteCard } from "./QuoteCard";

/**
 * Ecranul principal Devotional: citatul zilei, apoi butonul de devotional al zilei
 * (Incepe / Continua / completat / creeaza) si dedesubt butonul de rugaciune
 * instanta, restilat ca sa fie distinct de devotional.
 */
export const HomeView = ({ quote, defaultDevotional, hasAny, hasResume, onToast, onStartPrayer, onStartDevotional, onCreateDevotional }) => {
  const dev = defaultDevotional;

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
    >
      <QuoteCard quote={quote} onToast={onToast} />

      {!hasAny ? (
        <>
          <View style={styles.noDevotionalCard}>
            <Text style={styles.noDevotionalText}>Nu ai niciun devotional. Creeaza unul ca sa incepi.</Text>
          </View>
          <TouchableOpacity style={[styles.bigBtn, styles.bigBtnGhost]} onPress={onCreateDevotional} activeOpacity={0.9}>
            <Ionicons name="add-circle-outline" size={26} color="#10b981" />
            <Text style={[styles.bigBtnText, { color: "#10b981" }]}>Creeaza un devotional</Text>
          </TouchableOpacity>
        </>
      ) : dev && dev.completedToday ? (
        <View style={[styles.bigBtn, styles.bigBtnDone]}>
          <Ionicons name="checkmark-done" size={26} color="#10b981" />
          <Text style={[styles.bigBtnText, { color: "#10b981" }]}>Devotional completat</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.bigBtn} onPress={() => onStartDevotional(dev)} activeOpacity={0.9}>
          <Ionicons name={hasResume ? "play-forward-outline" : "book-outline"} size={26} color="#fff" />
          <Text style={styles.bigBtnText}>{hasResume ? "CONTINUA DEVOTIONAL" : "INCEPE DEVOTIONAL"}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.instantBtn} onPress={onStartPrayer} activeOpacity={0.85}>
        <Ionicons name="add" size={22} color="#10b981" />
        <Text style={styles.instantBtnText}>Incepe rugaciune instanta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default HomeView;
