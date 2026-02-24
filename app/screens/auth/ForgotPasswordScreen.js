import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { showError, showSuccess } from "../../global/functions";
import { styles } from "./styles";
import { forgotStyles as fs } from "./forgotStyles";

// Ecran de resetare parola: email -> parola noua -> cod de confirmare (placeholder)
export const ForgotPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);

  const codeRefs = useRef([]);

  const handleSubmitEmail = () => {
    if (!email.trim()) return showError("Introdu adresa de email");
    setStep(2);
  };

  const handleSubmitPasswords = () => {
    if (!newPassword || !confirmPassword) return showError("Completeaza ambele campuri");
    if (newPassword.length < 6) return showError("Parola trebuie sa aiba minim 6 caractere");
    if (newPassword !== confirmPassword) return showError("Parolele nu coincid");

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(3);
      showSuccess("Un email de resetare ti se va trimite pe email");
    }, 800);
  };

  const handleCodeChange = (text, index) => {
    if (text.length > 1) text = text.slice(-1);
    const updated = [...code];
    updated[index] = text;
    setCode(updated);
    if (text && index < 5) codeRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Resetare Parola</Text>
        <Text style={styles.subtitle}>
          {step === 1 && "Introdu emailul contului tau"}
          {step === 2 && "Alege o parola noua"}
          {step === 3 && "Introdu codul primit pe email"}
        </Text>
      </View>

      <View style={styles.form}>
        {step === 1 && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@exemplu.com"
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Email pentru resetare"
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmitEmail}
              accessibilityRole="button"
              accessibilityLabel="Continua"
            >
              <Text style={styles.buttonText}>Continua</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Parola noua</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Minim 6 caractere"
                secureTextEntry
                accessibilityLabel="Parola noua"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirma parola</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeta parola"
                secureTextEntry
                accessibilityLabel="Confirma parola noua"
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmitPasswords}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Trimite cod</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={fs.infoText}>
              Un email de resetare ti se va trimite pe email
            </Text>

            <View style={fs.codeRow}>
              {code.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => (codeRefs.current[i] = ref)}
                  style={fs.codeInput}
                  value={digit}
                  onChangeText={(t) => handleCodeChange(t, i)}
                  onKeyPress={(e) => handleCodeKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  accessibilityLabel={`Cifra ${i + 1} din cod`}
                />
              ))}
            </View>

            <Text style={fs.hintText}>
              Aceasta functionalitate va fi disponibila in curand.
            </Text>
          </>
        )}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>Inapoi la autentificare</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
