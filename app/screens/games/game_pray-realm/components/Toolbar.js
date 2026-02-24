import React from "react";
import { View, Image, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SCREEN_WIDTH } from "../constants/dimensions";
import { GameImages, ToolImages } from "../assets";
import { TOOL_TYPES } from "../data/shopItems";
import { DraggableItem } from "../../../../global/components/DragAndDrop";

/**
 * Toolbar Component - Bara de unelte din joc
 *
 * Folosește toolbar.png ca fundal și plasează iconițele în sloturi
 * Shield și Sword sunt draggable pentru a fi puse pe avatar
 * Toate dimensiunile sunt în procente pentru responsivitate
 */
const Toolbar = ({
  inventory = {},
  onBackpackPress,
  onDragStart,
  onDragEnd,
}) => {
  // ========== DIMENSIUNI RESPONSIVE (PROCENTE) ==========
  // Toolbar: 110% din lățimea ecranului (+10%), aspect ratio păstrat
  const TOOLBAR_WIDTH_PERCENT = 1.3;
  const TOOLBAR_ASPECT_RATIO = 2.5;

  const toolbarWidth = SCREEN_WIDTH * TOOLBAR_WIDTH_PERCENT;
  const toolbarHeight = toolbarWidth / TOOLBAR_ASPECT_RATIO;

  // ========== POZIȚII SLOTURI (PROCENTE DIN TOOLBAR) ==========
  // Pozițiile sunt RELATIVE la toolbar container, nu la ecran
  // Astfel rămân fixe indiferent unde e mutat toolbar-ul
  const SLOT_START_X_PERCENT = 0.414; // +1.4% de la 40% original
  const SLOT_WIDTH_PERCENT = 0.14; // Lățimea fiecărui slot
  const SLOT_GAP_PERCENT = 0.012; // Gap între sloturi
  const SLOT_Y_PERCENT = 0.104; // -3.6% de la 14% original (mai sus)
  const SLOT_HEIGHT_PERCENT = 0.65; // Înălțimea slotului

  // ========== BACKPACK TOUCH AREA (PROCENTE) ==========
  const BACKPACK_WIDTH_PERCENT = 0.38;
  const BACKPACK_HEIGHT_PERCENT = 1.0;

  // ========== ICON SIZE (PROCENTE DIN SLOT) ==========
  const ICON_SIZE_PERCENT = 0.78;

  // ========== BADGE POSITION (PROCENTE DIN ICON) ==========
  const BADGE_RIGHT_PERCENT = -0.05;
  const BADGE_TOP_PERCENT = 0.15; // Mutat mult mai jos - să intre pe iconița
  const BADGE_SIZE_PERCENT = 0.38;

  // Obține cantitățile din inventar
  const tools = inventory.tools || {};
  const hammerCount = tools[TOOL_TYPES.HAMMER] || 0;
  const shieldCount = tools[TOOL_TYPES.SHIELD] || 0;
  const swordCount = tools[TOOL_TYPES.SWORD] || 0;

  // Configurare sloturi: [toolType, image, count]
  const slots = [
    { type: TOOL_TYPES.HAMMER, image: ToolImages.hammer, count: hammerCount },
    { type: TOOL_TYPES.SHIELD, image: ToolImages.shield, count: shieldCount },
    {
      type: TOOL_TYPES.SWORD,
      image: GameImages.swordToolbar,
      count: swordCount,
    },
  ];

  // Calculează dimensiunile în pixeli
  const slotWidth = toolbarWidth * SLOT_WIDTH_PERCENT;
  const slotHeight = toolbarHeight * SLOT_HEIGHT_PERCENT;
  const iconSize = slotWidth * ICON_SIZE_PERCENT;
  const badgeSize = slotWidth * BADGE_SIZE_PERCENT;

  return (
    <View
      style={[styles.container, { width: toolbarWidth, height: toolbarHeight }]}
    >
      {/* Toolbar Background Image */}
      <Image
        source={GameImages.toolbar}
        style={styles.toolbarImage}
        resizeMode="contain"
      />

      {/* Backpack Touch Area (partea stângă din imagine) */}
      <TouchableOpacity
        style={[
          styles.backpackTouchArea,
          {
            width: toolbarWidth * BACKPACK_WIDTH_PERCENT,
            height: toolbarHeight * BACKPACK_HEIGHT_PERCENT,
          },
        ]}
        onPress={onBackpackPress}
        activeOpacity={0.7}
      />

      {/* Sloturi cu iconițe și badge-uri */}
      {slots.map((slot, index) => {
        const slotX =
          toolbarWidth *
          (SLOT_START_X_PERCENT +
            index * (SLOT_WIDTH_PERCENT + SLOT_GAP_PERCENT));
        const slotY = toolbarHeight * SLOT_Y_PERCENT;

        // Shield și Sword sunt draggable
        const isDraggable =
          slot.type === TOOL_TYPES.SHIELD || slot.type === TOOL_TYPES.SWORD;
        const dragItem = { type: slot.type, id: `${slot.type}_toolbar` };

        const iconContent = (
          <>
            {/* Iconița tool-ului (doar dacă există în inventar) */}
            {slot.count > 0 && (
              <Image
                source={slot.image}
                style={[
                  styles.slotIcon,
                  {
                    width: iconSize,
                    height: iconSize,
                  },
                ]}
                resizeMode="contain"
              />
            )}

            {/* Badge cu numărul (doar dacă există în inventar) */}
            {slot.count > 0 && (
              <View
                style={[
                  styles.badge,
                  {
                    right: slotWidth * BADGE_RIGHT_PERCENT,
                    top: slotHeight * BADGE_TOP_PERCENT,
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: badgeSize / 2,
                  },
                ]}
              >
                <Text
                  style={[styles.badgeText, { fontSize: badgeSize * 0.55 }]}
                >
                  {slot.count}
                </Text>
              </View>
            )}
          </>
        );

        return (
          <View
            key={slot.type}
            style={[
              styles.slotContainer,
              {
                left: slotX,
                top: slotY,
                width: slotWidth,
                height: slotHeight,
              },
            ]}
          >
            {isDraggable && slot.count > 0 ? (
              <DraggableItem
                item={dragItem}
                disabled={slot.count <= 0}
                onDragStart={(item) => onDragStart?.(item)}
                onDragEnd={(item, dropResult) => onDragEnd?.(item, dropResult)}
                style={styles.draggableWrapper}
              >
                {iconContent}
              </DraggableItem>
            ) : (
              iconContent
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  toolbarImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  backpackTouchArea: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 10,
  },
  slotContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  slotIcon: {
    // Dimensiuni setate dinamic
  },
  draggableWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    backgroundColor: "#f5e6c8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#8b7355",
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  badgeText: {
    color: "#5a4a3a",
    fontWeight: "bold",
  },
});

export default Toolbar;
