import React, { useState, useCallback } from "react";
import { Animated, View, Image, StyleSheet } from "react-native";
import { AVATAR_SIZE, SCREEN_WIDTH, rem } from "../constants/dimensions";
import { DropZone } from "../../../../global/components/DragAndDrop";
import { TOOL_TYPES } from "../data/shopItems";
import AuraEffect from "./AuraEffect";
import BuffIndicators from "./BuffIndicators";

/**
 * AvatarWithBuffs - Avatar îmbunătățit cu aură și indicatori pentru buff-uri
 * Include DropZone pentru a primi shield/sword
 */

// Wrapper component care expune triggerAuraExplosion
const AvatarWithBuffsWithRef = React.forwardRef((props, ref) => {
  const [isExploding, setIsExploding] = useState(false);
  const translateY = Animated.subtract(props.avatarY, props.cameraY);

  const triggerAuraExplosion = useCallback(() => {
    setIsExploding(true);
  }, []);

  const handleExplosionComplete = useCallback(() => {
    setIsExploding(false);
    props.onAuraExplode?.();
  }, [props.onAuraExplode]);

  // Expune metoda pentru exterior
  React.useImperativeHandle(ref, () => ({
    triggerAuraExplosion,
  }));

  const showAura = props.hasShield || props.hasSword;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      {/* DropZone pentru a primi shield/sword - doar pe suprafața avatarului */}
      <DropZone
        id="avatar-drop-zone"
        acceptTypes={[TOOL_TYPES.SHIELD, TOOL_TYPES.SWORD]}
        style={styles.dropZone}
      >
        {/* Aura Effect - în spatele avatarului */}
        <AuraEffect
          visible={showAura && !isExploding}
          isExploding={isExploding}
          onExplode={handleExplosionComplete}
          color={
            props.hasSword
              ? "rgba(255, 200, 100, 0.6)"
              : "rgba(100, 180, 255, 0.6)"
          }
        />

        {/* Avatar Image */}
        <View style={styles.imageWrapper}>
          <Image source={props.avatarImage} style={styles.image} />
        </View>

        {/* Buff Indicators - în colțul dreapta-jos */}
        <BuffIndicators hasShield={props.hasShield} hasSword={props.hasSword} />
      </DropZone>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    left: (SCREEN_WIDTH - AVATAR_SIZE) / 2,
    top: 0,
    zIndex: 100,
  },
  dropZone: {
    width: "100%",
    height: "100%",
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    borderRadius: AVATAR_SIZE / 2,
    overflow: "hidden",
    borderWidth: rem(3),
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: rem(2) },
    shadowOpacity: 0.3,
    shadowRadius: rem(4),
    elevation: 5,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: AVATAR_SIZE / 2,
  },
});

export default AvatarWithBuffsWithRef;
