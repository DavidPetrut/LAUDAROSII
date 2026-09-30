import React from "react";
import Svg, { Path, Circle, Line } from "react-native-svg";

// Iconite line monocrome (stil YouVersion), desenate cu react-native-svg.
export const Icon = ({ name, size = 24, color = "#fff", strokeWidth = 2 }) => {
  const common = {
    stroke: color,
    strokeWidth,
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "back" && <Path d="M19 12 H5 M11 6 L5 12 L11 18" {...common} />}
      {name === "search" && (
        <>
          <Circle cx="11" cy="11" r="7" {...common} />
          <Line x1="16.5" y1="16.5" x2="21" y2="21" {...common} />
        </>
      )}
      {name === "chevron-left" && <Path d="M15 6 L9 12 L15 18" {...common} />}
      {name === "chevron-right" && <Path d="M9 6 L15 12 L9 18" {...common} />}
      {name === "chevron-down" && <Path d="M6 9 L12 15 L18 9" {...common} />}
      {name === "play" && <Path d="M7 5 L19 12 L7 19 Z" fill={color} stroke={color} strokeLinejoin="round" strokeWidth={strokeWidth} />}
      {name === "pause" && (
        <>
          <Path d="M8 5 V19" {...common} strokeWidth={3} />
          <Path d="M16 5 V19" {...common} strokeWidth={3} />
        </>
      )}
    </Svg>
  );
};
