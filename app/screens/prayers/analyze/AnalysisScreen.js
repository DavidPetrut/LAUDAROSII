import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { api, showError } from "../../../global/functions";
import { ScreenHeader } from "../../../global/components";
import { analysisStyles as styles } from "./styles";

/**
 * Ecran de analiza AI a rugaciunilor personale
 * Folosește ChatGPT pentru a oferi perspective spirituale
 */
export const AnalysisScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    runAnalysis();
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.post("/prayers/analyze");
      setAnalysis(result);
    } catch (e) {
      setError("Nu am putut genera analiza. Încearca din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Analiza Rugaciuni" />

      <ScrollView style={styles.content}>
        {loading && <LoadingState />}
        {error && <ErrorState error={error} onRetry={runAnalysis} />}
        {analysis && <AnalysisResult data={analysis} />}
      </ScrollView>
    </View>
  );
};

const LoadingState = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#6366f1" />
    <Text style={styles.loadingText}>
      Analizez rugaciunile tale...{"\n"}Aceasta poate dura câteva secunde.
    </Text>
  </View>
);

const ErrorState = ({ error, onRetry }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorEmoji}>😔</Text>
    <Text style={styles.errorText}>{error}</Text>
    <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
      <Text style={styles.retryText}>Încearca din nou</Text>
    </TouchableOpacity>
  </View>
);

const AnalysisResult = ({ data }) => (
  <>
    <ResultCard title="📊 Teme Identificate" items={data.temeIdentificate} />
    <ResultCard
      title="💭 Emoții Predominante"
      items={data.emotiiPredominante}
    />
    <ResultCard title="✅ Puncte Tari" items={data.puncteTari} />
    <ResultCard title="🌱 Arii de Creștere" items={data.ariiDeCrestere} />

    {data.versetRecomandat && (
      <View style={[styles.resultCard, styles.verseCard]}>
        <Text style={styles.verseRef}>{data.versetRecomandat.referinta}</Text>
        <Text style={styles.verseText}>{data.versetRecomandat.text}</Text>
      </View>
    )}

    {data.mesajIncurajare && (
      <View style={styles.resultCard}>
        <Text style={styles.cardEmoji}>💝</Text>
        <Text style={styles.messageText}>{data.mesajIncurajare}</Text>
      </View>
    )}

    {data.procentAnaliza && <ChartCard data={data.procentAnaliza} />}
  </>
);

const ResultCard = ({ title, items }) => (
  <View style={styles.resultCard}>
    <Text style={styles.cardTitle}>{title}</Text>
    <View style={styles.tagContainer}>
      {items?.map((item, i) => (
        <View key={i} style={styles.tag}>
          <Text style={styles.tagText}>{item}</Text>
        </View>
      ))}
    </View>
  </View>
);

const ChartCard = ({ data }) => (
  <View style={styles.resultCard}>
    <Text style={styles.cardTitle}>📈 Distribuție Teme</Text>
    <View style={styles.chartContainer}>
      {Object.entries(data).map(([key, value]) => (
        <View key={key} style={styles.chartRow}>
          <Text style={styles.chartLabel}>{key}</Text>
          <View style={styles.chartBar}>
            <View style={[styles.chartFill, { width: `${value}%` }]} />
          </View>
          <Text style={styles.chartPercent}>{value}%</Text>
        </View>
      ))}
    </View>
  </View>
);
