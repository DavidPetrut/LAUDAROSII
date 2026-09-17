import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { ScreenHeader } from "../../../global/components";
import { api } from "../../../global/functions";
import { devotionalStyles as styles } from "./devotionalStyles";
import { DevotionalPlayer } from "./DevotionalPlayer";

const DURATIONS = [15, 30, 45, 60, 90, 120];

/**
 * Ecran DEVOTIONAL: momentan doar programul "worship" (plain).
 * Alegi durata (min 15), cu/fara muzica, iar la muzica: instrumental / cu versuri.
 * Pregatit sa se extinda cu programe per-user (vezi PrayerProgram: type/ownerId).
 */
export const DevotionalScreen = () => {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState(null);
  const [minutes, setMinutes] = useState(15);
  const [withMusic, setWithMusic] = useState(true);
  const [category, setCategory] = useState("instrumental");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.get("/prayer-programs/worship");
        if (active) setProgram(data);
      } catch (e) {
        if (active) setProgram(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const categoryTracks = (program?.playlist || []).filter(
    (t) => t.category === category && t.url
  );
  const startDisabled = withMusic && categoryTracks.length === 0;

  const renderChip = (val, label, active, onPress) => (
    <TouchableOpacity
      key={label}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderToggle = (label, active, onPress) => (
    <TouchableOpacity
      style={[styles.toggleBtn, active && styles.toggleActive]}
      onPress={onPress}
    >
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Devotional" />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Se încarcă…</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>🎵</Text>
            <Text style={styles.heroTitle}>WORSHIP</Text>
            <Text style={styles.heroDesc}>Închinare — alege durata și muzica</Text>
          </View>

          <Text style={styles.sectionLabel}>Durată (minim 15 min)</Text>
          <View style={styles.row}>
            {DURATIONS.map((d) =>
              renderChip(d, `${d} min`, minutes === d, () => setMinutes(d))
            )}
          </View>

          <Text style={styles.sectionLabel}>Muzică</Text>
          <View style={styles.toggleRow}>
            {renderToggle("🎵 Cu muzică", withMusic, () => setWithMusic(true))}
            {renderToggle("🔇 Fără muzică", !withMusic, () => setWithMusic(false))}
          </View>

          {withMusic && (
            <>
              <Text style={styles.sectionLabel}>Gen</Text>
              <View style={styles.toggleRow}>
                {renderToggle("Instrumental", category === "instrumental", () =>
                  setCategory("instrumental")
                )}
                {renderToggle("Cu versuri", category === "lyrics", () => setCategory("lyrics"))}
              </View>
              <Text style={styles.note}>
                {categoryTracks.length > 0
                  ? `${categoryTracks.length} melodii disponibile`
                  : "Nicio melodie în această categorie încă."}
              </Text>
            </>
          )}

          <TouchableOpacity
            style={[styles.startBtn, startDisabled && styles.startBtnDisabled]}
            onPress={() => setPlaying(true)}
            disabled={startDisabled}
          >
            <Text style={styles.startBtnText}>▶ Începe</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {playing && (
        <DevotionalPlayer
          durationMin={minutes}
          tracks={categoryTracks}
          withMusic={withMusic}
          onStop={() => setPlaying(false)}
        />
      )}
    </View>
  );
};

export default DevotionalScreen;
