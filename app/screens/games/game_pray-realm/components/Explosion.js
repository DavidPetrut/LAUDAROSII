import React, { useState, useEffect, useRef } from "react";
import { Image, StyleSheet, View } from "react-native";

// Smoke animation frames - all preloaded
const SMOKE_FRAMES = [
  require("../assets/smoke animation/smoke_001.png"),
  require("../assets/smoke animation/smoke_002.png"),
  require("../assets/smoke animation/smoke_003.png"),
  require("../assets/smoke animation/smoke_004.png"),
  require("../assets/smoke animation/smoke_005.png"),
  require("../assets/smoke animation/smoke_006.png"),
  require("../assets/smoke animation/smoke_007.png"),
  require("../assets/smoke animation/smoke_008.png"),
  require("../assets/smoke animation/smoke_009.png"),
  require("../assets/smoke animation/smoke_010.png"),
  require("../assets/smoke animation/smoke_011.png"),
  require("../assets/smoke animation/smoke_012.png"),
  require("../assets/smoke animation/smoke_013.png"),
  require("../assets/smoke animation/smoke_014.png"),
  require("../assets/smoke animation/smoke_015.png"),
  require("../assets/smoke animation/smoke_016.png"),
];

const FRAMES_COUNT = 16;
const START_FRAME = 3; // Start from smoke_003.png (index 2) for better animation
const FPS = 20; // Smooth playback
const FRAME_TIME = 1000 / FPS;

/**
 * Explosion Component
 * Plays a smoke animation once and then calls onComplete
 * All frames are pre-rendered stacked, only current frame is visible (opacity trick)
 * This eliminates flickering caused by image loading delays
 *
 * @param {boolean} visible - Whether the explosion should play
 * @param {function} onComplete - Callback when animation finishes
 * @param {number} size - Size of the explosion (default: 300)
 * @param {boolean} loop - Whether to loop the animation (default: false)
 */
const Explosion = ({ visible, onComplete, size = 300, loop = false }) => {
  const [currentFrame, setCurrentFrame] = useState(START_FRAME);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (visible && !isPlaying) {
      // Start animation from frame 3 (index 2)
      setIsPlaying(true);
      setCurrentFrame(START_FRAME);
    } else if (!visible && isPlaying) {
      // Stop animation
      stopAnimation();
    }
  }, [visible, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentFrame((prevFrame) => {
          const nextFrame = prevFrame + 1;

          if (nextFrame >= FRAMES_COUNT) {
            if (loop) {
              // Loop back to start
              return 0;
            } else {
              // Animation complete - clear and call onComplete
              clearInterval(timerRef.current);
              timerRef.current = null;
              setIsPlaying(false);
              // Call onComplete after state updates
              setTimeout(() => {
                onCompleteRef.current?.();
              }, 10);
              return START_FRAME;
            }
          }

          return nextFrame;
        });
      }, FRAME_TIME);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, loop]);

  const stopAnimation = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentFrame(START_FRAME);
  };

  if (!visible && !isPlaying) {
    return null;
  }

  // Render ALL 16 frames stacked on top of each other
  // Only the current frame has opacity 1, rest have opacity 0
  // This prevents flickering because all images are already loaded in memory
  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      pointerEvents="none"
    >
      {SMOKE_FRAMES.map((frame, index) => (
        <Image
          key={index}
          source={frame}
          style={[
            styles.explosionImage,
            {
              width: size,
              height: size,
              opacity: index === currentFrame ? 1 : 0,
            },
          ]}
          resizeMode="contain"
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  explosionImage: {
    position: "absolute",
  },
});

export default React.memo(Explosion);
