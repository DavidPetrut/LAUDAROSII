import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { useTheme, useImmersive } from "../../../global/context";
import { showSuccess, showError } from "../../../global/functions";
import { spacing } from "../../../public/styles/global";
import { makeStyles } from "./styles";
import {
  FALLBACK_TRANSLATIONS,
  DEFAULTS,
  FONT_MIN,
  FONT_MAX,
  FONT_STEP,
} from "./constants";
import {
  fetchTranslations,
  fetchBooks,
  fetchChapter,
  fetchVerse,
  stripHtml,
  loadSettings,
  savePrimary,
  saveCompare,
  saveFontScale,
  savePosition,
} from "./bibleApi";
import {
  BookPickerSheet,
  VersionPickerSheet,
  DisplaySheet,
  VerseActionSheet,
  StrongsVerseSheet,
  VerseNotesSheet,
  Icon,
} from "./components";
import { useBibleAudio } from "./useBibleAudio";

const clampFont = (v) => Math.min(FONT_MAX, Math.max(FONT_MIN, v));

// Cifre superscript (raise real, cu font de sistem - garantat pe iOS/Android).
const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const toSup = (n) => String(n).split("").map((d) => SUP[d] || d).join("");

export const BibleReaderScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const { setImmersive } = useImmersive();
  const insets = useSafeAreaInsets();
  const iconColor = isDarkMode ? "#e6e7e9" : "#1e293b";
  const bgColor = isDarkMode ? "#121212" : "#ffffff";

  const [translations, setTranslations] = useState(FALLBACK_TRANSLATIONS);
  const [books, setBooks] = useState([]);
  const [primary, setPrimary] = useState(DEFAULTS.primary);
  const [compare, setCompare] = useState(DEFAULTS.compare);
  const [fontScale, setFontScale] = useState(DEFAULTS.fontScale);
  const [position, setPosition] = useState(DEFAULTS.position);

  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [showBooks, setShowBooks] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showDisplay, setShowDisplay] = useState(false);
  const [activeVerse, setActiveVerse] = useState(null);
  const [compareBlocks, setCompareBlocks] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [strongsVerse, setStrongsVerse] = useState(null);
  const [notesVerse, setNotesVerse] = useState(null);

  const onFinishedRef = useRef(null);
  const audio = useBibleAudio({ onFinished: () => onFinishedRef.current?.() });

  const [highlightVerse, setHighlightVerse] = useState(null);

  const scrollRef = useRef(null);
  const lastY = useRef(0);
  const chromeHidden = useRef(false);
  const barsAnim = useRef(new Animated.Value(0)).current;
  const versesRef = useRef([]);
  const pendingVerseRef = useRef(null);
  const highlightTimer = useRef(null);
  const scrollViewH = useRef(0);
  const booksRef = useRef([]);
  const chaptersPlayedRef = useRef(0);
  const readingPosRef = useRef({
    t: DEFAULTS.primary,
    book: DEFAULTS.position.book,
    chapter: DEFAULTS.position.chapter,
  });

  useEffect(() => {
    versesRef.current = verses;
  }, [verses]);
  useEffect(() => {
    booksRef.current = books;
  }, [books]);
  const st = useMemo(() => makeStyles(isDarkMode, fontScale), [isDarkMode, fontScale]);

  const topBarH = insets.top + 64;
  // Inaltimea barei de taburi a aplicatiei (oglindeste formula din CustomTabBar),
  // ca sa ancoram containerul de navigare exact deasupra ei.
  const tabBarH = 64 + (insets.bottom > 0 ? insets.bottom : 8);
  // Pe nativ ecranul sta DEASUPRA barei de taburi (offset mic); pe web e SUB ea (adaugam inaltimea).
  const barBottom = Platform.OS === "web" ? tabBarH + 6 : 6;

  // Feedback cand audio nu poate porni (neconfigurat pe server sau eroare).
  useEffect(() => {
    if (audio.state === "error") showError("Audio indisponibil momentan");
  }, [audio.state]);

  // La iesirea din ecran, readu crome-ul aplicatiei si bara telefonului.
  useEffect(
    () => () => {
      setImmersive(false);
      StatusBar.setHidden(false, "fade");
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    []
  );

  // Ascunde/arata barele (app + telefon) pentru citire imersiva.
  const setChrome = (hide) => {
    if (chromeHidden.current === hide) return;
    chromeHidden.current = hide;
    Animated.timing(barsAnim, {
      toValue: hide ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setImmersive(hide);
    StatusBar.setHidden(hide, "fade");
  };

  const onScroll = (e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const y = contentOffset.y;
    const dy = y - lastY.current;
    // La capat (ultimele versete) sau la varf, arata barele ca sa poti schimba capitolul.
    const atBottom = y + layoutMeasurement.height >= contentSize.height - 24;
    if (y <= 6 || atBottom) setChrome(false);
    else if (dy > 8) setChrome(true);
    else if (dy < -8) setChrome(false);
    lastY.current = y;
  };

  const nameOf = (code) =>
    translations.find((t) => t.code === code)?.name || code;

  const bookMeta = books.find((b) => b.bookid === position.book);
  const bookName = bookMeta?.name || "";

  const loadBooksFor = async (translation) => {
    try {
      const res = await fetchBooks(translation);
      setBooks(res.books || []);
    } catch (e) {
      showError("Nu s-au putut încărca cărțile");
    }
  };

  const loadChapter = async (translation, book, chapter) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchChapter(translation, book, chapter);
      setVerses(res.verses || []);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      lastY.current = 0;
      setChrome(false);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setPrimary(s.primary);
      setCompare(s.compare);
      setFontScale(s.fontScale);
      setPosition(s.position);
      try {
        const r = await fetchTranslations();
        setTranslations(r.translations?.length ? r.translations : FALLBACK_TRANSLATIONS);
      } catch (e) {
        setTranslations(FALLBACK_TRANSLATIONS);
      }
      await loadBooksFor(s.primary);
      await loadChapter(s.primary, s.position.book, s.position.chapter);
    })();
  }, []);

  const goTo = (book, chapter) => {
    const next = { book, chapter };
    setPosition(next);
    savePosition(next);
    loadChapter(primary, book, chapter);
  };

  const onSelectVersion = (code) => {
    setShowVersions(false);
    if (code === primary) return;
    stopReading();
    setPrimary(code);
    savePrimary(code);
    loadBooksFor(code);
    loadChapter(code, position.book, position.chapter);
  };

  const onSelectBook = (book, chapter, verse) => {
    setShowBooks(false);
    stopReading();
    pendingVerseRef.current = verse || null;
    goTo(book, chapter);
  };

  const markHighlight = (v) => {
    setHighlightVerse(v);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightVerse(null), 2500);
  };

  // Salt rapid (instant) la versetul ales, aproximat dupa lungimea textului.
  const tryScrollPending = (contentH) => {
    const v = pendingVerseRef.current;
    const list = versesRef.current;
    if (!v || !list.length || !contentH) return;
    const idx = list.findIndex((x) => x.verse === v);
    if (idx < 0) {
      pendingVerseRef.current = null;
      return;
    }
    if (idx === 0) {
      pendingVerseRef.current = null;
      markHighlight(v);
      return;
    }
    const len = (t) => stripHtml(t).length + 1;
    const total = list.reduce((s, x) => s + len(x.text), 0) || 1;
    let before = 0;
    for (let i = 0; i < idx; i++) before += len(list[i].text);
    const maxY = Math.max(0, contentH - scrollViewH.current);
    const y = Math.min(maxY, Math.max(0, (before / total) * contentH - 12));
    scrollRef.current?.scrollTo({ y, animated: false });
    pendingVerseRef.current = null;
    markHighlight(v);
  };

  const bookIndex = books.findIndex((b) => b.bookid === position.book);
  const canPrev = !(bookIndex <= 0 && position.chapter <= 1);
  const canNext = !(
    bookIndex === books.length - 1 &&
    bookMeta &&
    position.chapter >= bookMeta.chapters
  );

  const goPrev = () => {
    stopReading();
    if (position.chapter > 1) return goTo(position.book, position.chapter - 1);
    const prev = books[bookIndex - 1];
    if (prev) goTo(prev.bookid, prev.chapters);
  };

  const goNext = () => {
    stopReading();
    if (bookMeta && position.chapter < bookMeta.chapters)
      return goTo(position.book, position.chapter + 1);
    const next = books[bookIndex + 1];
    if (next) goTo(next.bookid, 1);
  };

  // --- Audio: citire cu auto-advance intre capitole (max 5, pana la oprire manuala) ---
  const MAX_CHAPTERS = 5;

  const nextFrom = (pos) => {
    const list = booksRef.current;
    const idx = list.findIndex((b) => b.bookid === pos.book);
    const meta = list[idx];
    if (meta && pos.chapter < meta.chapters)
      return { book: pos.book, chapter: pos.chapter + 1 };
    const nb = list[idx + 1];
    return nb ? { book: nb.bookid, chapter: 1 } : null;
  };

  const startReading = () => {
    chaptersPlayedRef.current = 1;
    readingPosRef.current = { t: primary, book: position.book, chapter: position.chapter };
    audio.playChapter(primary, position.book, position.chapter);
  };

  const stopReading = () => {
    chaptersPlayedRef.current = 0;
    audio.stop();
  };

  const onPlayToggle = () => {
    if (audio.state === "playing") audio.pause();
    else if (audio.state === "paused") audio.resume();
    else if (audio.state === "idle" || audio.state === "error") startReading();
  };

  // La finalul unui capitol trece automat la urmatorul (folosind ref-uri, fara stale closure).
  onFinishedRef.current = () => {
    if (chaptersPlayedRef.current >= MAX_CHAPTERS) return;
    const cur = readingPosRef.current;
    const np = nextFrom(cur);
    if (!np) return;
    chaptersPlayedRef.current += 1;
    readingPosRef.current = { t: cur.t, book: np.book, chapter: np.chapter };
    goTo(np.book, np.chapter);
    audio.playChapter(cur.t, np.book, np.chapter);
  };

  const onFontDelta = (dir) => {
    const next = clampFont(fontScale + dir * FONT_STEP);
    setFontScale(next);
    saveFontScale(next);
  };

  const onToggleCompare = (code) => {
    const next = compare.includes(code)
      ? compare.filter((c) => c !== code)
      : [...compare, code];
    setCompare(next);
    saveCompare(next);
  };

  const onVersePress = async (v) => {
    const reference = `${bookName} ${position.chapter}:${v.verse}`;
    setActiveVerse({ num: v.verse, reference });
    const base = [{ code: primary, name: nameOf(primary), text: stripHtml(v.text) }];
    setCompareBlocks(base);
    if (!compare.length) return;
    setCompareLoading(true);
    const results = await Promise.all(
      compare.map(async (code) => {
        try {
          const r = await fetchVerse(code, position.book, position.chapter, v.verse);
          const data = r.verse;
          const text = Array.isArray(data) ? data[0]?.text : data?.text;
          return { code, name: nameOf(code), text: stripHtml(text) || "—" };
        } catch (e) {
          return { code, name: nameOf(code), text: "—" };
        }
      })
    );
    setCompareBlocks([...base, ...results]);
    setCompareLoading(false);
  };

  const onStrongs = () => {
    if (!activeVerse) return;
    setStrongsVerse({ reference: activeVerse.reference, verse: activeVerse.num });
    setActiveVerse(null);
  };

  const onNotes = () => {
    if (!activeVerse) return;
    setNotesVerse({ reference: activeVerse.reference, verse: activeVerse.num });
    setActiveVerse(null);
  };

  const onCopy = async () => {
    try {
      const body = compareBlocks.map((b) => `${b.text} (${b.code})`).join("\n");
      await Clipboard.setStringAsync(`${activeVerse.reference}\n${body}`);
      showSuccess("Copiat");
    } catch (e) {
      showError("Nu s-a putut copia");
    }
  };

  const topTranslate = barsAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -topBarH] });
  const bottomTranslate = barsAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 120] });
  const barsOpacity = barsAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <View style={st.screen}>
      <Animated.View
        style={[
          st.topBar,
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            paddingTop: insets.top + spacing.sm,
            transform: [{ translateY: topTranslate }],
            opacity: barsOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={st.iconBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Înapoi"
        >
          <Icon name="back" size={24} color={iconColor} />
        </TouchableOpacity>

        <View style={st.topSpacer} />

        <TouchableOpacity
          style={st.iconBtn}
          onPress={() => setShowBooks(true)}
          accessibilityLabel="Caută carte"
        >
          <Icon name="search" size={22} color={iconColor} />
        </TouchableOpacity>

        <TouchableOpacity
          style={st.iconBtn}
          onPress={() => setShowDisplay(true)}
          accessibilityLabel="Afișare"
        >
          <Text style={st.iconTxt}>Aa</Text>
        </TouchableOpacity>

        <TouchableOpacity style={st.chip} onPress={() => setShowVersions(true)}>
          <Text style={st.chipText}>{primary}</Text>
          <Icon name="chevron-down" size={13} color={iconColor} />
        </TouchableOpacity>
      </Animated.View>

      {loading ? (
        <View style={[st.loadingWrap, { paddingTop: topBarH + 40, flex: 1, backgroundColor: bgColor }]}>
          <ActivityIndicator size="large" color="#21c063" />
        </View>
      ) : error ? (
        <View style={[st.errorWrap, { paddingTop: topBarH + 40, flex: 1, backgroundColor: bgColor }]}>
          <Text style={st.errorText}>
            Nu s-a putut încărca capitolul. Verifică conexiunea.
          </Text>
          <TouchableOpacity
            style={st.retryBtn}
            onPress={() => loadChapter(primary, position.book, position.chapter)}
          >
            <Text style={st.retryTxt}>Reîncearcă</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onLayout={(e) => {
            scrollViewH.current = e.nativeEvent.layout.height;
          }}
          onContentSizeChange={(w, h) => tryScrollPending(h)}
          style={{ flex: 1, backgroundColor: bgColor }}
          contentContainerStyle={[st.readerContent, { paddingTop: topBarH + spacing.sm }]}
        >
          <Text style={st.paragraph}>
            <Text style={st.dropCap}>{position.chapter + "  "}</Text>
            {verses.map((v) => (
              <Text
                key={v.verse}
                onPress={() => onVersePress(v)}
                style={
                  activeVerse?.num === v.verse || highlightVerse === v.verse
                    ? st.verseActive
                    : null
                }
              >
                <Text style={st.verseNum}>{toSup(v.verse)}</Text>
                <Text style={st.verseText}>{" " + stripHtml(v.text) + "  "}</Text>
              </Text>
            ))}
          </Text>
        </ScrollView>
      )}

      <Animated.View
        style={[
          st.bottomBar,
          {
            bottom: barBottom,
            transform: [{ translateY: bottomTranslate }],
            opacity: barsOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={st.playCircle}
          onPress={onPlayToggle}
          accessibilityLabel="Ascultă capitolul"
        >
          {audio.state === "loading" ? (
            <ActivityIndicator size="small" color="#21c063" />
          ) : (
            <Icon
              name={audio.state === "playing" ? "pause" : "play"}
              size={20}
              color={iconColor}
            />
          )}
        </TouchableOpacity>

        <View style={st.switcherPill}>
          <TouchableOpacity
            style={[st.switcherArrow, !canPrev && st.switcherArrowDisabled]}
            onPress={goPrev}
            disabled={!canPrev}
            accessibilityLabel="Capitolul anterior"
          >
            <Icon name="chevron-left" size={22} color={iconColor} />
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowBooks(true)}>
            <Text style={st.switcherTitle} numberOfLines={1}>
              {bookName ? `${bookName} ${position.chapter}` : "…"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.switcherArrow, !canNext && st.switcherArrowDisabled]}
            onPress={goNext}
            disabled={!canNext}
            accessibilityLabel="Capitolul următor"
          >
            <Icon name="chevron-right" size={22} color={iconColor} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <BookPickerSheet
        visible={showBooks}
        onClose={() => setShowBooks(false)}
        books={books}
        translation={primary}
        currentBook={position.book}
        currentChapter={position.chapter}
        onSelect={onSelectBook}
        iconColor={iconColor}
        st={st}
      />
      <VersionPickerSheet
        visible={showVersions}
        onClose={() => setShowVersions(false)}
        translations={translations}
        current={primary}
        onSelect={onSelectVersion}
        st={st}
      />
      <DisplaySheet
        visible={showDisplay}
        onClose={() => setShowDisplay(false)}
        fontScale={fontScale}
        onFontDelta={onFontDelta}
        translations={translations}
        compare={compare}
        primary={primary}
        onToggleCompare={onToggleCompare}
        st={st}
      />
      <VerseActionSheet
        visible={!!activeVerse}
        onClose={() => setActiveVerse(null)}
        reference={activeVerse?.reference || ""}
        blocks={compareBlocks}
        loading={compareLoading}
        onCopy={onCopy}
        onStrongs={onStrongs}
        onNotes={onNotes}
        st={st}
      />
      <StrongsVerseSheet
        visible={!!strongsVerse}
        onClose={() => setStrongsVerse(null)}
        reference={strongsVerse?.reference || ""}
        book={position.book}
        chapter={position.chapter}
        verse={strongsVerse?.verse || 1}
        st={st}
      />
      <VerseNotesSheet
        visible={!!notesVerse}
        onClose={() => setNotesVerse(null)}
        reference={notesVerse?.reference || ""}
        translation={primary}
        book={position.book}
        chapter={position.chapter}
        verse={notesVerse?.verse || 1}
        st={st}
      />
    </View>
  );
};
