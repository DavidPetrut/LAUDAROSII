import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { devotionalStyles as styles } from "../devotionalStyles";
import { ProgressChart } from "./ProgressChart";
import { devotionalsApi } from "../devotionals/devotionalsApi";

const DAY = 24 * 60 * 60 * 1000;

// inceputul saptamanii (luni) pentru o data
const weekStart = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  return new Date(x.getTime() - day * DAY);
};

/**
 * Construieste ultimele 6 saptamani cu numarul de completari, transformat in scor
 * relativ la tinta (zilele programate sau 3 implicit), pentru chart-ul de progres.
 */
const buildWeeks = (completions, target) => {
  const now = new Date();
  const curStart = weekStart(now).getTime();
  const weeks = [];
  for (let i = 5; i >= 0; i--) {
    const start = curStart - i * 7 * DAY;
    const end = start + 7 * DAY;
    const count = completions.filter((c) => {
      const t = new Date(c).getTime();
      return t >= start && t < end;
    }).length;
    weeks.push({
      index: 6 - i,
      score: Math.min(100, Math.round((count / target) * 100)),
      count,
      isCurrent: i === 0,
    });
  }
  return weeks;
};

/**
 * "Progresul meu": consecventa devotionalului activ prin completarile din ultimele
 * saptamani. Scorul reflecta intentionalitatea, nu un standard.
 */
export const ProgressView = () => {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [devotional, setDevotional] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await devotionalsApi.list();
      const list = res.devotionals || [];
      setDevotional(list.find((d) => d.isDefault) || list[0] || null);
    } catch (e) {
      setDevotional(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!devotional) {
    return (
      <View style={styles.emptyPersonal}>
        <Text style={styles.emptyTitle}>Niciun devotional activ</Text>
        <Text style={styles.introDesc}>Creează un devotional ca să-ți urmărești progresul.</Text>
      </View>
    );
  }

  const completions = devotional.completions || [];
  const target = devotional.schedule?.weekdays?.length || 3;
  const weeks = buildWeeks(completions, target);
  const thisWeek = weeks[weeks.length - 1];

  return (
    <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Săptămâna aceasta</Text>
        <Text style={styles.statBig}>{thisWeek.count} / {target}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${thisWeek.score}%` }]} />
        </View>
        <Text style={styles.statScore}>{thisWeek.score}% intenționalitate</Text>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Total completări</Text>
        <Text style={styles.statBig}>{completions.length}</Text>
        <Text style={styles.noteSoft}>
          Scorul nu definește standardul lui Dumnezeu, ci intenționalitatea ta.
        </Text>
      </View>

      <Text style={styles.stepLabel}>Ultimele 6 săptămâni</Text>
      <View style={styles.chartCard}>
        <ProgressChart weeks={weeks} width={Math.max(width - 64, 220)} />
      </View>
    </ScrollView>
  );
};

export default ProgressView;
