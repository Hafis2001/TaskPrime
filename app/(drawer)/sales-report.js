import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
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
};

export default function SalesReportScreen() {
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState("today");
  const [salesData, setSalesData] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    const init = async () => {
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
    init();
  }, [selectedSummary]);

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
        setSalesData([json.data]);
      } else {
        setSalesData([]);
      }
    } catch (error) {
      console.error("❌ Fetch error:", error);
      setSalesData([]);
    } finally {
      setLoading(false);
    }
  };

  const totalSales = salesData.reduce(
    (sum, item) => sum + parseFloat(item.nettotal || 0),
    0
  );

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
            ₹{parseFloat(item.nettotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
            ₹{parseFloat(item.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                    ₹{parseFloat(item.total_amount).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
          </ModernCard>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Sales Report"
        leftIcon={<Ionicons name="menu-outline" size={26} color={Colors.primary.main} />}
        onLeftPress={() => navigation.toggleDrawer()}
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
            onValueChange={(value) => setSelectedSummary(value)}
            value={selectedSummary}
            placeholder={{}}
            items={[
              { label: "Today Sales", value: "today" },
              { label: "Day Wise Sales", value: "DayWise" },
              { label: "Month Wise Sales", value: "item" },
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
                  ₹{salesData
                    .reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0)
                    .toFixed(2)}
                </Text>
              </ModernCard>
            </View>

            <FlatList
              data={salesData}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderDayWise}
              contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
              showsVerticalScrollIndicator={false}
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
          />
        ) : (
          <>
            <ModernCard style={styles.summaryCard} gradient padding={Spacing.xl}>
              <Text style={styles.summaryTitle}>Total Sales Today</Text>
              <Text style={styles.totalValue}>₹{totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
            </ModernCard>

            <Text style={styles.sectionTitle}>All Transactions</Text>
            <FlatList
              data={salesData}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
              showsVerticalScrollIndicator={false}
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
});
