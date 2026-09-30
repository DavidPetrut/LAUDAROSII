import React from "react";
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SheetModal } from "./SheetModal";

// Afiseaza versetul atins in versiunea principala + versiunile de comparare, cu optiune de copiere.
export const VerseActionSheet = ({
  visible,
  onClose,
  reference,
  blocks,
  loading,
  onCopy,
  onStrongs,
  onNotes,
  st,
}) => {
  return (
    <SheetModal visible={visible} title="Verset" onClose={onClose} st={st}>
      <ScrollView contentContainerStyle={st.sheetScroll}>
        <Text style={st.verseRefTitle}>{reference}</Text>

        {blocks.map((b) => (
          <View key={b.code} style={st.compareBlock}>
            <Text style={st.compareCode}>
              {b.code} · {b.name}
            </Text>
            <Text style={st.compareText}>{b.text}</Text>
          </View>
        ))}

        {loading && (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator color="#21c063" />
          </View>
        )}

        <TouchableOpacity style={st.actionBtn} onPress={onStrongs}>
          <Text style={st.actionTxt}>🔎  Rădăcina cuvântului</Text>
        </TouchableOpacity>

        <TouchableOpacity style={st.actionBtn} onPress={onNotes}>
          <Text style={st.actionTxt}>📝  Note și trimiteri</Text>
        </TouchableOpacity>

        <TouchableOpacity style={st.actionBtn} onPress={onCopy}>
          <Text style={st.actionTxt}>⧉  Copiază</Text>
        </TouchableOpacity>
      </ScrollView>
    </SheetModal>
  );
};
