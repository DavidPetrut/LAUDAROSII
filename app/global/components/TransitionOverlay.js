import React, { useRef, useEffect, useState } from "react";
import { StyleSheet, Animated, Platform, Dimensions } from "react-native";
import { useTransition } from "../context/TransitionContext";

/**
 * TransitionOverlay - Overlay fullscreen pentru video tranziții
 */
const TransitionOverlay = () => {
  const { isPlaying, currentTransition, stopTransition } = useTransition();
  const videoRef = useRef(null);
  const webVideoRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  // Update dimensions on resize
  useEffect(() => {
    const onChange = ({ window }) => setDimensions(window);
    const subscription = Dimensions.addEventListener("change", onChange);
    return () => subscription?.remove();
  }, []);

  // Fade in animation
  useEffect(() => {
    if (isPlaying) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }
  }, [isPlaying]);

  // Handle video end
  const handleVideoEnd = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: Platform.OS !== "web",
    }).start(() => {
      stopTransition();
    });
  };

  // Web video ended handler
  useEffect(() => {
    if (Platform.OS === "web" && webVideoRef.current && isPlaying) {
      const videoEl = webVideoRef.current;
      videoEl.onended = handleVideoEnd;
      videoEl.play().catch(console.warn);
    }
  }, [isPlaying, currentTransition]);

  if (!isPlaying || !currentTransition) {
    return null;
  }

  const scale = currentTransition.scale || 0.65;
  const bgColor = currentTransition.backgroundColor || "#000";

  // ============ WEB RENDER ============
  if (Platform.OS === "web") {
    // Get video URI for web
    let videoUri = "";
    if (currentTransition.video) {
      if (typeof currentTransition.video === "string") {
        videoUri = currentTransition.video;
      } else if (currentTransition.video.uri) {
        videoUri = currentTransition.video.uri;
      } else if (typeof currentTransition.video === "number") {
        // Required asset - get the resolved URI
        const Asset = require("expo-asset").Asset;
        const asset = Asset.fromModule(currentTransition.video);
        videoUri = asset.uri || asset.localUri || "";
      }
    }

    return (
      <Animated.View
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: bgColor,
          zIndex: 99999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          opacity: fadeAnim,
        }}
      >
        <video
          ref={webVideoRef}
          src={videoUri}
          autoPlay
          muted={false}
          playsInline
          style={{
            maxWidth: `${scale * 100}%`,
            maxHeight: `${scale * 100}%`,
            width: "auto",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </Animated.View>
    );
  }

  // Pe nativ tranzitiile video sunt dezactivate (vezi SKIP_VIDEO_ON_NATIVE).
  return null;
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  videoWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TransitionOverlay;
