import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { GameImages, getToolImage } from "../assets";
import { rem, SCREEN_WIDTH } from "../constants/dimensions";
import { TOOLS_CONFIG } from "../data/shopItems";

/**
 * InventoryScreen - Ecranul Rucsac
 * Afișează inventarul playerului cu inventory.png ca background
 *
 * @param {object} inventory - { tools: { hammer: 2 }, items: {} }
 * @param {number} alabastru - Cantitatea de alabastru a playerului
 * @param {function} onClose - Callback pentru închidere
 */
const InventoryScreen = ({
  inventory = { tools: {}, items: {} },
  alabastru = 0,
  onClose,
}) => {
  // Convertim inventory.tools object în array pentru afișare
  const toolsArray = Object.entries(inventory.tools || {})
    .filter(([_, quantity]) => quantity > 0)
    .map(([toolId, quantity]) => ({
      id: toolId,
      quantity,
      config: TOOLS_CONFIG[toolId],
      image: getToolImage(toolId),
    }));

  // Grid de 9 sloturi (3x3) - 1 pentru alabastru, restul pentru tools
  const SLOTS_COUNT = 9;
  const emptySlots = Math.max(0, SLOTS_COUNT - 1 - toolsArray.length);

  return (
    <View style={styles.container}>
      {/* Background overlay - click to close */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Close button - outside wrapper for better positioning */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Image
          source={GameImages.xButton}
          style={styles.closeIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Inventory Panel */}
      <View style={styles.inventoryWrapper}>
        {/* Inventory background image */}
        <Image
          source={GameImages.inventory}
          style={styles.inventoryImage}
          resizeMode="contain"
        />

        {/* Grid overlay - positioned over the image */}
        <View style={styles.gridOverlay}>
          {/* Slot 1: Alabastru */}
          <View style={styles.slot}>
            <Image
              source={GameImages.alabastru}
              style={styles.itemImage}
              resizeMode="contain"
            />
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>{alabastru}</Text>
            </View>
          </View>

          {/* Sloturi pentru tools */}
          {toolsArray.map((tool) => (
            <View key={tool.id} style={styles.slot}>
              {tool.image && (
                <Image
                  source={tool.image}
                  style={styles.itemImage}
                  resizeMode="contain"
                />
              )}
              <View style={styles.quantityBadge}>
                <Text style={styles.quantityText}>{tool.quantity}</Text>
              </View>
            </View>
          ))}

          {/* Sloturi goale */}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <View key={`empty-${index}`} style={styles.slot} />
          ))}
        </View>
      </View>
    </View>
  );
};

// Full width pentru inventory

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 500,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
  },
  inventoryWrapper: {
    width: "100%",
    position: "relative",
  },
  inventoryImage: {
    width: "100%",
    height: undefined,
    aspectRatio: 1, // Imaginea definește height-ul bazat pe width
  },
  closeButton: {
    position: "absolute",
    top: "17%",
    right: rem(10),
    width: rem(50),
    height: rem(50),
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  closeIcon: {
    width: "100%",
    height: "100%",
  },
  // Grid overlay - poziționat absolut peste imagine în procente
  gridOverlay: {
    position: "absolute",
    top: "40%", // Poziționat în zona căsuțelor din imagine
    left: "12%",
    right: "12%",
    height: "45%", // Înălțimea zonei cu căsuțe
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignContent: "flex-start",
  },
  slot: {
    width: "28%",
    aspectRatio: 1,
    marginHorizontal: "1.5%",
    marginVertical: "1.5%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  itemImage: {
    width: "65%",
    height: "65%",
  },
  quantityBadge: {
    position: "absolute",
    bottom: "8%",
    right: "8%",
    backgroundColor: "rgba(139, 92, 246, 0.95)",
    borderRadius: 100,
    minWidth: "35%",
    paddingVertical: "5%",
    paddingHorizontal: "8%",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  quantityText: {
    color: "#fff",
    fontSize: rem(11),
    fontWeight: "800",
  },
});

export default InventoryScreen;
