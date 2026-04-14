import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import RNPickerSelect from "react-native-picker-select";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale, moderateVerticalScale } from "../../src/utils/Responsive";
import { useLicenseModules } from "../../src/utils/useLicenseModules";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import { Colors, Spacing, Typography } from "../../constants/modernTheme";

const API_URLS = {
  day: "https://taskprime.app/api/salesreturndaywise",
  month: "https://taskprime.app/api/salesreturnmonthwise",
};

export default function SalesReturnScreen() {
  const [selectedSummary, setSelectedSummary] = useState("day");
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { checkModule } = useLicenseModules();
  const [isLicensed, setIsLicensed] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const runCheck = async () => {
        setIsLicensed(null);
        const allowed = await checkModule("MOD018", "Sales Return", () => {
          router.push("/(drawer)/(tabs)");
        });

        if (!allowed) {
          setIsLicensed(false);
          return;
        }
        setIsLicensed(true);
        getClientIdAndFetch(selectedSummary);
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

  const getClientIdAndFetch = async (type) => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (!storedUser) {
        router.replace("/");
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      let storedClientId = parsedUser?.clientId;

      if (!storedClientId) {
        Alert.alert("Error", "Account configuration missing. Please log in again.");
        setLoading(false);
        return;
      }

      // Consistent ID cleaning (O -> 0)
      const cleanClientId = storedClientId.trim().replace(/O/g, "0");
      const token = parsedUser.token;

      fetchSalesReturnData(cleanClientId, token, type);
    } catch (error) {
      console.error("Error initializing screen:", error);
      setLoading(false);
    }
  };

  const fetchSalesReturnData = async (storedClientId, token, type) => {
    try {
      setLoading(true);
      const url = `${API_URLS[type]}?client_id=${storedClientId}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const result = await response.json();

      if (result && result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        setSalesData(data);
        const total = data.reduce((sum, item) => sum + (parseFloat(item.net || item.total_amount || item.total || 0)), 0);
        setTotalAmount(total);
      } else {
        setSalesData([]);
        setTotalAmount(0);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setSalesData([]);
      setTotalAmount(0);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderItem = ({ item }) => {
    if (selectedSummary === "day") {
      const formattedDate = item.date
        ? new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
        : 'N/A';
      return (
        <ModernCard style={styles.transactionCard} elevated={true}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <LinearGradient
                colors={['rgba(244,63,94,0.15)', 'rgba(251,113,133,0.08)']}
                style={styles.iconCircle}
              >
                <Ionicons name="calendar-clear" size={moderateScale(20)} color={Colors.error.main} />
              </LinearGradient>
              <View style={styles.nameContainer}>
                <Text style={[styles.name, { color: '#4c0519' }]} numberOfLines={1}>{formattedDate}</Text>
                <View style={styles.daywiseStatsRow}>
                  <View style={styles.daywiseBillBadge}>
                    <Ionicons name="receipt-outline" size={moderateScale(11)} color={Colors.error.main} />
                    <Text style={styles.daywiseBillText}>{item.total_bills} {item.total_bills === 1 ? 'Bill' : 'Bills'}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.amountContainer}>
              <Text style={[styles.amount, { color: Colors.error.main }]} numberOfLines={1}>
                ₹{parseFloat(item.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </ModernCard>
      );
    }

    if (selectedSummary === "month") {
      return (
        <ModernCard style={styles.transactionCard} elevated={false}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(0, 150, 136, 0.1)' }]}>
                <Ionicons name="calendar-outline" size={moderateScale(22)} color="#009688" />
              </View>
              <View style={styles.nameContainer}>
                <Text style={styles.name} numberOfLines={1}>{item.month_name}</Text>
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeTextAlt}>{item.total_bills} {item.total_bills === 1 ? 'Bill' : 'Bills'}</Text>
                </View>
              </View>
            </View>
            <View style={styles.amountContainer}>
              <Text style={styles.amount} numberOfLines={1}>
                {parseFloat(item.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </ModernCard>
      );
    }

    return (
      <ModernCard style={styles.transactionCard} elevated={false}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name="return-down-back-outline" size={moderateScale(20)} color={Colors.error.main} />
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={1}>{item.customername || "Unknown Customer"}</Text>
              <Text style={styles.time}>
                {item.date ? formatDate(item.date) : ""} {item.invno || ""}
              </Text>
            </View>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amount} numberOfLines={1}>
              {parseFloat(item.net || item.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </ModernCard>
    );
  };

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Sales Return"
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
              { label: "Day Wise Return", value: "day" },
              { label: "Monthly Returns", value: "month" },
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

        <ModernCard style={styles.summaryCard} gradient padding={moderateScale(Spacing.xl)}>
          <View style={styles.summaryHeader}>
            <Ionicons name="stats-chart" size={moderateScale(18)} color="rgba(255,255,255,0.9)" style={{marginRight: moderateScale(6)}} />
            <Text style={styles.summaryTitle}>
              {selectedSummary === 'day' ? 'Day Wise Total' : 'Total Returns'}
            </Text>
          </View>
          <Text style={styles.totalValue}>₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {selectedSummary === 'day' 
                ? `${salesData.reduce((s, i) => s + (i.total_bills || 0), 0)} Total Bills · ${salesData.length} Days`
                : `${salesData.length} Invoices`}
            </Text>
          </View>
        </ModernCard>

        <Text style={styles.sectionTitle}>
          {selectedSummary === 'day' ? 'Day Wise Breakdown' : 'Recent Returns'}
        </Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary.main} />
          </View>
        ) : salesData.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="return-down-back" size={moderateScale(48)} color={Colors.text.disabled} />
            <Text style={styles.emptyText}>No sales return data found.</Text>
          </View>
        ) : (
          <FlatList
            data={salesData}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
            showsVerticalScrollIndicator={false}
          />
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
  gradientBox: {
    borderRadius: moderateScale(12),
    marginBottom: moderateVerticalScale(Spacing.md),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  },
  summaryTitle: {
    fontSize: moderateScale(Typography.fontSize.sm),
    color: 'rgba(255,255,255,0.9)',
    fontWeight: "600",
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: moderateScale(Typography.fontSize['3xl']),
    fontWeight: "bold",
    color: "#fff",
    marginTop: moderateVerticalScale(Spacing.xs)
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateVerticalScale(4),
    borderRadius: moderateScale(12),
    marginTop: moderateVerticalScale(Spacing.sm),
  },
  badgeText: {
    color: '#fff',
    fontSize: moderateScale(10),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: moderateScale(Typography.fontSize.xs),
    fontWeight: "800",
    marginBottom: moderateVerticalScale(Spacing.sm),
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: moderateScale(4),
  },
  transactionCard: {
    padding: moderateScale(Spacing.md),
    marginBottom: moderateVerticalScale(Spacing.sm),
    backgroundColor: Colors.background.primary,
    borderColor: Colors.border.light,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(Spacing.md)
  },
  iconCircle: {
    width: moderateScale(40),
    height: moderateScale(40),
    backgroundColor: Colors.error.lightest,
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontWeight: "700",
    color: Colors.text.primary,
    fontSize: moderateScale(Typography.fontSize.base)
  },
  time: {
    color: Colors.text.secondary,
    fontSize: moderateScale(Typography.fontSize.xs),
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
  badgeTextAlt: {
    color: '#009688',
    fontSize: moderateScale(10),
    fontWeight: '700',
  },
  amountContainer: {
    alignItems: 'flex-end',
    minWidth: moderateScale(90),
    marginLeft: moderateScale(Spacing.sm),
  },
  amount: {
    color: Colors.error.main,
    fontWeight: "700",
    fontSize: moderateScale(Typography.fontSize.base),
    textAlign: "right",
  },
  emptyText: {
    marginTop: Spacing.base,
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
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
    backgroundColor: 'rgba(244,63,94,0.1)',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateVerticalScale(3),
    borderRadius: moderateScale(12),
  },
  daywiseBillText: {
    color: Colors.error.main,
    fontSize: moderateScale(10),
    fontWeight: '700',
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: moderateVerticalScale(2),
  },
});

