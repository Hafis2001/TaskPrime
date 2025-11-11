import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
      header: () => (
        <View>
          <View style={{ height: insets.top, backgroundColor: "#ff6600" }} />
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
              <Ionicons name="menu-outline" size={26} color="#ff6600" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sales Report</Text>
          </View>
        </View>
      ),
    });
  }, [navigation, insets]);

  useEffect(() => {
    const init = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      if (!storedUser) {
        router.replace("/LoginScreen");
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
    <View style={styles.transactionCard}>
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="receipt-outline" size={20} color="#FF914D" />
          </View>
          <View>
            <Text style={styles.name}>{item.customername}</Text>
            <Text style={styles.time}>Bill No: {item.billno}</Text>
          </View>
        </View>
        <Text style={styles.amount}>
          Total Amount: {parseFloat(item.nettotal || 0).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  const renderDayWise = ({ item }) => (
    <View style={styles.dayCard}>
      <View style={styles.dayRow}>
        <View>
          <Text style={styles.dayDate}>
            {new Date(item.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
          <Text style={styles.dayBills}>{item.total_bills} Bills</Text>
        </View>
        <Text style={styles.dayAmount}>
          {parseFloat(item.total_amount).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const renderMonthWise = ({ item }) => {
    const isExpanded = expandedId === item.id;
    return (
      <View style={styles.monthCard}>
        <TouchableOpacity onPress={() => toggleExpand(item.id)}>
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>{item.month_name}</Text>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#333"
            />
          </View>
          <Text style={styles.monthSubtitle}>Tap to see details</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContainer}>
            <View style={styles.expandedBox}>
              <Text style={styles.expandedLabel}>Total Bills</Text>
              <Text style={styles.expandedValue}>{item.total_bills}</Text>
            </View>
            <View style={styles.expandedBox}>
              <Text style={styles.expandedLabel}>Total Amount</Text>
              <Text style={styles.expandedValue}>
                {parseFloat(item.total_amount).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ✅ Gradient Dropdown Section */}
      <LinearGradient
        colors={["#fb6c13ff", "#fad13eff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
          <ActivityIndicator size="large" color="#FF914D" />
        </View>
      ) : salesData.length === 0 ? (
        <View style={styles.centered}>
          <Text>No sales data available.</Text>
        </View>
      ) : selectedSummary === "DayWise" ? (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Total Bills</Text>
              <Text style={styles.summaryNumber}>
                {salesData.reduce((sum, i) => sum + (i.total_bills || 0), 0)}
              </Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryNumber}>
                
                {salesData
                  .reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0)
                  .toFixed(2)}
              </Text>
            </View>
          </View>

          <FlatList
            data={salesData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderDayWise}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : selectedSummary === "item" ? (
        <FlatList
          data={salesData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMonthWise}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Total Sales Today</Text>
            <Text style={styles.totalValue}>{totalSales.toFixed(2)}</Text>
          </View>

          <Text style={styles.sectionTitle}>All Transactions</Text>
          <FlatList
            data={salesData}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
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
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 2,
  },
  inputGradient: {
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: "#fff",
    fontWeight: "600",
    backgroundColor: "transparent",
  },
  centered: { alignItems: "center", marginTop: 50 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "#FFF8F3",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 5,
    alignItems: "center",
  },
  summaryLabel: { fontSize: 14, color: "#777", fontWeight: "500" },
  summaryNumber: { fontSize: 22, fontWeight: "700", color: "#000", marginTop: 4 },
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f1f1f1",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayDate: { fontSize: 15, fontWeight: "700", color: "#000" },
  dayBills: { fontSize: 13, color: "#777", marginTop: 2 },
  dayAmount: { fontSize: 16, fontWeight: "700", color: "#FF914D" },
  monthCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f1f1",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthTitle: { fontSize: 16, fontWeight: "700", color: "#000" },
  monthSubtitle: { fontSize: 13, color: "#777", marginTop: 2 },
  expandedContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  expandedBox: {
    flex: 1,
    backgroundColor: "#FF914D",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginHorizontal: 5,
  },
  expandedLabel: { color: "#fff", fontSize: 13, fontWeight: "500" },
  expandedValue: { color: "#fff", fontSize: 22, fontWeight: "700", marginTop: 4 },
  summaryCard: {
    backgroundColor: "#FEEBDD",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  summaryTitle: { fontSize: 14, color: "#555", fontWeight: "500" },
  totalValue: { fontSize: 28, fontWeight: "bold", color: "#000", marginTop: 5 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, color: "#000" },
  transactionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f1f1f1",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconCircle: {
    backgroundColor: "#FFE6D4",
    padding: 10,
    borderRadius: 50,
  },
  name: { fontWeight: "600", color: "#000", fontSize: 15 },
  time: { color: "#777", fontSize: 12 },
  amount: {
    color: "#FF914D",
    fontWeight: "700",
    fontSize: 15,
    textAlign: "right",
  },
});
