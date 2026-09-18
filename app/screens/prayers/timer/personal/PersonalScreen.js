import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { devotionalStyles as styles } from "../devotionalStyles";
import { goalsApi } from "../goals/goalsApi";
import { ProgressChart } from "./ProgressChart";

/**
 * Ecran "Personale": progresul planului activ (saptamana curenta), scorul general,
 * istoric + chart si stergerea planului. Scorul reflecta intentionalitatea, nu un
 * standard - explicat direct in ecran.
 */
export const PersonalScreen = ({ onCreatePlan }) => {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await goalsApi.getActive();
      setPlan(data.plan);
    } catch (e) {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const removePlan = async () => {
    if (!plan?._id) return;
    setDeleting(true);
    try {
      await goalsApi.remove(plan._id);
      setPlan(null);
    } catch (e) {}
    setDeleting(false);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.emptyPersonal}>
        <Text style={styles.emptyTitle}>Niciun plan activ</Text>
        <Text style={styles.introDesc}>
          Creează un plan lunar ca să-ți urmărești intenționalitatea în rugăciune.
        </Text>
        <TouchableOpacity style={styles.startBtn} onPress={onCreatePlan} activeOpacity={0.9}>
          <Text style={styles.startBtnText}>Creează un plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const current = plan.weeks.find((w) => w.isCurrent);

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Săptămâna aceasta</Text>
        {current ? (
          <>
            <Text style={styles.statBig}>
              {current.completed} / {current.target}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${current.score}%` }]} />
            </View>
            <Text style={styles.statScore}>{current.score}% intenționalitate</Text>
          </>
        ) : (
          <Text style={styles.introDesc}>Planul nu are o săptămână curentă activă.</Text>
        )}
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Scor general</Text>
        <Text style={styles.statBig}>{plan.overallScore}%</Text>
        <Text style={styles.noteSoft}>
          Scorul nu definește standardul lui Dumnezeu, ci intenționalitatea ta.
        </Text>
      </View>

      <Text style={styles.stepLabel}>Progresie</Text>
      <View style={styles.chartCard}>
        <ProgressChart weeks={plan.weeks} width={Math.max(width - 64, 220)} />
      </View>

      {plan.focusAreas?.length > 0 && (
        <>
          <Text style={styles.stepLabel}>Concentrare</Text>
          <View style={styles.chipsRow}>
            {plan.focusAreas.map((f) => (
              <View key={f} style={styles.readonlyChip}>
                <Text style={styles.chipText}>{f}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity style={styles.deleteBtn} onPress={removePlan} disabled={deleting} activeOpacity={0.85}>
        <Text style={styles.deleteBtnText}>
          {deleting ? "Se șterge…" : "Șterge planul"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default PersonalScreen;
