import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  View
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "../../constants/modernTheme";
import { moderateScale, moderateVerticalScale, verticalScale, isTablet } from "../../src/utils/Responsive";
import { useLicenseModules } from "../../src/utils/useLicenseModules";

const API_URLS = {
  today: "https://taskprime.app/api/purchasetoday/",
  month: "https://taskprime.app/api/purchasemonthwise/",
  daywise: "https://taskprime.app/api/purchasedaywise/",
};

export default function PurchaseReportScreen() {
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState("today");
  const [purchaseData, setPurchaseData] = useState([]);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { checkModule } = useLicenseModules();
  const [isLicensed, setIsLicensed] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const runCheck = async () => { setIsLicensed(null);
        const allowed = await checkModule("MOD038", "Purchase Report", () => {
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
        setUser(parsedUser);
        fetchReport(parsedUser, selectedSummary);
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
    }, [selectedSummary])
  );

  const fetchReport = async (parsedUser, type) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URLS[type]}?client_id=${parsedUser.clientId}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${parsedUser.token}`,
          },
        }
      );
      const json = await response.json();

      if (json.success && Array.isArray(json.data)) {
        setPurchaseData(json.data);
      } else if (json.data) {
        setPurchaseData([json.data]);
      } else {
        setPurchaseData([]);
      }
    } catch (error) {
      console.error("âŒ Fetch error:", error);
      setPurchaseData([]);
    } finally {
      setLoading(false);
    }
  };

  if (isLicensed === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.secondary }}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }
  if (!isLicensed) return null;

  const totalPurchase = purchaseData.reduce(
    (sum, item) => {
      const amount = parseFloat(item.net || item.total_amount || item.total || 0);
      return sum + amount;
    },
    0
  );

  const renderItem = ({ item }) => {
    if (selectedSummary === "daywise") {
      const formattedDate = item.date
        ? new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
        : 'N/A';
      return (
        <ModernCard style={styles.transactionCard} elevated={true}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <LinearGradient
                colors={['rgba(79,70,229,0.15)', 'rgba(99,102,241,0.08)']}
                style={styles.iconCircle}
              >
                <Ionicons name="calendar" size={moderateScale(22)} color="#4F46E5" />
              </LinearGradient>
              <View style={styles.infoContainer}>
                <Text style={[styles.name, { color: '#1e1b4b' }]} numberOfLines={1}>{formattedDate}</Text>
                <View style={styles.daywiseStatsRow}>
                  <View style={styles.daywiseBillBadge}>
                    <Ionicons name="receipt-outline" size={moderateScale(11)} color="#4F46E5" />
                    <Text style={styles.daywiseBillText}>{item.total_bills} {item.total_bills === 1 ? 'Bill' : 'Bills'}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.amountContainer}>
              <Text style={[styles.amount, { color: '#4F46E5' }]} numberOfLines={1}>
                ₹{parseFloat(item.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </ModernCard>
      );
    }

    if (selectedSummary === "month") {
      return (
        <ModernCard style={styles.transactionCard} elevated={true}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(0, 150, 136, 0.1)' }]}>
                <Ionicons name="calendar-outline" size={moderateScale(22)} color="#009688" />
              </View>
              <View style={styles.infoContainer}>
                <Text style={styles.name} numberOfLines={1}>{item.month_name}</Text>
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{item.total_bills} {item.total_bills === 1 ? 'Bill' : 'Bills'}</Text>
                </View>
              </View>
            </View>
            <View style={styles.amountContainer}>
              <Text style={styles.amount} numberOfLines={1}>
                ₹{parseFloat(item.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </ModernCard>
      );
    }

    return (
      <ModernCard style={styles.transactionCard} elevated={true}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name="cart-outline" size={moderateScale(22)} color={Colors.primary.main} />
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.name} numberOfLines={1}>{item.suppliername || "Unknown Supplier"}</Text>
              <Text style={styles.time}>Bill No: {item.billno || "N/A"}</Text>
              {item.date && (
                <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
              )}
            </View>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amount} numberOfLines={1}>
              ₹{parseFloat(item.net || item.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </ModernCard>
    );
  };

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Purchase Report"
        leftIcon={<Ionicons name="arrow-back" size={moderateScale(26)} color={Colors.primary.main} />}
        onLeftPress={() => router.push("/(drawer)/(tabs)")}
      />

      <View style={styles.content}>
        {/* Dropdown */}
        <LinearGradient
          colors={[Colors.primary.main, Colors.primary.light]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBox}
        >
          <RNPickerSelect
            onValueChange={(value) => setSelectedSummary(value)}
            value={selectedSummary}
            placeholder={{}}
            items={[
              { label: "Today's Purchase", value: "today" },
              { label: "Monthly Purchase", value: "month" },
              { label: "Day Wise Purchase", value: "daywise" },
            ]}
            style={{
              inputIOS: styles.inputGradient,
              inputAndroid: styles.inputGradient,
              iconContainer: { top: 18, right: 15 },
            }}
            useNativeAndroidPickerStyle={false}
            Icon={() => <Ionicons name="chevron-down" size={moderateScale(20)} color="#fff" />}
          />
        </LinearGradient>

        {/* Loading / Data */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary.main} />
          </View>
        ) : purchaseData.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="cart-outline" size={moderateScale(48)} color={Colors.text.disabled} style={{ marginBottom: moderateVerticalScale(Spacing.md) }} />
            <Text style={styles.emptyText}>No purchase data available.</Text>
          </View>
        ) : (
          <>
            {/* Top Summary Card */}
            <ModernCard style={styles.summaryCard} gradient padding={moderateScale(Spacing.xl)}>
              <View style={styles.summaryHeader}>
                <Ionicons name="analytics" size={moderateScale(20)} color="rgba(255,255,255,0.9)" style={{marginRight: moderateScale(Spacing.xs)}} />
                <Text style={styles.summaryTitle}>
                  {selectedSummary === 'daywise' ? 'Day Wise Total' : 'Total Purchase'}
                </Text>
              </View>
              <Text style={styles.totalValue}>₹{totalPurchase.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
              {selectedSummary === 'daywise' && (
                <View style={styles.summarySubRow}>
                  <Ionicons name="layers-outline" size={moderateScale(13)} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.summarySubText}>
                    {purchaseData.reduce((s, i) => s + (i.total_bills || 0), 0)} Total Bills · {purchaseData.length} Days
                  </Text>
                </View>
              )}
            </ModernCard>

            {/* All Transactions */}
            <Text style={styles.sectionTitle}>
              {selectedSummary === 'daywise' ? 'Day Wise Breakdown' : 'All Purchases'}
            </Text>
            <FlatList
              data={purchaseData}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Spacing.xl + insets.bottom }}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary
  },
  content: {
    flex: 1,
    padding: moderateScale(Spacing.base),
  },
  pickerWrapper: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  gradientBox: {
    borderRadius: moderateScale(BorderRadius.lg),
    marginBottom: moderateVerticalScale(Spacing.md),
    ...Shadows.sm,
  },
  inputGradient: {
    fontSize: moderateScale(Typography.fontSize.base),
    paddingVertical: moderateVerticalScale(14),
    paddingHorizontal: moderateScale(16),
    color: "#fff",
    fontWeight: "600",
    backgroundColor: "transparent",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing['3xl'],
  },
  summaryCard: {
    marginBottom: Spacing.lg,
    alignItems: "center",
    borderRadius: moderateScale(BorderRadius.xl),
    ...Shadows.md,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: moderateScale(Typography.fontSize.sm),
    color: 'rgba(255,255,255,0.9)',
    fontWeight: "700",
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: moderateScale(32),
    fontWeight: "900",
    color: "#ffffff",
    marginTop: moderateVerticalScale(Spacing.sm),
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sectionTitle: {
    fontSize: moderateScale(Typography.fontSize.sm),
    fontWeight: "800",
    marginBottom: moderateVerticalScale(Spacing.md),
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginLeft: moderateScale(4),
  },
  transactionCard: {
    padding: moderateScale(Spacing.lg),
    marginBottom: moderateVerticalScale(Spacing.md),
    backgroundColor: Colors.background.primary,
    borderRadius: moderateScale(BorderRadius.lg),
    ...Shadows.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: moderateScale(Spacing.md),
  },
  iconCircle: {
    width: moderateScale(48),
    height: moderateScale(48),
    backgroundColor: Colors.primary.lightest,
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontWeight: "800",
    color: Colors.text.primary,
    fontSize: moderateScale(Typography.fontSize.base),
    marginBottom: moderateVerticalScale(2),
  },
  time: {
    color: Colors.text.secondary,
    fontSize: moderateScale(Typography.fontSize.xs),
    fontWeight: "500",
  },
  dateText: {
    color: Colors.text.tertiary,
    fontSize: moderateScale(10),
    marginTop: moderateVerticalScale(2),
  },
  badgeContainer: {
    backgroundColor: 'rgba(0, 150, 136, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateVerticalScale(2),
    borderRadius: moderateScale(12),
    marginTop: moderateVerticalScale(4),
  },
  badgeText: {
    color: '#009688',
    fontSize: moderateScale(10),
    fontWeight: '700',
  },
  daywiseStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateVerticalScale(5),
    gap: moderateScale(6),
  },
  daywiseBillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    backgroundColor: 'rgba(79,70,229,0.1)',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateVerticalScale(3),
    borderRadius: moderateScale(12),
  },
  daywiseBillText: {
    color: '#4F46E5',
    fontSize: moderateScale(10),
    fontWeight: '700',
  },
  summarySubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateVerticalScale(6),
    gap: moderateScale(4),
  },
  summarySubText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'flex-end',
    minWidth: moderateScale(90),
    marginLeft: moderateScale(Spacing.sm),
    justifyContent: 'center',
  },
  amount: {
    color: Colors.primary.main,
    fontWeight: "800",
    fontSize: moderateScale(Typography.fontSize.lg || 18),
    textAlign: "right",
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
    marginTop: moderateVerticalScale(Spacing.sm),
    fontWeight: "500",
  },
});

