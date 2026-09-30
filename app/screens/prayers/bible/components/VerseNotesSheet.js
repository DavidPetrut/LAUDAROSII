import React, { useState, useEffect } from "react";
import { ScrollView, Text, ActivityIndicator } from "react-native";
import { SheetModal } from "./SheetModal";
import { fetchVerse, formatLexicon } from "../bibleApi";

// Note si trimiteri (cross-references) ale unui verset, din campul `comment` al traducerii.
export const VerseNotesSheet = ({
  visible,
  onClose,
  reference,
  translation,
  book,
  chapter,
  verse,
  st,
}) => {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNote("");
    setLoading(true);
    (async () => {
      try {
        const r = await fetchVerse(translation, book, chapter, verse);
        const data = r.verse;
        const obj = Array.isArray(data) ? data[0] : data;
        setNote(formatLexicon(obj?.comment || ""));
      } catch (e) {
        setNote("");
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, translation, book, chapter, verse]);

  return (
    <SheetModal visible={visible} title="Note și trimiteri" onClose={onClose} st={st}>
      <ScrollView contentContainerStyle={st.sheetScroll}>
        <Text style={st.verseRefTitle}>
          {reference} · {translation}
        </Text>
        {loading ? (
          <ActivityIndicator color="#21c063" style={{ marginVertical: 16 }} />
        ) : note ? (
          <Text style={st.defText}>{note}</Text>
        ) : (
          <Text style={st.defEmpty}>Nu există note pentru acest verset.</Text>
        )}
      </ScrollView>
    </SheetModal>
  );
};
