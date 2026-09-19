import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { colors } from "../../../../public/styles/global";
import { DevotionalIcon } from "./DevotionalIcon";
import { searchIcons } from "./iconCatalog";

/**
 * Selector de iconite: cautare + categorii, grid frumos. Iconita selectata e
 * evidentiata cu culoarea aleasa. Fara pachet nou (foloseste @expo/vector-icons).
 */
export const IconPicker = ({ visible, color = "#10b981", selected, onSelect, onClose }) => {
  const [query, setQuery] = useState("");
  const groups = searchIcons(query);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={26} color="#e5e7eb" />
          </TouchableOpacity>
          <Text style={styles.pickerTitle}>Alege o iconiță</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Caută (ex: rugăciune, floare, muzică)"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {groups.map((g) => (
            <View key={g.category}>
              <Text style={styles.pickerCategory}>{g.category}</Text>
              <View style={styles.iconGrid}>
                {g.items.map((it) => {
                  const active = selected?.set === it.set && selected?.name === it.name;
                  return (
                    <TouchableOpacity
                      key={`${it.set}:${it.name}`}
                      style={[styles.iconCell, active && { borderColor: color, backgroundColor: color + "22" }]}
                      onPress={() => onSelect(it.set, it.name)}
                      activeOpacity={0.8}
                    >
                      <DevotionalIcon set={it.set} name={it.name} size={26} color={active ? color : "#e5e7eb"} />
                    </TouchableOpacity>
                  );
                })}
              </View>
              {g.items.length === 0 && (
                <Text style={styles.helperNote}>Niciun rezultat pentru „{query}”.</Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default IconPicker;
