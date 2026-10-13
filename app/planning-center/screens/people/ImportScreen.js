/**
 * Import CSV People (doc #Import). Convertit din flux web → mobil dark+verde.
 * Flux: paste CSV → Preview (create/update/errors) → Finish → rezultat + Undo (48h).
 * Mobile-only: acum CSV = TEXT lipit (OTA-safe). File-picker = seam (necesită expo-document-picker + build).
 */
import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess, showConfirm } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcButton, PcCard } from "../../components";

export function ImportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState("input"); // input | preview | done
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // { importId, summary, sample, errorRows }
  const [result, setResult] = useState(null); // { created, updated, undoableUntil }

  const doPreview = async () => {
    if (!csv.trim()) return showError("Lipește conținutul CSV.");
    setBusy(true);
    try {
      const res = await pcApi.people.import.preview(csv);
      setPreview(res);
      setPhase("preview");
    } catch (e) {
      showError(e?.message || "Nu s-a putut citi CSV-ul.");
    } finally {
      setBusy(false);
    }
  };

  const doCommit = async () => {
    setBusy(true);
    try {
      const res = await pcApi.people.import.commit(preview.importId);
      setResult(res);
      setPhase("done");
      showSuccess(`Import gata: ${res.created} create, ${res.updated} actualizate`);
    } catch (e) {
      showError(e?.message || "Nu s-a putut finaliza importul.");
    } finally {
      setBusy(false);
    }
  };

  const doUndo = () => {
    showConfirm(
      "Anulează importul",
      "Ștergi persoanele create de acest import? (reversibil 48h)",
      async () => {
        setBusy(true);
        try {
          const res = await pcApi.people.import.undo(preview.importId);
          showSuccess(`Anulat: ${res.removed} persoane eliminate`);
          navigation.goBack();
        } catch (e) {
          showError(e?.message || "Nu s-a putut anula.");
        } finally {
          setBusy(false);
        }
      }
    );
  };

  const S = preview?.summary;

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={26} color={pcColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Import CSV</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {phase === "input" && (
          <>
            <Text style={styles.hint}>
              Lipește conținutul fișierului CSV (cu antet). Coloane recunoscute: first_name, last_name,
              email, mobile_phone, birthdate, gender, household_name, membership_type, remote_id, notes…
              (template: people_import_template.csv). Potrivirea e automată după antet.
            </Text>
            <TextInput
              style={styles.textarea}
              value={csv}
              onChangeText={setCsv}
              placeholder={"first_name,last_name,email\nAna,Pop,ana@exemplu.ro"}
              placeholderTextColor={pcColors.textMuted}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.fileSeam} disabled>
              <Ionicons name="document-attach-outline" size={18} color={pcColors.textMuted} />
              <Text style={styles.fileSeamTxt}>Alege fișier (în curând — necesită update de app)</Text>
            </Pressable>
            <PcButton title="Previzualizează" onPress={doPreview} loading={busy} block style={{ marginTop: 18 }} />
          </>
        )}

        {phase === "preview" && S && (
          <>
            <Text style={styles.previewTitle}>Previzualizare ({S.total} rânduri)</Text>
            <View style={styles.statsRow}>
              <Stat label="Create" value={S.create} color={pcColors.primary} />
              <Stat label="Actualizate" value={S.update} color={pcColors.textPrimary} />
              <Stat label="Erori" value={S.errors} color={S.errors ? pcColors.orange : pcColors.textMuted} />
            </View>

            <Text style={styles.sectionLabel}>Exemple</Text>
            {preview.sample.map((r) => (
              <View key={r.row} style={styles.sampleRow}>
                <Ionicons
                  name={r.action === "create" ? "add-circle-outline" : r.action === "update" ? "sync-outline" : "alert-circle-outline"}
                  size={18}
                  color={r.action === "error" ? pcColors.orange : pcColors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sampleName}>{r.name || "(fără nume)"}</Text>
                  {!!r.email && <Text style={styles.sampleSub}>{r.email}</Text>}
                  {r.errors?.length ? <Text style={styles.sampleErr}>{r.errors.join(" · ")}</Text> : null}
                </View>
                <Text style={styles.sampleAction}>{r.action}</Text>
              </View>
            ))}

            {S.errors > 0 && (
              <PcCard style={{ marginTop: 16, borderWidth: 1, borderColor: pcColors.orange }}>
                <Text style={{ color: pcColors.orange, fontWeight: "700" }}>{S.errors} rânduri cu erori</Text>
                <Text style={styles.hint}>Rândurile cu erori sunt sărite automat la import. Corectează-le și reimportă.</Text>
              </PcCard>
            )}

            <View style={styles.actionsRow}>
              <PcButton title="Înapoi" variant="ghost" onPress={() => setPhase("input")} style={{ flex: 1 }} />
              <PcButton title={`Importă ${S.create + S.update}`} onPress={doCommit} loading={busy} style={{ flex: 1 }} />
            </View>
          </>
        )}

        {phase === "done" && result && (
          <View style={{ alignItems: "center", paddingTop: 20 }}>
            <Ionicons name="checkmark-circle" size={56} color={pcColors.primary} />
            <Text style={styles.doneTitle}>Import finalizat</Text>
            <Text style={styles.doneSub}>{result.created} create · {result.updated} actualizate</Text>
            <PcButton title="Gata" onPress={() => navigation.goBack()} block style={{ marginTop: 24 }} />
            <PcButton title="Anulează importul (48h)" variant="danger" onPress={doUndo} loading={busy} block style={{ marginTop: 12 }} />
          </View>
        )}
      </ScrollView>
    </PcScreen>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", marginLeft: 12 },
  hint: { color: pcColors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  textarea: { color: pcColors.textPrimary, fontSize: 14, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, padding: 12, minHeight: 180, fontFamily: "monospace" },
  fileSeam: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, opacity: 0.6 },
  fileSeamTxt: { color: pcColors.textMuted, fontSize: 13 },
  previewTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 14 },
  statsRow: { flexDirection: "row", gap: 12 },
  stat: { flex: 1, backgroundColor: pcColors.card, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  statVal: { fontSize: 24, fontWeight: "800" },
  statLabel: { color: pcColors.textSecondary, fontSize: 12, marginTop: 4 },
  sectionLabel: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "700", marginTop: 20, marginBottom: 8 },
  sampleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  sampleName: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "600" },
  sampleSub: { color: pcColors.textSecondary, fontSize: 13 },
  sampleErr: { color: pcColors.orange, fontSize: 12, marginTop: 2 },
  sampleAction: { color: pcColors.textMuted, fontSize: 12, fontWeight: "700" },
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  doneTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", marginTop: 14 },
  doneSub: { color: pcColors.textSecondary, fontSize: 15, marginTop: 6 },
});

export default ImportScreen;
