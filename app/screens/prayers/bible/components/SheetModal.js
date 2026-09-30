import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./BibleIcons";

// Bottom sheet reutilizat de toate pickerele. `onBack` afiseaza un icon de back
// (drill-down) in locul titlului.
export const SheetModal = ({
  visible,
  title,
  onClose,
  onBack,
  iconColor = "#888",
  st,
  children,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={st.overlay}>
          <TouchableWithoutFeedback>
            <View style={[st.sheet, { paddingBottom: insets.bottom + 12 }]}>
              <View style={st.handle} />
              <View style={st.sheetHeader}>
                <View style={st.sheetHeaderLeft}>
                  {onBack ? (
                    <TouchableOpacity onPress={onBack} accessibilityLabel="Înapoi">
                      <Icon name="back" size={22} color={iconColor} />
                    </TouchableOpacity>
                  ) : null}
                  {title ? <Text style={st.sheetTitle}>{title}</Text> : null}
                </View>
                <TouchableOpacity onPress={onClose} accessibilityLabel="Închide">
                  <Text style={st.sheetClose}>✕</Text>
                </TouchableOpacity>
              </View>
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
