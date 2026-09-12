import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { CONFIG, setApiUrl, resetApiUrl, getDefaultBase } from "../config";

export const ServerSettingsModal = ({ visible, onClose }) => {
  const [url, setUrl] = useState(CONFIG.SERVER_BASE);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (visible) {
      setUrl(CONFIG.SERVER_BASE);
      setResult(null);
    }
  }, [visible]);

  const testConnection = async () => {
    setTesting(true);
    setResult(null);
    const target = url.trim().replace(/\/+$/, "");
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${target}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (response.ok) {
        setResult({ ok: true, message: "Serverul raspunde corect." });
      } else {
        setResult({
          ok: false,
          message: `Serverul a raspuns cu eroare (${response.status}).`,
        });
      }
    } catch (e) {
      setResult({
        ok: false,
        message:
          e.name === "AbortError"
            ? "Serverul nu a raspuns in 15 secunde."
            : "Nu se poate contacta serverul. Verifica adresa si conexiunea.",
      });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    await setApiUrl(url);
    onClose();
  };

  const handleReset = async () => {
    await resetApiUrl();
    setUrl(CONFIG.SERVER_BASE);
    setResult(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Adresa serverului</Text>
          <Text style={styles.hint}>
            Schimba doar daca stii ce faci. Implicit: {getDefaultBase()}
          </Text>

          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://exemplu.onrender.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          {result && (
            <Text style={[styles.result, result.ok ? styles.ok : styles.fail]}>
              {result.message}
            </Text>
          )}

          <TouchableOpacity
            style={styles.testBtn}
            onPress={testConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color="#6366f1" />
            ) : (
              <Text style={styles.testText}>Testeaza conexiunea</Text>
            )}
          </TouchableOpacity>

          <View style={styles.row}>
            <TouchableOpacity style={styles.ghostBtn} onPress={handleReset}>
              <Text style={styles.ghostText}>Reseteaza</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
              <Text style={styles.ghostText}>Anuleaza</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Salveaza</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
  },
  result: {
    marginTop: 10,
    fontSize: 13,
  },
  ok: { color: "#059669" },
  fail: { color: "#dc2626" },
  testBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#6366f1",
    alignItems: "center",
  },
  testText: {
    color: "#6366f1",
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  ghostBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ghostText: {
    color: "#64748b",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
  },
});
