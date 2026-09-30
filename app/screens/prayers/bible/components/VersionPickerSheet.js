import React from "react";
import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { SheetModal } from "./SheetModal";
import { GROUP_LABELS } from "../constants";

const GROUP_ORDER = ["ro", "en", "orig"];

// Alege traducerea principala de citire.
export const VersionPickerSheet = ({
  visible,
  onClose,
  translations,
  current,
  onSelect,
  st,
}) => {
  return (
    <SheetModal visible={visible} title="Versiune" onClose={onClose} st={st}>
      <ScrollView contentContainerStyle={st.sheetScroll}>
        {GROUP_ORDER.map((group) => {
          const items = translations.filter((t) => t.group === group);
          if (!items.length) return null;
          return (
            <View key={group}>
              <Text style={st.groupLabel}>{GROUP_LABELS[group]}</Text>
              {items.map((t) => (
                <TouchableOpacity
                  key={t.code}
                  style={st.row}
                  onPress={() => onSelect(t.code)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={st.rowTitle}>
                      {t.code} · {t.name}
                    </Text>
                    <Text style={st.rowSub}>{t.lang}</Text>
                  </View>
                  {current === t.code && <Text style={st.rowCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SheetModal>
  );
};
