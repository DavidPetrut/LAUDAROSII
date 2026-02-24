import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BackArrowIcon } from "../../../global/components";
import { api, showError } from "../../../global/functions";
import { ParticipantPicker } from "./ParticipantPicker";
import { prayRoomStyles as styles } from "./styles";

const ROOM_ICON1 = require("../../../public/icons/room_icon1.png");
const ROOM_ICON2 = require("../../../public/icons/room_icon2.png");
const ROOM_ICON3 = require("../../../public/icons/room_icon3.png");

const ROOM_TYPES = [
  { key: "roulette", label: "Pray Roulette", icon: "room_icon1", src: ROOM_ICON1, whoCanPost: "ALL", maxPrayers: 2, colors: ["#3e2a1e", "#301e14"], enabled: true },
  { key: "targeted", label: "Motive Targetate", icon: "room_icon2", src: ROOM_ICON2, whoCanPost: "CREATOR_ONLY", maxPrayers: 10, colors: ["#1e2a3e", "#141e30"], enabled: false },
  { key: "common", label: "Motive Comune", icon: "room_icon3", src: ROOM_ICON3, whoCanPost: "ALL", maxPrayers: 2, colors: ["#1e3a2e", "#142a20"], enabled: false },
];

const DURATIONS = [
  { value: 3, label: "3 Zile" },
  { value: 7, label: "1 Saptamana" },
  { value: 30, label: "1 Luna" },
];

const DAYS = [
  { value: 0, label: "D" }, { value: 1, label: "L" }, { value: 2, label: "M" },
  { value: 3, label: "M" }, { value: 4, label: "J" }, { value: 5, label: "V" },
  { value: 6, label: "S" },
];

const MIN_TIMES = [
  { value: 0, label: "Fara limita" },
  { value: 15, label: "15+ minute" },
  { value: 30, label: "30+ minute" },
];

export const PrayRoomSetup = ({ navigation }) => {
  const [step, setStep] = useState(0);
  const [roomType, setRoomType] = useState(null);
  const [name, setName] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [prayerDays, setPrayerDays] = useState([1, 3, 5]);
  const [minMinutes, setMinMinutes] = useState(0);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [creating, setCreating] = useState(false);

  const isRoulette = roomType === "roulette";

  const toggleDay = (day) => {
    setPrayerDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCreate = async () => {
    if (prayerDays.length === 0) return showError("Selecteaza cel putin o zi");
    if (isRoulette && selectedParticipants.length < 1) {
      return showError("Selecteaza cel putin un participant");
    }
    const t = ROOM_TYPES.find((r) => r.key === roomType);
    setCreating(true);
    try {
      const room = await api.post("/pray-rooms", {
        name: name.trim() || undefined,
        icon: t.icon,
        roomType,
        selectedParticipants: isRoulette ? selectedParticipants : [],
        settings: { durationDays, prayerDays, minMinutes, whoCanPost: t.whoCanPost, maxPrayers: t.maxPrayers },
      });
      navigation.replace("PrayRoomScreen", { roomId: room._id });
    } catch (e) {
      showError(e.response?.data?.error || "Eroare la creare");
    } finally {
      setCreating(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => (step > 0 ? setStep(step - 1) : navigation.goBack());

  // Stepurile difera in functie de tip: roulette are step suplimentar pentru participanti
  const getStepContent = () => {
    const base = [
      { key: "type" },
      { key: "name" },
      { key: "duration" },
      { key: "days" },
      { key: "minTime" },
    ];
    if (isRoulette) {
      base.splice(2, 0, { key: "participants" });
    }
    return base;
  };

  const steps = getStepContent();
  const currentStep = steps[step]?.key;

  const renderStep = () => {
    switch (currentStep) {
      case "type":
        return (
          <View style={styles.typeSelectionContainer}>
            {ROOM_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[styles.typeCardFull, !type.enabled && { opacity: 0.35 }]}
                onPress={() => { if (type.enabled) { setRoomType(type.key); nextStep(); } }}
                activeOpacity={type.enabled ? 0.9 : 1}
                disabled={!type.enabled}
              >
                <LinearGradient colors={type.colors} style={styles.typeGradient}>
                  <Text style={styles.typeLabel}>{type.label.toUpperCase()}</Text>
                  {!type.enabled && <Text style={styles.typeSoon}>In curand</Text>}
                  <Image source={type.src} style={styles.typeIcon} />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        );
      case "name":
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Numele camerei</Text>
            <TextInput style={styles.setupInput} value={name} onChangeText={setName}
              placeholder="Pray Room #123456" placeholderTextColor="#666" maxLength={50} />
            <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
              <Text style={styles.nextBtnText}>Continua</Text>
            </TouchableOpacity>
          </View>
        );
      case "participants":
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Cine poate da join?</Text>
            <ParticipantPicker
              selectedIds={selectedParticipants}
              onSelectionChange={setSelectedParticipants}
            />
            <TouchableOpacity
              style={[styles.nextBtn, selectedParticipants.length < 1 && styles.btnDisabled]}
              onPress={nextStep}
              disabled={selectedParticipants.length < 1}
            >
              <Text style={styles.nextBtnText}>Continua</Text>
            </TouchableOpacity>
          </View>
        );
      case "duration":
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Cat timp sa dureze?</Text>
            <View style={styles.optionsColumn}>
              {DURATIONS.map((d) => (
                <TouchableOpacity key={d.value}
                  style={[styles.optionCard, durationDays === d.value && styles.optionSelected]}
                  onPress={() => setDurationDays(d.value)}>
                  <Text style={styles.optionText}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
              <Text style={styles.nextBtnText}>Continua</Text>
            </TouchableOpacity>
          </View>
        );
      case "days":
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Zilele de rugaciune</Text>
            <View style={styles.daysRow}>
              {DAYS.map((d) => (
                <TouchableOpacity key={d.value}
                  style={[styles.dayBtn, prayerDays.includes(d.value) && styles.daySelected]}
                  onPress={() => toggleDay(d.value)}>
                  <Text style={[styles.dayText, prayerDays.includes(d.value) && styles.dayTextSelected]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
              <Text style={styles.nextBtnText}>Continua</Text>
            </TouchableOpacity>
          </View>
        );
      case "minTime":
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Timp minim de rugaciune</Text>
            <View style={styles.optionsColumn}>
              {MIN_TIMES.map((t) => (
                <TouchableOpacity key={t.value}
                  style={[styles.optionCard, minMinutes === t.value && styles.optionSelected]}
                  onPress={() => setMinMinutes(t.value)}>
                  <Text style={styles.optionText}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.createBtn, creating && styles.btnDisabled]}
              onPress={handleCreate} disabled={creating}>
              <Text style={styles.createBtnText}>{creating ? "Se creeaza..." : "Creeaza camera"}</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.setupContainer}>
      <TouchableOpacity onPress={prevStep} style={styles.setupBackBtnAbs}>
        <BackArrowIcon size={48} light />
      </TouchableOpacity>
      {renderStep()}
    </LinearGradient>
  );
};
