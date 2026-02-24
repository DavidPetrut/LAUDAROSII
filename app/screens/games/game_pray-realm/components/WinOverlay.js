import React from "react";
import { View, Text, Image, Modal, TouchableOpacity } from "react-native";
import { overlayStyles } from "../styles/overlayStyles";
import { GameImages } from "../assets";

const WinOverlay = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={overlayStyles.overlay}>
        <TouchableOpacity
          style={overlayStyles.modal}
          onPress={onClose}
          activeOpacity={0.9}
        >
          <Text style={overlayStyles.text}>ai castigat nivelul</Text>
          <Image source={GameImages.tree} style={overlayStyles.treeImage} />
          <Image source={GameImages.trophy} style={overlayStyles.trophyImage} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default React.memo(WinOverlay);
