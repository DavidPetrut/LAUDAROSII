import React from "react";
import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { SheetModal } from "./SheetModal";
import { FONT_MIN, FONT_MAX } from "../constants";

// Marimea textului + ce versiuni apar la compararea unui verset.
export const DisplaySheet = ({
  visible,
  onClose,
  fontScale,
  onFontDelta,
  translations,
  compare,
  primary,
  onToggleCompare,
  st,
}) => {
  const pct = Math.round(fontScale * 100);
  return (
    <SheetModal visible={visible} title="Afișare" onClose={onClose} st={st}>
      <ScrollView contentContainerStyle={st.sheetScroll}>
        <View style={st.displayRow}>
          <Text style={st.displayLabel}>Mărime text</Text>
          <View style={st.stepper}>
            <TouchableOpacity
              style={st.stepBtn}
              onPress={() => onFontDelta(-1)}
              disabled={fontScale <= FONT_MIN}
              accessibilityLabel="Micșorează textul"
            >
              <Text style={st.stepBtnTxt}>A−</Text>
            </TouchableOpacity>
            <Text style={st.stepValue}>{pct}%</Text>
            <TouchableOpacity
              style={st.stepBtn}
              onPress={() => onFontDelta(1)}
              disabled={fontScale >= FONT_MAX}
              accessibilityLabel="Mărește textul"
            >
              <Text style={st.stepBtnTxt}>A+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={st.groupLabel}>Limbi la comparare</Text>
        <Text style={st.hint}>
          Apasă pe un verset ca să-l vezi în versiunile bifate aici.
        </Text>
        {translations
          .filter((t) => t.code !== primary)
          .map((t) => {
            const on = compare.includes(t.code);
            return (
              <TouchableOpacity
                key={t.code}
                style={st.row}
                onPress={() => onToggleCompare(t.code)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={st.rowTitle}>
                    {t.code} · {t.name}
                  </Text>
                  <Text style={st.rowSub}>{t.lang}</Text>
                </View>
                {on && <Text style={st.rowCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </SheetModal>
  );
};
