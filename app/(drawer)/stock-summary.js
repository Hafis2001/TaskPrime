import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "../../constants/modernTheme";
import { moderateScale, moderateVerticalScale } from "../../src/utils/Responsive";
import { useLicenseModules } from "../../src/utils/useLicenseModules";

const API_URL = "https://taskprime.app/api/stock-summary/";

export default function StockSummaryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stockData, setStockData] = useState(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { checkModule } = useLicenseModules();
  const [isLicensed, setIsLicensed] = useState(null);

  const fetchStockSummary = async (parsedUser) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}?client_id=${parsedUser.clientId}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${parsedUser.token}`,
          },
        }
      );
      const json = await response.json();

      if (json.success && json.data) {
        setStockData(json.data);
      } else {
        setStockData(null);
      }
    } catch (error) {
      console.error("❌ Fetch error:", error);
      setStockData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const runCheck = async () => {
        setIsLicensed(null);
        const allowed = await checkModule("MOD045", "Stock Summary", () => {
          router.push("/(drawer)/(tabs)");
        });

        if (!allowed) {
          setIsLicensed(false);
          return;
        }
        setIsLicensed(true);
        
        const storedUser = await AsyncStorage.getItem("user");
        if (!storedUser) {
          router.replace("/");
          return;
        }
        const parsedUser = JSON.parse(storedUser);
        fetchStockSummary(parsedUser);
      };
      runCheck();

      const backAction = () => {
        router.push("/(drawer)/(tabs)");
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );
      return () => backHandler.remove();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const storedUser = await AsyncStorage.getItem("user");
    if (storedUser) {
        fetchStockSummary(JSON.parse(storedUser));
    } else {
        setRefreshing(false);
    }
  }, []);

  if (isLicensed === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }
  if (!isLicensed) return null;

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Stock Summary"
        leftIcon={<Ionicons name="arrow-back" size={moderateScale(26)} color={Colors.primary.main} />}
        onLeftPress={() => router.push("/(drawer)/(tabs)")}
      />

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary.main} />
          </View>
        ) : stockData ? (
          <View style={styles.cardsContainer}>
            {/* Value Highlights */}
            <ModernCard style={styles.mainCard} gradient padding={moderateScale(30)}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconBackground}>
                        <Ionicons name="wallet-outline" size={moderateScale(28)} color="#fff" />
                    </View>
                    <Text style={styles.cardLabel}>TOTAL STOCK VALUE</Text>
                </View>
                <Text style={styles.mainValue}>
                    ₹{parseFloat(stockData.total_stock_value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <View style={styles.divider} />
                <View style={styles.subInfo}>
                    <Ionicons name="trending-up" size={moderateScale(16)} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.subInfoText}>Updated just now</Text>
                </View>
            </ModernCard>

            <View style={styles.row}>
                <ModernCard style={styles.secondaryCard} padding={moderateScale(20)}>
                    <View style={[styles.miniIconCircle, { backgroundColor: Colors.primary.main + '15' }]}>
                        <Ionicons name="cube-outline" size={moderateScale(24)} color={Colors.primary.main} />
                    </View>
                    <Text style={styles.secondaryLabel}>Total Products</Text>
                    <Text style={styles.secondaryValue}>{stockData.total_products}</Text>
                </ModernCard>
                
                <ModernCard style={styles.secondaryCard} padding={moderateScale(20)}>
                    <View style={[styles.miniIconCircle, { backgroundColor: '#10B98115' }]}>
                        <Ionicons name="layers-outline" size={moderateScale(24)} color="#10B981" />
                    </View>
                    <Text style={styles.secondaryLabel}>Status</Text>
                    <Text style={[styles.secondaryValue, { color: '#10B981' }]}>Healthy</Text>
                </ModernCard>
            </View>

            {/* Quick Action Info */}
            <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={moderateScale(20)} color={Colors.text.tertiary} />
                <Text style={styles.infoText}>
                    This summary provides a real-time overview of your inventory's total worth and catalog size.
                </Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={moderateScale(64)} color={Colors.text.disabled} />
            <Text style={styles.emptyText}>No stock summary details found.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary
  },
  content: {
    flexGrow: 1,
    padding: moderateScale(Spacing.base),
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardsContainer: {
    gap: moderateScale(Spacing.lg),
    marginTop: moderateVerticalScale(Spacing.sm),
  },
  mainCard: {
    ...Shadows.lg,
    borderRadius: moderateScale(BorderRadius['2xl']),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
    marginBottom: moderateVerticalScale(16),
  },
  iconBackground: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(14),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  mainValue: {
    fontSize: moderateScale(36),
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: moderateVerticalScale(20),
  },
  subInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  subInfoText: {
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: moderateScale(Spacing.md),
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: moderateScale(BorderRadius.xl),
    ...Shadows.sm,
  },
  miniIconCircle: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateVerticalScale(12),
  },
  secondaryLabel: {
    fontSize: moderateScale(11),
    color: Colors.text.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: moderateVerticalScale(4),
  },
  secondaryValue: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: Colors.text.primary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    padding: moderateScale(16),
    borderRadius: moderateScale(BorderRadius.lg),
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: moderateScale(12),
    alignItems: 'center',
    marginTop: moderateVerticalScale(Spacing.md),
  },
  infoText: {
    flex: 1,
    fontSize: moderateScale(12),
    color: Colors.text.tertiary,
    lineHeight: 18,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: moderateVerticalScale(60),
    gap: moderateVerticalScale(Spacing.md),
  },
  emptyText: {
    fontSize: moderateScale(Typography.fontSize.base),
    color: Colors.text.secondary,
    fontWeight: '500',
  },
});
