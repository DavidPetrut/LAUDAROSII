import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SheetModal } from "./SheetModal";
import { fetchChapter } from "../bibleApi";

// Drill-down: carti -> capitole -> versete (un singur nivel vizibil, cu back).
export const BookPickerSheet = ({
  visible,
  onClose,
  books,
  translation,
  currentBook,
  currentChapter,
  onSelect,
  iconColor,
  st,
}) => {
  const [view, setView] = useState("books"); // books | chapters | verses
  const [selBook, setSelBook] = useState(null);
  const [selChapter, setSelChapter] = useState(null);
  const [verseCount, setVerseCount] = useState(0);
  const [loadingVerses, setLoadingVerses] = useState(false);

  useEffect(() => {
    if (visible) {
      setView("books");
      setSelBook(null);
      setSelChapter(null);
    }
  }, [visible]);

  const openBook = (b) => {
    setSelBook(b);
    setView("chapters");
  };

  const openChapter = async (ch) => {
    setSelChapter(ch);
    setVerseCount(0);
    setLoadingVerses(true);
    setView("verses");
    try {
      const res = await fetchChapter(translation, selBook.bookid, ch);
      setVerseCount((res.verses || []).length);
    } catch (e) {
      setVerseCount(0);
    } finally {
      setLoadingVerses(false);
    }
  };

  const goBack =
    view === "verses"
      ? () => setView("chapters")
      : view === "chapters"
      ? () => setView("books")
      : null;

  const title =
    view === "verses"
      ? `${selBook?.name} ${selChapter}`
      : view === "chapters"
      ? selBook?.name
      : "";

  return (
    <SheetModal
      visible={visible}
      title={title}
      onBack={goBack}
      onClose={onClose}
      iconColor={iconColor}
      st={st}
    >
      <ScrollView contentContainerStyle={st.sheetScroll}>
        {view === "books" &&
          books.map((b) => {
            const isCurrent = b.bookid === currentBook;
            return (
              <TouchableOpacity
                key={b.bookid}
                style={[st.bookRow, isCurrent && st.bookRowActive]}
                onPress={() => openBook(b)}
              >
                <Text style={[st.bookName, isCurrent && st.bookNameActive]}>
                  {b.name}
                </Text>
              </TouchableOpacity>
            );
          })}

        {view === "chapters" && selBook && (
          <View style={st.chapterGrid}>
            {Array.from({ length: selBook.chapters }, (_, i) => i + 1).map((ch) => {
              const active = selBook.bookid === currentBook && ch === currentChapter;
              return (
                <TouchableOpacity
                  key={ch}
                  style={[st.chapterCell, active && st.chapterCellActive]}
                  onPress={() => openChapter(ch)}
                >
                  <Text style={[st.chapterCellTxt, active && st.chapterCellTxtActive]}>
                    {ch}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {view === "verses" &&
          (loadingVerses ? (
            <ActivityIndicator color="#21c063" style={{ marginVertical: 20 }} />
          ) : (
            <View style={st.chapterGrid}>
              {Array.from({ length: verseCount }, (_, i) => i + 1).map((vs) => (
                <TouchableOpacity
                  key={vs}
                  style={st.chapterCell}
                  onPress={() => onSelect(selBook.bookid, selChapter, vs)}
                >
                  <Text style={st.chapterCellTxt}>{vs}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
      </ScrollView>
    </SheetModal>
  );
};
