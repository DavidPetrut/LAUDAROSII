/** Chart kit pentru Reports — react-native-svg (deja în proiect). Modern, dark, verde PCO. */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { pcColors, hexToRgba } from "../../theme";

/** Donut cu segmente [{value, color, label}] + text în centru. */
export function DonutChart({ size = 168, strokeWidth = 24, segments = [], centerValue, centerLabel }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={pcColors.input} strokeWidth={strokeWidth} fill="none" />
          {segments.map((s, i) => {
            if (!s.value) return null;
            const len = (s.value / total) * c;
            const el = (
              <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={s.color} strokeWidth={strokeWidth} fill="none"
                strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
            );
            offset += len;
            return el;
          })}
        </G>
      </Svg>
      <View style={styles.donutCenter} pointerEvents="none">
        <Text style={styles.donutValue}>{centerValue}</Text>
        {!!centerLabel && <Text style={styles.donutLabel}>{centerLabel}</Text>}
      </View>
    </View>
  );
}

export function Legend({ items = [] }) {
  return (
    <View style={styles.legend}>
      {items.map((it, i) => (
        <View key={i} style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: it.color }]} />
          <Text style={styles.legendLabel}>{it.label}</Text>
          <Text style={styles.legendValue}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Bare orizontale [{label, value, sub?}] cu fill proporțional. */
export function BarList({ data = [], color = pcColors.primary, max, formatValue }) {
  const maxV = max || Math.max(1, ...data.map((d) => d.value || 0));
  return (
    <View style={{ gap: 10 }}>
      {data.map((d, i) => (
        <View key={i}>
          <View style={styles.barHead}>
            <Text style={styles.barLabel} numberOfLines={1}>{d.label}</Text>
            <Text style={styles.barValue}>{formatValue ? formatValue(d.value) : d.value}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.max(4, (d.value / maxV) * 100)}%`, backgroundColor: d.color || color }]} />
          </View>
          {!!d.sub && <Text style={styles.barSub}>{d.sub}</Text>}
        </View>
      ))}
      {data.length === 0 && <Text style={styles.empty}>Nicio dată.</Text>}
    </View>
  );
}

/** Mini coloane (ex. slujiri/lună): [{label, value}]. */
export function ColumnChart({ data = [], color = pcColors.primary, height = 120 }) {
  const maxV = Math.max(1, ...data.map((d) => d.value || 0));
  return (
    <View>
      <View style={[styles.columns, { height }]}>
        {data.map((d, i) => (
          <View key={i} style={styles.colWrap}>
            <Text style={styles.colValue}>{d.value || ""}</Text>
            <View style={[styles.col, { height: Math.max(3, (d.value / maxV) * (height - 28)), backgroundColor: d.value ? color : pcColors.input }]} />
          </View>
        ))}
      </View>
      <View style={styles.colLabels}>
        {data.map((d, i) => <Text key={i} style={styles.colLabel} numberOfLines={1}>{d.label}</Text>)}
      </View>
      {data.length === 0 && <Text style={styles.empty}>Nicio dată.</Text>}
    </View>
  );
}

/** Card KPI mare. */
export function StatCard({ value, label, color = pcColors.primary, accent }) {
  return (
    <View style={[styles.stat, accent && { borderColor: color, borderWidth: 1, backgroundColor: hexToRgba(color, 0.06) }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  donutCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  donutValue: { color: pcColors.textPrimary, fontSize: 30, fontWeight: "800" },
  donutLabel: { color: pcColors.textMuted, fontSize: 12, marginTop: 2 },
  legend: { gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { color: pcColors.textSecondary, fontSize: 14, flex: 1 },
  legendValue: { color: pcColors.textPrimary, fontSize: 14, fontWeight: "800" },
  barHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  barLabel: { color: pcColors.textPrimary, fontSize: 14, fontWeight: "600", flex: 1, marginRight: 8 },
  barValue: { color: pcColors.textSecondary, fontSize: 13, fontWeight: "700" },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: pcColors.input, overflow: "hidden" },
  barFill: { height: 10, borderRadius: 5 },
  barSub: { color: pcColors.textMuted, fontSize: 12, marginTop: 3 },
  empty: { color: pcColors.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 10 },
  columns: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  colWrap: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  colValue: { color: pcColors.textMuted, fontSize: 10, marginBottom: 3 },
  col: { width: "70%", borderRadius: 4 },
  colLabels: { flexDirection: "row", gap: 6, marginTop: 6 },
  colLabel: { flex: 1, textAlign: "center", color: pcColors.textMuted, fontSize: 9 },
  stat: { flex: 1, minWidth: 90, backgroundColor: pcColors.card, borderRadius: 12, padding: 14, alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { color: pcColors.textMuted, fontSize: 12, marginTop: 4, textAlign: "center" },
});
