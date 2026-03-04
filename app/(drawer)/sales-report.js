import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  LayoutAnimation,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "../../constants/modernTheme";
import { Screen } from "../../src/utils/Responsive";
import { useLicenseModules } from "../../src/utils/useLicenseModules";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API_URLS = {
  today: "https://taskprime.app/api/salestoday/",
  DayWise: "https://taskprime.app/api/salesdaywise/",
  item: "https://taskprime.app/api/salesmonthwise/",
  typeWise: "https://taskprime.app/api/type-wise-sales-today/",
};

export default function SalesReportScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState("today");
  const [salesData, setSalesData] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [user, setUser] = useState(null);
  const [isLicensed, setIsLicensed] = useState(null);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { checkModule } = useLicenseModules();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: "Sales Report",
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const runCheck = async () => {
        const allowed = await checkModule("MOD017", "Sales Report", () => {
          router.replace("/(drawer)/(tabs)");
        });

        if (!allowed) {
          setIsLicensed(false);
          return;
        }
        setIsLicensed(true);
        const storedUser = await AsyncStorage.getItem("user");
        if (!storedUser) {
          Alert.alert("Session Expired", "Please login again.");
          router.replace("/");
          setLoading(false);
          return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchReport(parsedUser, selectedSummary);
      };
      runCheck();

      const backAction = () => {
        router.replace("/(drawer)/(tabs)");
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );
      return () => backHandler.remove();
    }, [selectedSummary, salesData.length])
  );

  const fetchReport = async (parsedUser, type, isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      else setRefreshing(true);

      const response = await fetch(
        `${API_URLS[type]}?client_id=${parsedUser.clientId}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${parsedUser.token}`,
          },
        }
      );

      const text = await response.text();
      if (!text.startsWith("{") && !text.startsWith("[")) {
        console.log("❌ Server did not return JSON:", text);
        setSalesData([]);
        return;
      }

      const json = JSON.parse(text);
      if (json.success && Array.isArray(json.data)) {
        setSalesData(json.data);
      } else if (json.data) {
        setSalesData(Array.isArray(json.data) ? json.data : [json.data]);
      } else {
        setSalesData([]);
      }
    } catch (error) {
      console.error("❌ Fetch error:", error);
      setSalesData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (user) {
      fetchReport(user, selectedSummary, true);
    }
  }, [user, selectedSummary]);

  const handleTypeChange = (value) => {
    if (value && value !== selectedSummary) {
      setSalesData([]); // Clear old data for better UX
      setSelectedSummary(value);
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

  const totalSales = salesData.reduce(
    (sum, item) => {
      const val = item.nettotal || item.total_amount || 0;
      return sum + parseFloat(val);
    },
    0
  );
  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.secondary }}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <ModernCard style={styles.transactionCard} elevated={false}>
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="receipt-outline" size={20} color={Colors.primary.main} />
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.name} numberOfLines={1}>{item.customername}</Text>
            <Text style={styles.time}>Bill No: {item.billno}</Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount} numberOfLines={1}>
            ₹{Math.floor(parseFloat(item.nettotal || 0)).toFixed(3)}
          </Text>
        </View>
      </View>
    </ModernCard>
  );

  const renderDayWise = ({ item }) => (
    <ModernCard style={styles.dayCard} elevated={false}>
      <View style={styles.dayRow}>
        <View style={styles.dayInfo}>
          <Text style={styles.dayDate}>
            {new Date(item.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
          <Text style={styles.dayBills}>{item.total_bills} Bills</Text>
        </View>
        <View style={styles.dayAmountContainer}>
          <Text style={styles.dayAmount} numberOfLines={1}>
            ₹{Math.floor(parseFloat(item.total_amount)).toFixed(3)}
          </Text>
        </View>
      </View>
    </ModernCard>
  );

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const renderMonthWise = ({ item }) => {
    const isExpanded = expandedId === item.id;
    return (
      <View style={{ marginBottom: Spacing.md }}>
        <TouchableOpacity
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.9}
        >
          <ModernCard style={[styles.monthCard, isExpanded && styles.monthCardExpanded]} elevated={!isExpanded}>
            <View style={styles.monthHeader}>
              <View style={styles.monthTitleRow}>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary.main} style={{ marginRight: 8 }} />
                <Text style={styles.monthTitle}>{item.month_name}</Text>
              </View>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={Colors.text.secondary}
              />
            </View>
            {!isExpanded && <Text style={styles.monthSubtitle}>Tap to see details</Text>}

            {isExpanded && (
              <View style={styles.expandedContainer}>
                <View style={[styles.expandedBox, { backgroundColor: Colors.primary.main }]}>
                  <Text style={styles.expandedLabel}>Total Bills</Text>
                  <Text style={styles.expandedValue}>{item.total_bills}</Text>
                </View>
                <View style={[styles.expandedBox, { backgroundColor: Colors.success.main }]}>
                  <Text style={styles.expandedLabel}>Total Amount</Text>
                  <Text style={styles.expandedValue}>
                    ₹{Math.floor(parseFloat(item.total_amount)).toFixed(3)}
                  </Text>
                </View>
              </View>
            )}
          </ModernCard>
        </TouchableOpacity>
      </View>
    );
  };

  const TYPE_COLORS = [
    { bg: "#4F46E5", light: "#EEF2FF" },
    { bg: "#0EA5E9", light: "#E0F2FE" },
    { bg: "#10B981", light: "#D1FAE5" },
    { bg: "#F59E0B", light: "#FEF3C7" },
    { bg: "#EF4444", light: "#FEE2E2" },
    { bg: "#8B5CF6", light: "#EDE9FE" },
  ];

  const renderTypeWise = ({ item, index }) => {
    const color = TYPE_COLORS[index % TYPE_COLORS.length];
    return (
      <ModernCard style={[styles.typeCard, { borderLeftColor: color.bg }]} elevated={false}>
        <View style={styles.typeCardInner}>
          <View style={[styles.typeBadge, { backgroundColor: color.light }]}>
            <Text style={[styles.typeBadgeText, { color: color.bg }]}>{item.payment_type}</Text>
          </View>
          <View style={styles.typeInfo}>
            <Text style={styles.typeName}>{item.name}</Text>
            <View style={styles.typeMetaRow}>
              <Ionicons name="receipt-outline" size={13} color={Colors.text.secondary} />
              <Text style={styles.typeMeta}>{item.billcount} Bills</Text>
            </View>
          </View>
          <View style={styles.typeAmountBox}>
            <Text style={[styles.typeAmount, { color: color.bg }]}>
              ₹{Math.floor(parseFloat(item.nettotal || 0)).toFixed(3)}
            </Text>
            <Text style={styles.typeAmountLabel}>Net Total</Text>
          </View>
        </View>
      </ModernCard>
    );
  };

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Sales Report"
        leftIcon={<Ionicons name="arrow-back" size={26} color={Colors.primary.main} />}
        onLeftPress={() => router.replace("/(drawer)/(tabs)")}
      />

      <View style={styles.content}>
        {/* ✅ Gradient Dropdown Section */}
        <LinearGradient
          colors={[Colors.primary.main, Colors.primary.light]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBox}
        >
          <RNPickerSelect
            onValueChange={handleTypeChange}
            value={selectedSummary}
            placeholder={{}}
            items={[
              { label: "Today Sales", value: "today" },
              { label: "Day Wise Sales", value: "DayWise" },
              { label: "Month Wise Sales", value: "item" },
              { label: "Type Wise Sales", value: "typeWise" },
            ]}
            style={{
              inputIOS: styles.inputGradient,
              inputAndroid: styles.inputGradient,
              iconContainer: { top: 18, right: 15 },
            }}
            useNativeAndroidPickerStyle={false}
            Icon={() => <Ionicons name="chevron-down" size={20} color="#fff" />}
          />
        </LinearGradient>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary.main} />
          </View>
        ) : salesData.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="documents-outline" size={48} color={Colors.text.disabled} style={{ marginBottom: Spacing.md }} />
            <Text style={styles.emptyText}>No sales data available.</Text>
          </View>
        ) : selectedSummary === "DayWise" ? (
          <>
            <View style={styles.summaryRow}>
              <ModernCard style={styles.summaryBox} elevated={false}>
                <Text style={styles.summaryLabel}>Total Bills</Text>
                <Text style={styles.summaryNumber}>
                  {salesData.reduce((sum, i) => sum + (i.total_bills || 0), 0)}
                </Text>
              </ModernCard>
              <ModernCard style={styles.summaryBox} elevated={false}>
                <Text style={styles.summaryLabel}>Total Amount</Text>
                <Text style={[styles.summaryNumber, { color: Colors.primary.main }]}>
                  ₹{Math.floor(salesData
                    .reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0)).toFixed(3)}
                </Text>
              </ModernCard>
            </View>

            <FlatList
              data={salesData}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderDayWise}
              contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} />}
            />
          </>
        ) : selectedSummary === "item" ? (
          <FlatList
            data={salesData}
            numColumns={Screen.isTablet ? 2 : 1}
            key={Screen.isTablet ? 'tablet' : 'phone'}
            renderItem={renderMonthWise}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + Spacing.xl },
            ]}
            columnWrapperStyle={Screen.isTablet ? styles.columnWrapper : null}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} />}
          />
        ) : selectedSummary === "typeWise" ? (
          <>
            <ModernCard style={styles.summaryCard} gradient padding={Spacing.xl}>
              <Text style={styles.summaryTitle}>Total Type-Wise Sales</Text>
              <Text style={styles.totalValue}>
                ₹{Math.floor(totalSales).toFixed(3)}
              </Text>
              <Text style={[styles.summaryTitle, { marginTop: 4 }]}>
                {salesData.reduce((sum, i) => sum + (i.billcount || 0), 0)} Total Bills
              </Text>
            </ModernCard>
            <Text style={styles.sectionTitle}>Payment Type Breakdown</Text>
            <FlatList
              data={salesData}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderTypeWise}
              contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} />}
            />
          </>
        ) : (
          <>
            <ModernCard style={styles.summaryCard} gradient padding={Spacing.xl}>
              <Text style={styles.summaryTitle}>Total Sales Today</Text>
              <Text style={styles.totalValue}>₹{Math.floor(totalSales).toFixed(3)}</Text>
            </ModernCard>

            <Text style={styles.sectionTitle}>All Transactions</Text>
            <FlatList
              data={salesData}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} />}
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
    padding: Spacing.base,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    height: 56,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginLeft: 16,
  },
  gradientBox: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  inputGradient: {
    fontSize: Typography.fontSize.base,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: "#fff",
    fontWeight: "600",
    backgroundColor: "transparent",
  },
  centered: {
    alignItems: "center",
    marginTop: 50,
    justifyContent: 'center',
    flex: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  summaryBox: {
    flex: 1,
    padding: Spacing.md,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: "600",
    textTransform: 'uppercase',
  },
  summaryNumber: {
    fontSize: Typography.fontSize.xl,
    fontWeight: "700",
    color: Colors.dark.main,
    marginTop: 4
  },
  dayCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  dayAmountContainer: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  dayDate: {
    fontSize: Typography.fontSize.base,
    fontWeight: "700",
    color: Colors.dark.main
  },
  dayBills: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: 2
  },
  dayAmount: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "700",
    color: Colors.primary.main
  },
  monthCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  monthCardExpanded: {
    backgroundColor: '#fff',
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "700",
    color: Colors.dark.main
  },
  monthSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: 4,
    marginLeft: 28,
  },
  expandedContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  expandedBox: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  expandedLabel: {
    color: "#fff",
    fontSize: Typography.fontSize.xs,
    fontWeight: "600",
    textTransform: 'uppercase',
  },
  expandedValue: {
    color: "#fff",
    fontSize: Typography.fontSize.xl,
    fontWeight: "700",
    marginTop: 4
  },
  summaryCard: {
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: "600",
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: "bold",
    color: "#fff",
    marginTop: Spacing.xs
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "800",
    marginBottom: Spacing.sm,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  transactionCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderColor: Colors.border.light,
    borderWidth: 1,
  },
  salesCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    flex: Screen.isTablet ? 0.485 : 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
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
    gap: Spacing.md
  },
  nameContainer: {
    flex: 1,
  },
  amountContainer: {
    alignItems: 'flex-end',
    minWidth: 90,
    marginLeft: Spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primary.lightest,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontWeight: "700",
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base
  },
  time: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  amount: {
    color: Colors.primary.main,
    fontWeight: "700",
    fontSize: Typography.fontSize.base,
    textAlign: "right",
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
  },
  typeCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.main,
    backgroundColor: Colors.background.primary,
  },
  typeCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  typeBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  typeBadgeText: {
    fontSize: Typography.fontSize.base,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: Typography.fontSize.base,
    fontWeight: "700",
    color: Colors.dark.main,
  },
  typeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  typeMeta: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: "500",
  },
  typeAmountBox: {
    alignItems: "flex-end",
  },
  typeAmount: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "800",
  },
  typeAmountLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: "500",
    marginTop: 2,
  },
});
