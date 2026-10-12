import React from "react";
import { View, Text, Image } from "react-native";
import { pcColors } from "../theme";

/** Normalizează un avatar: URL http(s), data-URI, sau base64 brut (moștenit din users). */
export function normalizeImage(uri) {
  if (!uri || typeof uri !== "string") return null;
  if (uri.startsWith("http") || uri.startsWith("data:") || uri.startsWith("file:")) return uri;
  if (uri.length > 100) return `data:image/jpeg;base64,${uri}`; // base64 brut moștenit
  return uri;
}

/** Avatar circular: poză dacă există, altfel cerc cu inițiale (ca în PCO). */
export function PcAvatar({ uri, initials = "", size = 44 }) {
  const img = normalizeImage(uri);
  const r = size / 2;
  if (img) {
    return (
      <Image
        source={{ uri: img }}
        style={{ width: size, height: size, borderRadius: r, backgroundColor: pcColors.avatarBg }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: pcColors.avatarBg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "600", fontSize: size * 0.34 }}>
        {(initials || "—").toUpperCase()}
      </Text>
    </View>
  );
}

export default PcAvatar;
