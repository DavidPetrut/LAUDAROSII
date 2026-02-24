import React from "react";
import { View, ImageBackground, StyleSheet, Platform } from "react-native";

/**
 * TiledBackground - Componenta pentru background cu tile-uri repetate
 *
 * @param {object} tileSource - Imaginea care se repeta (pentru dark mode)
 * @param {object} solidSource - Imaginea solida (pentru light mode)
 * @param {boolean} useTiled - Daca true, foloseste tile-uri; daca false, ImageBackground normal
 * @param {string} solidResizeMode - resizeMode pentru imaginea solida (default: "cover")
 * @param {object} style - Stiluri pentru container
 * @param {string} backgroundColor - Culoarea de fundal pentru spatiile dintre tile-uri
 * @param {ReactNode} children - Continutul componentei
 */
const TiledBackground = ({
  tileSource,
  solidSource,
  useTiled = true,
  solidResizeMode = "cover",
  backgroundColor = "#0f0d0d",
  children,
  style,
}) => {
  // Pentru light mode sau non-tiled, foloseste ImageBackground normal
  if (!useTiled && solidSource) {
    return (
      <ImageBackground
        source={solidSource}
        style={[styles.container, style]}
        resizeMode={solidResizeMode}
      >
        {children}
      </ImageBackground>
    );
  }

  // Pe web, folosim CSS nativ pentru repeat
  if (Platform.OS === "web") {
    // Stiluri CSS web native pentru background-repeat
    const webImageStyle = {
      backgroundRepeat: "repeat",
      backgroundSize: "auto",
      backgroundPosition: "top left",
    };

    return (
      <View style={[styles.container, style, { backgroundColor }]}>
        <ImageBackground
          source={tileSource}
          style={styles.webTiledBg}
          imageStyle={webImageStyle}
        >
          {children}
        </ImageBackground>
      </View>
    );
  }

  // Pe native, folosim ImageBackground cu repeat
  return (
    <ImageBackground
      source={tileSource}
      style={[styles.container, style, { backgroundColor }]}
      resizeMode="repeat"
    >
      {children}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webTiledBg: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});

export default TiledBackground;
