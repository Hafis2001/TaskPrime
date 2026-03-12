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
  today: "https://taskprime.app/api/salestoday-details/",
  DayWise: "https://taskprime.app/api/salesdaywise/",
  item: "https://taskprime.app/api/salesmonthwise/",
  typeWise: "https://taskprime.app/api/salestoday-typewise/",
  userSummary: "https://taskprime.app/api/get_sales_today_usersummary",
};

export default function SalesReportScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState("today");
  const [salesData, setSalesData] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [user, setUser] = useState(null);
  const [isLicensed, setIsLicensed] = useState(null);
  const [todayGrandTotal, setTodayGrandTotal] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalBills, setTotalBills] = useState(0);
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
        console.log("👉 Sales Report Focused - running runCheck");
        setIsLicensed(null);
        await new Promise(r => setTimeout(r, 50)); // Force React to paint spinner
        const allowed = await checkModule("MOD017", "Sales Report", () => {
          router.push("/(drawer)/(tabs)"); // use push instead of replace to avoid breaking drawer
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
        console.log("âŒ Server did not return JSON:", text);
        setSalesData([]);
        return;
      }

      const json = JSON.parse(text);
      if (json.success && Array.isArray(json.data)) {
        let processedData = [...json.data];

        // Sort month-wise data by latest month first
        if (type === "item") {
          processedData.sort((a, b) => {
            const valA = new Date(a.date || a.mdate || a.month_name).getTime();
            const valB = new Date(b.date || b.mdate || b.month_name).getTime();
            if (isNaN(valA) || isNaN(valB)) return 0;
            return valB - valA;
          });

          // Fallback: If sorting didn't change the order (likely due to unparseable dates),
          // reverse it assuming the API returns chronological order (oldest first).
          if (JSON.stringify(processedData) === JSON.stringify(json.data)) {
            processedData.reverse();
          }
        }

        setSalesData(processedData);
        if (type === "today" && json.grand_total !== undefined) {
          setTodayGrandTotal(json.grand_total);
        } else if (type === "userSummary") {
          setTodayGrandTotal(json.grand_total ?? 0);
          setTotalUsers(json.total_users ?? 0);
          setTotalBills(json.total_bills ?? 0);
        } else {
          setTodayGrandTotal(null);
          setTotalUsers(0);
          setTotalBills(0);
        }
      } else if (json.data) {
        let processedData = Array.isArray(json.data) ? [...json.data] : [json.data];
        if (type === "item" && processedData.length > 1) {
          processedData.sort((a, b) => {
            const valA = new Date(a.date || a.mdate || a.month_name).getTime();
            const valB = new Date(b.date || b.mdate || b.month_name).getTime();
            if (isNaN(valA) || isNaN(valB)) return 0;
            return valB - valA;
          });
          if (JSON.stringify(processedData) === JSON.stringify(Array.isArray(json.data) ? json.data : [json.data])) {
            processedData.reverse();
          }
        }
        setSalesData(processedData);
      } else {
        setSalesData([]);
      }
    } catch (error) {
      console.error("âŒ Fetch error:", error);
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
            <Ionicons name="person-outline" size={20} color={Colors.primary.main} />
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.name} numberOfLines={1}>{item.customername?.trim() || "Customer"}</Text>
            <Text style={styles.time}>Bill #{item.billno}  •  {item.userid}</Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount} numberOfLines={1}>
            {parseFloat(item.nettotal || 0).toFixed(3)}
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
            {Math.floor(parseFloat(item.total_amount)).toFixed(3)}
          </Text>
        </View>
      </View>
    </ModernCard>
  );

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const renderMonthWise = ({ item, index }) => {
    const isExpanded = expandedId === (item.id || item.month_name || index);
    return (
      <View style={{ marginBottom: Spacing.lg }}>
        <TouchableOpacity
          onPress={() => toggleExpand(item.id || item.month_name || index)}
          activeOpacity={0.9}
        >
          <ModernCard style={[styles.monthCard, isExpanded && { borderColor: Colors.primary.main, borderWidth: 1 }]} elevated={!isExpanded}>
            <View style={styles.monthHeader}>
              <View style={styles.monthTitleRow}>
                <View style={[styles.iconCircle, { width: 44, height: 44, marginRight: 12 }]}>
                  <Ionicons name="calendar-sharp" size={22} color={Colors.primary.main} />
                </View>
                <View>
                  <Text style={styles.monthTitle}>{item.month_name}</Text>
                  <Text style={[styles.monthSubtitle, { marginLeft: 0, marginTop: 2 }]}>
                    {item.total_bills} Transactions
                  </Text>
                </View>
              </View>
              <View style={[styles.iconCircle, { width: 32, height: 32, backgroundColor: isExpanded ? Colors.primary.main : '#F8FAFC' }]}>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={isExpanded ? "#fff" : Colors.text.secondary}
                />
              </View>
            </View>

            {isExpanded && (
              <View style={[styles.expandedContainer, { marginTop: 20 }]}>
                <LinearGradient
                  colors={['#4F46E5', '#6366F1']}
                  style={[styles.expandedBox, { borderRadius: 16 }]}
                >
                  <Text style={styles.expandedLabel}>Total Bills</Text>
                  <Text style={styles.expandedValue}>{item.total_bills}</Text>
                </LinearGradient>
                <LinearGradient
                  colors={['#10B981', '#34D399']}
                  style={[styles.expandedBox, { borderRadius: 16 }]}
                >
                  <Text style={styles.expandedLabel}>Total Amount</Text>
                  <Text style={styles.expandedValue}>
                    {Math.floor(parseFloat(item.total_amount)).toFixed(3)}
                  </Text>
                </LinearGradient>
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
      <ModernCard style={[styles.typeCard, { borderLeftColor: color.bg, backgroundColor: '#fff', padding: Spacing.lg }]} elevated={false}>
        <View style={styles.typeCardInner}>
          <View style={[styles.typeBadge, { backgroundColor: color.light, shadowColor: color.bg, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 }]}>
            <Text style={[styles.typeBadgeText, { color: color.bg, fontSize: 18 }]}>{item.type}</Text>
          </View>
          <View style={styles.typeInfo}>
            <Text style={[styles.typeName, { fontSize: 16 }]}>{item.type_name || item.name}</Text>
            <View style={styles.typeMetaRow}>
              <Ionicons name="stats-chart" size={13} color={Colors.text.secondary} />
              <Text style={[styles.typeMeta, { fontWeight: '700' }]}>{item.bill_count || item.billcount} Bills</Text>
            </View>
          </View>
          <View style={styles.typeAmountBox}>
            <Text style={[styles.typeAmount, { color: color.bg, fontSize: 20 }]}>
              {Math.floor(parseFloat(item.total_amount || item.nettotal || 0)).toFixed(3)}
            </Text>
            <Text style={styles.typeAmountLabel}>Grand Total</Text>
          </View>
        </View>
      </ModernCard>
    );
  };

  const renderUserSummary = ({ item, index }) => {
    const color = TYPE_COLORS[index % TYPE_COLORS.length];
    return (
      <ModernCard style={[styles.typeCard, { borderLeftColor: color.bg }]} elevated={false}>
        <View style={styles.typeCardInner}>
          <View style={[styles.typeBadge, { backgroundColor: color.light }]}>
            <Ionicons name="person" size={14} color={color.bg} />
          </View>
          <View style={styles.typeInfo}>
            <Text style={styles.typeName}>{item.userid}</Text>
            <View style={styles.typeMetaRow}>
              <Ionicons name="receipt-outline" size={13} color={Colors.text.secondary} />
              <Text style={styles.typeMeta}>{item.bill_count} Bills</Text>
            </View>
          </View>
          <View style={styles.typeAmountBox}>
            <Text style={[styles.typeAmount, { color: color.bg }]}>
              {Math.floor(parseFloat(item.total_amount || 0)).toFixed(3)}
            </Text>
            <Text style={styles.typeAmountLabel}>User Total</Text>
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
        onLeftPress={() => router.push("/(drawer)/(tabs)")}
      />

      <View style={styles.content}>
        {/* âœ… Gradient Dropdown Section */}
        <LinearGradient
          colors={[Colors.primary.main, Colors.primary.dark]}
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
              { label: "Today's User Summary", value: "userSummary" },
            ]}
            style={{
              inputIOS: styles.inputGradient,
              inputAndroid: styles.inputGradient,
              iconContainer: { top: 12, right: 15 },
            }}
            useNativeAndroidPickerStyle={false}
            Icon={() => <Ionicons name="filter" size={18} color="#fff" />}
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
                  {Math.floor(salesData
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
                {Math.floor(totalSales).toFixed(3)}
              </Text>
              <Text style={[styles.summaryTitle, { marginTop: 4 }]}>
                {salesData.reduce((sum, i) => sum + parseInt(i.bill_count || i.billcount || 0), 0)} Total Bills
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
        ) : selectedSummary === "userSummary" ? (
          <>
            <ModernCard style={styles.summaryCard} gradient padding={Spacing.xl}>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryTitle}>Total Users</Text>
                  <Text style={styles.totalValue}>{totalUsers}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryTitle}>Total Bills</Text>
                  <Text style={styles.totalValue}>{totalBills}</Text>
                </View>
              </View>
              <View style={[styles.summarySeparator, { marginVertical: 12 }]} />
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.summaryTitle}>Today Grand Total</Text>
                <Text style={[styles.totalValue, { fontSize: 24 }]}>
                  {Math.floor(todayGrandTotal || totalSales).toFixed(3)}
                </Text>
              </View>
            </ModernCard>
            <Text style={styles.sectionTitle}>User-wise Breakdown</Text>
            <FlatList
              data={salesData}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderUserSummary}
              contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} />}
            />
          </>
        ) : (
          <>
            <ModernCard style={styles.summaryCard} gradient padding={Spacing.xl}>
              <Text style={styles.summaryTitle}>Total Sales Today</Text>
              <Text style={[styles.totalValue, { fontSize: 32, marginTop: 10 }]}>
                {Math.floor(todayGrandTotal ?? totalSales).toFixed(3)}
              </Text>
              <View style={[styles.summarySeparator, { marginVertical: 15, opacity: 0.3 }]} />
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryTitle, { fontSize: 10 }]}>Transactions</Text>
                  <Text style={[styles.totalValue, { fontSize: 20 }]}>{salesData.length}</Text>
                </View>
                <View style={[styles.summarySeparator, { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryTitle, { fontSize: 10 }]}>Status</Text>
                  <Text style={[styles.totalValue, { fontSize: 14, textTransform: 'uppercase' }]}>Live</Text>
                </View>
              </View>
            </ModernCard>

            <Text style={styles.sectionTitle}>Transaction Feed</Text>
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
    backgroundColor: "#FFF9F5", // Soft modern peach/orange tint
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    paddingTop: 8,
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
    borderRadius: 24, // More rounded for modern feel
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.md,
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
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FFE4D1',
    ...Shadows.sm,
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
    fontWeight: "800",
    color: Colors.dark.main,
    letterSpacing: 0.3,
  },
  dayBills: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: '600',
    marginTop: 4
  },
  dayAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.primary.main
  },
  monthCard: {
    padding: Spacing.lg,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FFE4D1',
    minHeight: 80,
    ...Shadows.sm,
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
    marginBottom: Spacing.xl,
    borderRadius: 28,
    ...Shadows.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summarySeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: '80%',
  },
  summaryTitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: "800",
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    marginBottom: Spacing.md,
    color: Colors.primary.dark,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginLeft: 8,
  },
  transactionCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE4D1',
    ...Shadows.sm,
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
    width: 48,
    height: 48,
    backgroundColor: '#FFF5ED',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE4D1',
  },
  name: {
    fontWeight: "800",
    color: Colors.dark.main,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  time: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  amount: {
    color: Colors.primary.main,
    fontWeight: "900",
    fontSize: 18,
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

