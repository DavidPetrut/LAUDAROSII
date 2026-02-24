import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
  Animated,
} from "react-native";
import { shopStyles as styles } from "./styles/shopStyles";
import ShopItem from "../components/ShopItem";
import { GameImages } from "../assets";
import { ShopApi } from "../api/shopApi";
import { PlayerApi } from "../api/playerApi";
import { ITEM_CATEGORIES } from "../data/shopItems";
import { useMissions, MissionCard } from "../missions";

// Definim tab-urile disponibile
const TABS = {
  UNELTE: "UNELTE",
  QUESTS: "QUESTS",
};

// Lore pentru fiecare item
const ITEM_LORE = {
  default: {
    text: "Povestea spune că un ucenic al Lui Hristos a reușit să cucerească toate tărâmurile rugăciunilor, dar a avut nevoie de unelte care l-au ajutat în călătoria lui...",
    layout: "center",
  },
  hammer: {
    text: "Ciocanul este o unealtă simplă, dar esențială. Odată folosit, el îți permite să înaintezi, să deschizi drumuri și să treci peste obstacole.",
    image: GameImages.desenCiocan,
    layout: "text-left", // text stânga, imagine dreapta
  },
  shield: {
    text: "Scutul este forjat din credință pura. Te protejează împotriva săgeților arzătoare ale duhurilor rele care vor incerca să te împiedice.",
    image: GameImages.desenScut,
    layout: "text-left", // text stânga, imagine dreapta
  },
  sword: {
    text: "Se spune ca Sabia este o arma legendară, forjată din însăși Cuvântul Adevarului... Doar ea are puterea să alunge Duhurile rele!",
    mainImage: GameImages.desenSword,
    secondaryImage: GameImages.desenBelzy,
    layout: "sword-special", // layout special pentru sabie
  },
};

const PrayerShopScreen = ({ userId, onBack, onAlabastUpdate }) => {
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState({ tools: {}, items: {} });
  const [alabastruCount, setAlabastruCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(TABS.UNELTE);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedMissionId, setExpandedMissionId] = useState(null);

  // CrossFade animation for lore
  const loreOpacity = useRef(new Animated.Value(1)).current;
  const [displayedLore, setDisplayedLore] = useState(null);

  // Missions hook
  const {
    missions,
    loading: missionsLoading,
    requestReward,
    claimReward,
  } = useMissions(userId);

  const loadData = useCallback(async () => {
    try {
      const [allItems, playerInventory, player] = await Promise.all([
        ShopApi.getAllItems(),
        ShopApi.getPlayerInventory(userId),
        PlayerApi.getPlayer(userId),
      ]);

      setItems(allItems);
      setInventory(playerInventory);
      setAlabastruCount(player.alabastru.current);
    } catch (error) {
      console.error("Error loading shop data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // CrossFade animation when selectedItem changes
  useEffect(() => {
    // Fade out
    Animated.timing(loreOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      // Update displayed lore after fade out
      setDisplayedLore(selectedItem);
      // Fade in
      Animated.timing(loreOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    });
  }, [selectedItem]);

  const handlePurchase = async (item, quantity = 1) => {
    const totalPrice = item.price * quantity;

    if (alabastruCount < totalPrice) {
      console.log("Nu ai suficient alabastru!");
      return;
    }

    try {
      console.log(
        "Purchasing:",
        item.id,
        "quantity:",
        quantity,
        "price:",
        totalPrice
      );
      await ShopApi.purchaseItem(userId, item.id, quantity);
      await loadData();
      onAlabastUpdate?.(alabastruCount - totalPrice);
      console.log("Purchase successful!");
    } catch (error) {
      console.error("Purchase error:", error);
    }
  };

  // Obține cantitatea deținută pentru un item
  const getOwnedQuantity = (item) => {
    if (item.category === ITEM_CATEGORIES.TOOLS) {
      return inventory.tools?.[item.id] || 0;
    }
    return inventory.items?.[item.id] || 0;
  };

  const toolItems = items.filter((i) => i.category === ITEM_CATEGORIES.TOOLS);

  // Handle item selection for lore
  const handleItemSelect = (item) => {
    setSelectedItem(selectedItem?.id === item.id ? null : item);
  };

  // Get current lore based on displayed item (for crossfade)
  const getCurrentLore = () => {
    if (!displayedLore) {
      return ITEM_LORE.default;
    }
    return ITEM_LORE[displayedLore.id] || ITEM_LORE.default;
  };

  // Render lore content based on layout
  const renderLoreContent = () => {
    const lore = getCurrentLore();

    if (lore.layout === "center") {
      // Default intro text - centered
      return (
        <View style={styles.loreCenterContent}>
          <Text style={styles.loreText}>{lore.text}</Text>
        </View>
      );
    }

    if (lore.layout === "text-left") {
      // Text left, image right
      return (
        <View style={styles.loreRowContent}>
          <View style={styles.loreTextContainer}>
            <Text style={styles.loreText}>{lore.text}</Text>
          </View>
          <Image
            source={lore.image}
            style={styles.loreImage}
            resizeMode="contain"
          />
        </View>
      );
    }

    if (lore.layout === "sword-special") {
      // Special layout for sword: text + sword image on left, belzy on right
      return (
        <View style={styles.loreSwordContent}>
          {/* Left column: text + sword image */}
          <View style={styles.loreSwordLeftColumn}>
            <Text style={styles.loreTextSmall}>{lore.text}</Text>
            <Image
              source={lore.mainImage}
              style={styles.loreSwordImage}
              resizeMode="contain"
            />
          </View>
          {/* Right: Belzy */}
          <Image
            source={lore.secondaryImage}
            style={styles.loreBelzyImage}
            resizeMode="contain"
          />
        </View>
      );
    }

    return null;
  };

  // Render content based on active tab
  const renderContent = () => {
    if (activeTab === TABS.UNELTE) {
      if (toolItems.length > 0) {
        return (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContainer}
            decelerationRate="fast"
            snapToAlignment="start"
          >
            {toolItems.map((item) => (
              <ShopItem
                key={item.id}
                item={item}
                ownedQuantity={getOwnedQuantity(item)}
                canAfford={alabastruCount >= item.price}
                onPurchase={handlePurchase}
                onSelect={handleItemSelect}
                isSelected={selectedItem?.id === item.id}
              />
            ))}
          </ScrollView>
        );
      }
      return null;
    }

    if (activeTab === TABS.QUESTS) {
      if (missionsLoading) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Se încarcă misiunile...
            </Text>
          </View>
        );
      }

      if (missions.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Nu există misiuni disponibile momentan.
            </Text>
          </View>
        );
      }

      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
          decelerationRate="fast"
          snapToAlignment="start"
        >
          {missions.map((mission) => (
            <View key={mission.id} style={styles.missionCardWrapper}>
              <MissionCard
                mission={mission}
                onRequestReward={requestReward}
                onClaimReward={async (missionId) => {
                  const result = await claimReward(missionId);
                  if (result.success && result.reward) {
                    // Salvează efectiv în AsyncStorage
                    await PlayerApi.updateAlabastru(
                      userId,
                      result.reward,
                      "mission_reward",
                      missionId
                    );
                    // Actualizează UI-ul
                    const newCount = alabastruCount + result.reward;
                    setAlabastruCount(newCount);
                    onAlabastUpdate?.(newCount);
                  }
                }}
                isExpanded={expandedMissionId === mission.id}
                onToggleExpand={() => 
                  setExpandedMissionId(
                    expandedMissionId === mission.id ? null : mission.id
                  )
                }
              />
            </View>
          ))}
        </ScrollView>
      );
    }

    return null;
  };

  return (
    <ImageBackground
      source={GameImages.shop}
      style={styles.container}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      {/* Header - doar butonul X în dreapta */}
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Image
            source={GameImages.xButton}
            style={styles.closeButtonIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Content area */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderContent()}

        {items.length === 0 && !loading && activeTab === TABS.UNELTE && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Magazinul este gol momentan.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Panel with Navigation and Lore - lore-bg covers everything */}
      <ImageBackground
        source={GameImages.loreBg}
        style={styles.bottomPanel}
        imageStyle={styles.bottomPanelBgImage}
        resizeMode="cover"
      >
        {/* Navigation Row */}
        <View style={styles.bottomNavRow}>
          {/* Buttons Group */}
          <View style={styles.tabButtonsGroup}>
            {/* Tab UNELTE */}
            <TouchableOpacity
              style={[
                styles.tabButtonImage,
                activeTab === TABS.UNELTE && styles.tabButtonImageActive,
              ]}
              onPress={() => setActiveTab(TABS.UNELTE)}
              activeOpacity={1}
            >
              <Image
                source={GameImages.btnUnelte}
                style={styles.tabButtonIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Tab QUESTS */}
            <TouchableOpacity
              style={[
                styles.tabButtonImage,
                activeTab === TABS.QUESTS && styles.tabButtonImageActive,
              ]}
              onPress={() => setActiveTab(TABS.QUESTS)}
              activeOpacity={1}
            >
              <Image
                source={GameImages.btnQuests}
                style={styles.tabButtonIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Treasure Bag cu bani - în dreapta */}
          <View style={styles.bottomTreasureContainer}>
            <Image
              source={GameImages.treasureBag}
              style={styles.bottomTreasureBagIcon}
              resizeMode="contain"
            />
            <View style={styles.bottomTreasureCountBadge}>
              <Text style={styles.bottomTreasureCountText}>
                {alabastruCount}
              </Text>
            </View>
          </View>
        </View>

        {/* Lore Section with CrossFade */}
        <Animated.View style={[styles.loreContainer, { opacity: loreOpacity }]}>
          {renderLoreContent()}
        </Animated.View>
      </ImageBackground>
    </ImageBackground>
  );
};

export default PrayerShopScreen;
