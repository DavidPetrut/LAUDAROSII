import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { fetchBooks, fetchChapter } from "../../bible/bibleApi";
import { FALLBACK_TRANSLATIONS, GROUP_LABELS } from "../../bible/constants";

const ACCENT = "#10b981";
const GROUP_ORDER = ["ro", "en", "orig"];

// Eticheta pasajului pentru afisare (ex: "Ioan 1:1-14" / "Ioan 1").
export const formatPassage = (b) => {
  if (!b?.enabled || !b.book || !b.chapter) return "";
  const base = `${b.bookName || ""} ${b.chapter}`.trim();
  if (b.verseStart && b.verseEnd && b.verseEnd !== b.verseStart)
    return `${base}:${b.verseStart}-${b.verseEnd}`;
  if (b.verseStart) return `${base}:${b.verseStart}`;
  return base;
};

// Alege pasajul biblic al unui moment: traducere -> carte -> capitol -> interval versete.
export const BiblePassagePicker = ({ visible, initial, onSave, onClose }) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState("translation");
  const [translation, setTranslation] = useState("VDCL");
  const [books, setBooks] = useState([]);
  const [book, setBook] = useState(null);
  const [bookName, setBookName] = useState("");
  const [chapters, setChapters] = useState(0);
  const [chapter, setChapter] = useState(null);
  const [verseCount, setVerseCount] = useState(0);
  const [verseStart, setVerseStart] = useState(null);
  const [verseEnd, setVerseEnd] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTranslation(initial?.translation || "VDCL");
    setBook(initial?.book || null);
    setBookName(initial?.bookName || "");
    setChapter(initial?.chapter || null);
    setVerseStart(initial?.verseStart || null);
    setVerseEnd(initial?.verseEnd || null);
    setStep("translation");
  }, [visible]);

  const loadBooks = async (t) => {
    setLoading(true);
    try {
      const res = await fetchBooks(t);
      setBooks(res.books || []);
    } catch (e) {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const pickTranslation = (t) => {
    setTranslation(t);
    loadBooks(t);
    setStep("book");
  };

  const pickBook = (b) => {
    setBook(b.bookid);
    setBookName(b.name);
    setChapters(b.chapters);
    setStep("chapter");
  };

  const pickChapter = async (ch) => {
    setChapter(ch);
    setVerseStart(null);
    setVerseEnd(null);
    setLoading(true);
    setStep("verse");
    try {
      const res = await fetchChapter(translation, book, ch);
      setVerseCount((res.verses || []).length);
    } catch (e) {
      setVerseCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Prima atingere fixeaza inceputul; a doua (>=) fixeaza finalul intervalului.
  const pickVerse = (v) => {
    if (verseStart == null || (verseStart != null && verseEnd != null)) {
      setVerseStart(v);
      setVerseEnd(null);
    } else {
      if (v < verseStart) {
        setVerseStart(v);
      } else {
        setVerseEnd(v);
      }
    }
  };

  const save = (wholeChapter) => {
    onSave({
      enabled: true,
      translation,
      book,
      bookName,
      chapter,
      verseStart: wholeChapter ? null : verseStart,
      verseEnd: wholeChapter ? null : verseEnd,
    });
  };

  const back = () => {
    if (step === "book") setStep("translation");
    else if (step === "chapter") setStep("book");
    else if (step === "verse") setStep("chapter");
  };

  const selLabel = () => {
    if (step === "translation") return "Traducere";
    if (step === "book") return translation;
    if (step === "chapter") return bookName;
    return `${bookName} ${chapter}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: "86%" }]}>
          <View style={styles.sheetHandle} />

          <View style={grid.header}>
            {step !== "translation" ? (
              <TouchableOpacity style={grid.back} onPress={back}>
                <Ionicons name="chevron-back" size={22} color="rgba(229,231,235,0.8)" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 22 }} />
            )}
            <Text style={styles.sheetTitle}>{selLabel()}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="rgba(229,231,235,0.8)" />
            </TouchableOpacity>
          </View>

          {loading && <ActivityIndicator color={ACCENT} style={{ marginVertical: 16 }} />}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {step === "translation" &&
              GROUP_ORDER.map((g) => {
                const items = FALLBACK_TRANSLATIONS.filter((t) => t.group === g);
                if (!items.length) return null;
                return (
                  <View key={g}>
                    <Text style={grid.groupLabel}>{GROUP_LABELS[g]}</Text>
                    {items.map((t) => (
                      <TouchableOpacity key={t.code} style={grid.row} onPress={() => pickTranslation(t.code)}>
                        <Text style={grid.rowTxt}>{t.code} · {t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}

            {step === "book" &&
              !loading &&
              books.map((b) => (
                <TouchableOpacity key={b.bookid} style={grid.row} onPress={() => pickBook(b)}>
                  <Text style={grid.rowTxt}>{b.name}</Text>
                </TouchableOpacity>
              ))}

            {step === "chapter" && (
              <View style={grid.wrap}>
                {Array.from({ length: chapters }, (_, i) => i + 1).map((ch) => (
                  <TouchableOpacity
                    key={ch}
                    style={[grid.cell, chapter === ch && grid.cellActive]}
                    onPress={() => pickChapter(ch)}
                  >
                    <Text style={[grid.cellTxt, chapter === ch && grid.cellTxtActive]}>{ch}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {step === "verse" && !loading && (
              <>
                <Text style={grid.hint}>
                  {verseStart == null
                    ? "Alege primul verset (sau tot capitolul)."
                    : verseEnd == null
                    ? `De la versetul ${verseStart}. Alege finalul (opțional).`
                    : `Selectat: ${verseStart}-${verseEnd}`}
                </Text>
                <View style={grid.wrap}>
                  {Array.from({ length: verseCount }, (_, i) => i + 1).map((v) => {
                    const inRange =
                      verseStart != null &&
                      ((verseEnd == null && v === verseStart) ||
                        (verseEnd != null && v >= verseStart && v <= verseEnd));
                    return (
                      <TouchableOpacity
                        key={v}
                        style={[grid.cell, inRange && grid.cellActive]}
                        onPress={() => pickVerse(v)}
                      >
                        <Text style={[grid.cellTxt, inRange && grid.cellTxtActive]}>{v}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          {step === "verse" && !loading && (
            <View style={grid.actions}>
              <TouchableOpacity style={grid.secondaryBtn} onPress={() => save(true)}>
                <Text style={grid.secondaryTxt}>Tot capitolul</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.startBtn, { flex: 1 }, verseStart == null && styles.startBtnDisabled]}
                onPress={() => save(false)}
                disabled={verseStart == null}
              >
                <Text style={styles.startBtnText}>Salvează pasajul</Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const grid = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  back: { padding: 2 },
  groupLabel: {
    color: "rgba(229,231,235,0.5)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 4,
  },
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.08)" },
  rowTxt: { color: "#e5e7eb", fontSize: 16, fontWeight: "600" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 8 },
  cell: { width: 52, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  cellActive: { backgroundColor: ACCENT },
  cellTxt: { color: "#e5e7eb", fontWeight: "700", fontSize: 16 },
  cellTxtActive: { color: "#fff" },
  hint: { color: "rgba(229,231,235,0.7)", fontSize: 13, paddingVertical: 8 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  secondaryBtn: { paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)" },
  secondaryTxt: { color: "#e5e7eb", fontWeight: "700", fontSize: 14 },
});

export default BiblePassagePicker;
