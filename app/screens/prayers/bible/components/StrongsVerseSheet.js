import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { SheetModal } from "./SheetModal";
import { STRONG_TAGGED, DEFAULT_LEXICON } from "../constants";
import {
  fetchVerse,
  fetchDictionary,
  parseStrongs,
  formatLexicon,
} from "../bibleApi";

// Prefixul lexiconului: greaca (NT, carte >= 40) sau ebraica (VT).
const prefixFor = (book) => (book >= 40 ? "G" : "H");

// Afiseaza versetul tagat Strong's; la atingerea unui cuvant arata radacina + definitia.
export const StrongsVerseSheet = ({
  visible,
  onClose,
  reference,
  book,
  chapter,
  verse,
  st,
}) => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [entry, setEntry] = useState(null);
  const [defLoading, setDefLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setEntry(null);
    setLoading(true);
    (async () => {
      try {
        const r = await fetchVerse(STRONG_TAGGED, book, chapter, verse);
        const data = r.verse;
        const text = Array.isArray(data) ? data[0]?.text : data?.text;
        setTokens(parseStrongs(text || ""));
      } catch (e) {
        setTokens([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, book, chapter, verse]);

  const onWord = async (strong) => {
    const code = `${prefixFor(book)}${strong}`;
    setSelected(code);
    setEntry(null);
    setDefLoading(true);
    try {
      const r = await fetchDictionary(DEFAULT_LEXICON, code);
      setEntry(r.entry ? formatLexicon(r.entry.definition) : "");
    } catch (e) {
      setEntry("");
    } finally {
      setDefLoading(false);
    }
  };

  return (
    <SheetModal
      visible={visible}
      title="Rădăcina cuvântului"
      onClose={onClose}
      st={st}
    >
      <ScrollView contentContainerStyle={st.sheetScroll}>
        <Text style={st.verseRefTitle}>
          {reference} · {STRONG_TAGGED}
        </Text>

        {loading ? (
          <ActivityIndicator color="#21c063" style={{ marginVertical: 16 }} />
        ) : (
          <Text style={st.strongVerse}>
            {tokens.map((t, i) =>
              t.strong ? (
                <Text
                  key={i}
                  style={st.strongWord}
                  onPress={() => onWord(t.strong)}
                >
                  {t.text}
                </Text>
              ) : (
                <Text key={i}>{t.text}</Text>
              )
            )}
          </Text>
        )}

        <Text style={st.hint}>Apasă pe cuvintele evidențiate.</Text>

        {selected && (
          <View style={st.defPanel}>
            <Text style={st.defCode}>Strong {selected}</Text>
            {defLoading ? (
              <ActivityIndicator color="#21c063" />
            ) : entry ? (
              <Text style={st.defText}>{entry}</Text>
            ) : (
              <Text style={st.defEmpty}>Fără definiție disponibilă.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SheetModal>
  );
};
