import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(360, width - 48);

export default function BankCashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const backAction = () => {
      router.replace("/company-info");
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 20 }]}>
      <Text style={styles.heading}>Accounts</Text>
      <Text style={styles.subheading}>
        Quick access to your bank & cash books
      </Text>

      <View style={styles.cardsWrapper}>
        {/* Bank Book Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("Bank-Book")}
        >
          <LinearGradient
            colors={["#4e73df", "#6f8cff"]}
            start={[0, 0]}
            end={[1, 1]}
            style={[styles.card, styles.cardBank]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="card-outline" size={34} color="#fff" />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Bank Book</Text>
              <Text style={styles.cardSubtitle}>
                View bank details & ledgers
              </Text>
            </View>

            <View style={styles.chevWrap}>
              <Ionicons
                name="chevron-forward"
                size={22}
                color="rgba(255,255,255,0.9)"
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Cash Book Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("Cash-Book")}
        >
          <LinearGradient
            colors={["#1cc88a", "#29d79a"]}
            start={[0, 0]}
            end={[1, 1]}
            style={[styles.card, styles.cardCash]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="cash-outline" size={34} color="#fff" />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Cash Book</Text>
              <Text style={styles.cardSubtitle}>
                Cash summary & transactions
              </Text>
            </View>

            <View style={styles.chevWrap}>
              <Ionicons
                name="chevron-forward"
                size={22}
                color="rgba(255,255,255,0.95)"
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f1724",
    marginBottom: 6,
  },
  subheading: {
    color: "#6b7280",
    marginBottom: 20,
    fontSize: 14,
  },
  cardsWrapper: {
    gap: 18,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#0b1220",
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
    marginBottom: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    opacity: 0.9,
  },
  chevWrap: {
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 8,
  },
  cardBank: {},
  cardCash: {},
});