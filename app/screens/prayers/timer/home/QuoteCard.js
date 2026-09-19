import React, { useState } from "react";
import { View, Text, TouchableOpacity, Share, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { devotionalStyles as styles } from "../devotionalStyles";

const asText = (q) => `"${q.text}"${q.author ? `\n— ${q.author}` : ""}`;

/**
 * Cardul cu citatul zilei: textul + autorul (jos-dreapta) si o iconita sus-dreapta
 * care deschide alegerea "Copiaza" / "Distribuie".
 */
export const QuoteCard = ({ quote, onToast }) => {
  const [menu, setMenu] = useState(false);
  if (!quote?.text) return null;

  const copy = async () => {
    setMenu(false);
    try {
      await Clipboard.setStringAsync(asText(quote));
      onToast?.("Citat copiat");
    } catch (e) {}
  };

  const share = async () => {
    setMenu(false);
    try {
      await Share.share({ message: asText(quote) });
    } catch (e) {}
  };

  return (
    <View style={styles.quoteCard}>
      <TouchableOpacity
        style={styles.quoteCopyBtn}
        onPress={() => setMenu(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="share-outline" size={20} color="rgba(255,255,255,0.75)" />
      </TouchableOpacity>

      <Text style={styles.quoteMark}>“</Text>
      <Text style={styles.quoteText}>{quote.text}</Text>
      {!!quote.author && <Text style={styles.quoteAuthor}>— {quote.author}</Text>}

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenu(false)}>
          <View style={styles.menuSheet}>
            <TouchableOpacity style={styles.menuItem} onPress={copy}>
              <Ionicons name="copy-outline" size={20} color="#e5e7eb" />
              <Text style={styles.menuItemText}>Copiază textul</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={share}>
              <Ionicons name="share-social-outline" size={20} color="#e5e7eb" />
              <Text style={styles.menuItemText}>Distribuie</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default QuoteCard;
