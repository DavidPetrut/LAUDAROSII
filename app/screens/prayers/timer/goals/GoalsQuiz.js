import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { devotionalStyles as styles } from "../devotionalStyles";
import { goalsApi, quizSkip } from "./goalsApi";

const FOCUS = [
  "Închinare",
  "Mulțumire",
  "Familie",
  "Iertare",
  "Călăuzire",
  "Mijlocire",
  "Pace",
  "Credință",
];
const FREQUENCIES = [3, 4, 5, 6, 7];

/**
 * Quiz de inceput (prima intrare): userul isi alege ariile de concentrare si de
 * cate ori pe saptamana vrea sa se roage. Are un "skip for now" care intra direct
 * in ecran fara plan. La final creeaza planul lunar activ.
 */
export const GoalsQuiz = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState([]);
  const [weekly, setWeekly] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleFocus = (f) =>
    setFocus((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );

  const skip = async () => {
    await quizSkip.set();
    onDone();
  };

  const submit = async () => {
    if (!weekly) return;
    setSaving(true);
    setError("");
    try {
      await goalsApi.create(weekly, focus);
      onDone();
    } catch (e) {
      setError(e.message || "Nu am putut salva planul.");
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.introCard}>
        <Text style={styles.introTitle}>Planul tău devotional</Text>
        <Text style={styles.introDesc}>
          Câteva întrebări scurte ca să-ți construim un plan lunar pe măsura ta.
        </Text>
      </View>

      {step === 0 && (
        <>
          <Text style={styles.stepLabel}>Pe ce vrei să te concentrezi?</Text>
          <View style={styles.chipsRow}>
            {FOCUS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, focus.includes(f) && styles.chipActive]}
                onPress={() => toggleFocus(f)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, focus.includes(f) && styles.chipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={() => setStep(1)} activeOpacity={0.9}>
            <Text style={styles.startBtnText}>Continuă</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={skip}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 1 && (
        <>
          <Text style={styles.stepLabel}>De câte ori pe săptămână vrei să te rogi?</Text>
          <View style={styles.optRow}>
            {FREQUENCIES.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.freqCard, weekly === n && styles.optCardActive]}
                onPress={() => setWeekly(n)}
                activeOpacity={0.85}
              >
                <Text style={[styles.freqNum, weekly === n && styles.optCardTextActive]}>{n}</Text>
                <Text style={[styles.freqUnit, weekly === n && styles.optCardTextActive]}>/săpt.</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!error && <Text style={styles.errorNote}>{error}</Text>}

          <TouchableOpacity
            style={[styles.startBtn, (!weekly || saving) && styles.startBtnDisabled]}
            onPress={submit}
            disabled={!weekly || saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.startBtnText}>Creează planul</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={() => setStep(0)}>
            <Text style={styles.skipBtnText}>Înapoi</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

export default GoalsQuiz;
