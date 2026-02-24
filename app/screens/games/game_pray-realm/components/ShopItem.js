import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { shopItemStyles as styles } from "../screens/styles/shopStyles";
import { GameImages, getToolImage } from "../assets";

/**
 * ShopItem - Item afișat în magazin
 * Suportă cantități și cumpărări multiple
 */
const ShopItem = ({ item, ownedQuantity = 0, canAfford, onPurchase, onSelect, isSelected }) => {
  const getItemImage = () => {
    // Încearcă să obțină imaginea din tool images
    const toolImage = getToolImage(item.image);
    if (toolImage) return toolImage;

    // Fallback la GameImages
    switch (item.image) {
      case "hammer":
        return GameImages.hammer;
      default:
        return GameImages.hammer;
    }
  };

  const hasItem = ownedQuantity > 0;

  const getButtonStyle = () => {
    if (canAfford) return styles.priceButtonEnabled;
    return styles.priceButtonDisabled;
  };

  const getTextStyle = () => {
    if (canAfford) return styles.priceTextEnabled;
    return styles.priceTextDisabled;
  };

  const handlePress = () => {
    if (canAfford) {
      onPurchase?.(item, 1);
    }
  };

  const handleCardPress = () => {
    onSelect?.(item);
  };

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={handleCardPress}
      activeOpacity={1}
    >
      <View style={styles.imageContainer}>
        <Image
          source={getItemImage()}
          style={styles.itemImage}
          resizeMode="contain"
        />
        {/* Badge cu cantitatea deținută */}
        {hasItem && (
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityBadgeText}>x{ownedQuantity}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <TouchableOpacity
          style={[styles.priceButton, getButtonStyle()]}
          onPress={handlePress}
          disabled={!canAfford}
          activeOpacity={0.7}
        >
          <Image
            source={GameImages.alabastru}
            style={styles.priceIcon}
            resizeMode="contain"
          />
          <Text style={[styles.priceText, getTextStyle()]}>
            {item.price}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(ShopItem);
