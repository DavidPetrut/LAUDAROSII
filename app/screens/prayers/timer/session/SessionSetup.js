import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { devotionalStyles as styles } from "../devotionalStyles";

const DURATIONS = [15, 30, 45, 60, 90, 120];

/**
 * Selector modern, pas cu pas: fiecare alegere descopera pasul urmator (nu toate
 * butoanele deodata). Intoarce configuratia catre parinte prin onStart.
 */
export const SessionSetup = ({ program, onStart }) => {
  const [minutes, setMinutes] = useState(null);
  const [withMusic, setWithMusic] = useState(null);
  const [category, setCategory] = useState(null);

  const tracksFor = (cat) =>
    (program?.playlist || []).filter((t) => t.category === cat && t.url);

  const musicChosen = withMusic !== null;
  const genreNeeded = withMusic === true;
  const genreChosen = !genreNeeded || category !== null;
  const ready = minutes !== null && musicChosen && genreChosen;
  const noTracks = genreNeeded && category && tracksFor(category).length === 0;

  const start = () => {
    if (!ready || noTracks) return;
    onStart({
      minutes,
      withMusic: withMusic === true,
      category: category || "instrumental",
    });
  };

  const Option = ({ label, active, onPress }) => (
    <TouchableOpacity
      style={[styles.optCard, active && styles.optCardActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.optCardText, active && styles.optCardTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.introCard}>
        <Text style={styles.introTitle}>Un timp pus deoparte</Text>
        <Text style={styles.introDesc}>
          Alege pas cu pas cum vrei să fie sesiunea ta de închinare.
        </Text>
      </View>

      <Text style={styles.stepLabel}>1 · Cât timp?</Text>
      <View style={styles.chipsRow}>
        {DURATIONS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, minutes === d && styles.chipActive]}
            onPress={() => setMinutes(d)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, minutes === d && styles.chipTextActive]}>
              {d} min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {minutes !== null && (
        <>
          <Text style={styles.stepLabel}>2 · Cu muzică?</Text>
          <View style={styles.optRow}>
            <Option label="Cu muzică" active={withMusic === true} onPress={() => setWithMusic(true)} />
            <Option label="Fără muzică" active={withMusic === false} onPress={() => { setWithMusic(false); setCategory(null); }} />
          </View>
        </>
      )}

      {genreNeeded && (
        <>
          <Text style={styles.stepLabel}>3 · Ce fel de muzică?</Text>
          <View style={styles.optRow}>
            <Option label="Instrumental" active={category === "instrumental"} onPress={() => setCategory("instrumental")} />
            <Option label="Cu versuri" active={category === "lyrics"} onPress={() => setCategory("lyrics")} />
          </View>
          {category && (
            <Text style={styles.helperNote}>
              {tracksFor(category).length > 0
                ? `${tracksFor(category).length} melodii · ordine aleatoare`
                : "Nicio melodie în această categorie încă."}
            </Text>
          )}
        </>
      )}

      {ready && (
        <TouchableOpacity
          style={[styles.startBtn, noTracks && styles.startBtnDisabled]}
          onPress={start}
          disabled={noTracks}
          activeOpacity={0.9}
        >
          <Text style={styles.startBtnText}>Începe</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default SessionSetup;
