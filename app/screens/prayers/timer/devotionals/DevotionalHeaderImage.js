import React from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { devotionalStyles as styles } from "../devotionalStyles";
import { IMAGE_PRESETS, resolveImage } from "./devotionalImages";

/**
 * Antetul devotionalului: imaginea aleasa ca fundal full-container, cu o bara
 * neagra jos ce contine numele (input alb). Dedesubt: cele 3 poze din app +
 * optiunea de upload din galerie.
 */
export const DevotionalHeaderImage = ({ image, name, onChangeName, onPickImage }) => {
  const source = resolveImage(image);

  const upload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.4,
        base64: true,
      });
      if (!res.canceled && res.assets?.[0]?.base64) {
        onPickImage(`data:image/jpeg;base64,${res.assets[0].base64}`);
      }
    } catch (e) {}
  };

  return (
    <View>
      <ImageBackground source={source || undefined} style={styles.headerImage} imageStyle={styles.headerImageRadius}>
        {!source && (
          <View style={styles.headerImageEmpty}>
            <Ionicons name="image-outline" size={30} color="rgba(255,255,255,0.5)" />
            <Text style={styles.headerImageEmptyText}>Alege o imagine</Text>
          </View>
        )}
        <View style={styles.headerNameBar}>
          <TextInput
            style={styles.headerNameInput}
            value={name}
            onChangeText={onChangeName}
            placeholder="Nume devotional"
            placeholderTextColor="rgba(255,255,255,0.5)"
            maxLength={60}
          />
        </View>
      </ImageBackground>

      <View style={styles.presetRow}>
        {IMAGE_PRESETS.map((p) => {
          const active = image === `preset:${p.key}`;
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.presetThumb, active && styles.presetThumbActive]}
              onPress={() => onPickImage(`preset:${p.key}`)}
              activeOpacity={0.85}
            >
              <Image source={p.source} style={styles.presetThumbImg} />
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.presetUpload} onPress={upload} activeOpacity={0.85}>
          <Ionicons name="cloud-upload-outline" size={22} color="#e5e7eb" />
          <Text style={styles.presetUploadText}>Galerie</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DevotionalHeaderImage;
