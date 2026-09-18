import React from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import { devotionalStyles as styles } from "../devotionalStyles";

const ACCENT = "#10b981";
const H = 140;
const BAR_MAX = 100;

/**
 * Chart simplu cu bare pentru scorul saptamanal (0-100%). Fara librarii de chart:
 * doar react-native-svg (deja in proiect). Arata progresia intentionalitatii.
 */
export const ProgressChart = ({ weeks = [], width = 300 }) => {
  if (!weeks.length) {
    return <Text style={styles.helperNote}>Încă nu ai săptămâni de arătat.</Text>;
  }

  const pad = 24;
  const usableW = Math.max(width - pad * 2, 40);
  const slot = usableW / weeks.length;
  const barW = Math.min(slot * 0.5, 28);

  return (
    <View>
      <Svg width={width} height={H + 24}>
        <Line x1={pad} y1={H} x2={width - pad} y2={H} stroke="#e2e8f0" strokeWidth={1} />
        {weeks.map((w, i) => {
          const val = Math.max(0, Math.min(BAR_MAX, w.score));
          const barH = (val / BAR_MAX) * (H - 10);
          const x = pad + slot * i + (slot - barW) / 2;
          const y = H - barH;
          return (
            <React.Fragment key={w.index}>
              <Rect x={x} y={y} width={barW} height={barH} rx={4} fill={ACCENT} opacity={w.isCurrent ? 1 : 0.55} />
              <SvgText x={x + barW / 2} y={H + 16} fontSize={10} fill="#94a3b8" textAnchor="middle">
                S{w.index}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

export default ProgressChart;
