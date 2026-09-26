import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Image, Switch } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BackArrowIcon } from "../../../global/components";
import { api, showError } from "../../../global/functions";
import { ParticipantPicker } from "./ParticipantPicker";
import { prayRoomStyles as styles } from "./styles";

const ROOM_ICON1 = require("../../../public/icons/room_icon1.png");
const ROOM_ICON2 = require("../../../public/icons/room_icon2.png");
const ROOM_ICON3 = require("../../../public/icons/room_icon3.png");

// Ordine ceruta: Motive Comune (sus), Motive de Grup, Tragere la Sort (jos)
const ROOM_TYPES = [
  { key: "common", label: "Motive Comune", icon: "room_icon3", src: ROOM_ICON3, colors: ["#1e3a2e", "#142a20"] },
  { key: "targeted", label: "Motive de Grup", icon: "room_icon2", src: ROOM_ICON2, colors: ["#1e2a3e", "#141e30"] },
  { key: "roulette", label: "Tragere la Sort", icon: "room_icon1", src: ROOM_ICON1, colors: ["#3e2a1e", "#301e14"] },
];

const DURATIONS = [
  { value: 1, label: "1 Zi" },
  { value: 7, label: "1 Saptamana" },
  { value: 30, label: "1 Luna" },
  { value: "custom", label: "Personalizat" },
];

export const PrayRoomSetup = ({ navigation }) => {
  const [step, setStep] = useState(0);
  const [roomType, setRoomType] = useState(null);
  const [name, setName] = useState("");
  const [durationChoice, setDurationChoice] = useState(1);
  const [customDays, setCustomDays] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [requireApproval, setRequireApproval] = useState(false);
  const [creating, setCreating] = useState(false);

  const isRoulette = roomType === "roulette";

  const resolveDuration = () => {
    if (durationChoice === "custom") {
      const n = parseInt(customDays, 10);
      return n && n >= 1 ? Math.min(n, 3650) : 0;
    }
    return durationChoice;
  };

  const handleCreate = async () => {
    const durationDays = resolveDuration();
    if (!durationDays) return showError("Alege o durata valida (minim 1 zi)");
    if (isRoulette && selectedParticipants.length < 2) {
      return showError("Tragerea la sort are nevoie de minim 3 persoane (tu + 2)");
    }
    const t = ROOM_TYPES.find((r) => r.key === roomType);
    setCreating(true);
    try {
      const room = await api.post("/pray-rooms", {
        name: name.trim() || undefined,
        icon: t.icon,
        roomType,
        selectedParticipants,
        settings: { durationDays, requireApproval: isRoulette ? false : requireApproval },
      });
      navigation.replace("PrayRoomScreen", { roomId: room._id });
    } catch (e) {
      showError(e.response?.data?.error || e.message || "Eroare la creare");
    } finally {
      setCreating(false);
    }
  };

  const steps = ["type", "name", "participants", "duration"];
  const currentStep = steps[step];
  const nextStep = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => (step > 0 ? setStep((s) => s - 1) : navigation.goBack());

  const renderStep = () => {
    switch (currentStep) {
      case "type":
        return (
          <View style={styles.typeSelectionContainer}>
            {ROOM_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={styles.typeCardFull}
                onPress={() => { setRoomType(type.key); nextStep(); }}
                activeOpacity={0.9}
              >
                <LinearGradient colors={type.colors} style={styles.typeGradient}>
                  <Text style={styles.typeLabel}>{type.label.toUpperCase()}</Text>
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
              placeholder="Pray Room" placeholderTextColor="#666" maxLength={50} />
            <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
              <Text style={styles.nextBtnText}>Continua</Text>
            </TouchableOpacity>
          </View>
        );
      case "participants":
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{isRoulette ? "Cine participa? (minim 3)" : "Cine participa?"}</Text>
            <ParticipantPicker
              selectedIds={selectedParticipants}
              onSelectionChange={setSelectedParticipants}
            />
            <TouchableOpacity
              style={[styles.nextBtn, isRoulette && selectedParticipants.length < 2 && styles.btnDisabled]}
              onPress={nextStep}
              disabled={isRoulette && selectedParticipants.length < 2}
            >
              <Text style={styles.nextBtnText}>Continua</Text>
            </TouchableOpacity>
          </View>
        );
      case "duration":
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Timp de expirare</Text>
            <View style={styles.optionsColumn}>
              {DURATIONS.map((dOpt) => (
                <TouchableOpacity key={dOpt.value}
                  style={[styles.optionCard, durationChoice === dOpt.value && styles.optionSelected]}
                  onPress={() => setDurationChoice(dOpt.value)}>
                  <Text style={styles.optionText}>{dOpt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {durationChoice === "custom" && (
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  value={customDays}
                  onChangeText={(v) => setCustomDays(v.replace(/[^0-9]/g, ""))}
                  placeholder="ex: 14"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <Text style={styles.customUnit}>zile</Text>
              </View>
            )}
            <Text style={styles.durationHint}>
              Camera se sterge automat la miezul noptii de dupa ultima zi.
            </Text>
            {!isRoulette && (
              <View style={styles.approvalRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.approvalLabel}>Aprob cine intra cu cod</Text>
                  <Text style={styles.approvalDesc}>Cererile cu cod le accepti/refuzi tu din setari</Text>
                </View>
                <Switch
                  value={requireApproval}
                  onValueChange={setRequireApproval}
                  trackColor={{ true: "#21c063", false: "rgba(255,255,255,0.2)" }}
                  thumbColor="#fff"
                />
              </View>
            )}
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
