import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { ScreenHeader } from "../../../global/components";
import { TimerOverlay } from "./TimerOverlay";
import { ProgramSelector } from "./ProgramSelector";
import { timerStyles as styles } from "./styles";

const PRESETS = [
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
];

/**
 * Ecran principal Timer pentru sesiuni de rugaciune
 */
export const TimerScreen = ({ navigation }) => {
  const [mins, setMins] = useState(10);
  const [secs, setSecs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentProgram, setCurrentProgram] = useState(null);
  const intervalRef = useRef(null);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleStart = (programData = null) => {
    if (programData) {
      setCurrentProgram(programData);
      setMins(programData.duration);
      setSecs(0);
    }
    setIsRunning(true);
    setElapsed(0);
  };

  const handleStop = () => {
    setIsRunning(false);
    setCurrentProgram(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const totalSeconds = mins * 60 + secs;
  const remaining = totalSeconds - elapsed;

  const adjustMins = (delta) =>
    setMins(Math.max(0, Math.min(99, mins + delta)));
  const adjustSecs = (delta) => {
    const newSecs = secs + delta;
    if (newSecs >= 60) {
      setMins(Math.min(99, mins + 1));
      setSecs(0);
    } else if (newSecs < 0) {
      if (mins > 0) {
        setMins(mins - 1);
        setSecs(55);
      }
    } else {
      setSecs(newSecs);
    }
  };

  const selectPreset = (minutes) => {
    setMins(minutes);
    setSecs(0);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Start Praying" />

      <ScrollView style={styles.content}>
        <View style={styles.timerSetup}>
          <Text style={styles.setupTitle}>Seteaza timpul</Text>

          <View style={styles.timeRow}>
            <View style={styles.timeColumn}>
              <TouchableOpacity
                style={styles.arrowBtn}
                onPress={() => adjustMins(1)}
              >
                <Text style={styles.arrowText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.timeValue}>
                {mins.toString().padStart(2, "0")}
              </Text>
              <TouchableOpacity
                style={styles.arrowBtn}
                onPress={() => adjustMins(-1)}
              >
                <Text style={styles.arrowText}>▼</Text>
              </TouchableOpacity>
              <Text style={styles.timeLabel}>MIN</Text>
            </View>

            <Text style={styles.timeSeparator}>:</Text>

            <View style={styles.timeColumn}>
              <TouchableOpacity
                style={styles.arrowBtn}
                onPress={() => adjustSecs(5)}
              >
                <Text style={styles.arrowText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.timeValue}>
                {secs.toString().padStart(2, "0")}
              </Text>
              <TouchableOpacity
                style={styles.arrowBtn}
                onPress={() => adjustSecs(-5)}
              >
                <Text style={styles.arrowText}>▼</Text>
              </TouchableOpacity>
              <Text style={styles.timeLabel}>SEC</Text>
            </View>
          </View>

          <View style={styles.presetContainer}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.minutes}
                style={[
                  styles.presetBtn,
                  mins === p.minutes && secs === 0 && styles.presetActive,
                ]}
                onPress={() => selectPreset(p.minutes)}
              >
                <Text
                  style={[
                    styles.presetText,
                    mins === p.minutes && secs === 0 && styles.presetTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.startBtn} onPress={() => handleStart()}>
          <Text style={styles.startBtnText}>▶ Începe Rugaciunea</Text>
        </TouchableOpacity>

        <ProgramSelector onStartProgram={handleStart} />
      </ScrollView>

      {isRunning && (
        <TimerOverlay
          timeDisplay={formatTime(remaining > 0 ? remaining : elapsed)}
          onStop={handleStop}
          program={currentProgram}
        />
      )}
    </View>
  );
};
