import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";

const API_URLS = {
  today: "https://taskprime.app/api/salestoday/",
  month: "https://taskprime.app/api/purchasetoday/",
  item: "https://taskprime.app/api/get-item-report/",
};

export default function SalesReportScreen() {
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState("today");
  const [salesData, setSalesData] = useState([]);
  const [user, setUser] = useState(null);
  const router = useRouter();

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
      const json = await response.json();

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

  // Calculate total
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
        <Text style={styles.amount}>₹{item.nettotal}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Sales</Text>
        <Ionicons name="filter-outline" size={22} color="#333" />
      </View>

      {/* Dropdown */}
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedSummary}
          onValueChange={setSelectedSummary}
          style={styles.picker}
        >
          <Picker.Item label="Today Summary" value="today" />
          <Picker.Item label="purchase Summary" value="month" />
          <Picker.Item label="Item Summary" value="item" />
        </Picker>
      </View>

      {/* Loading / Data */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF914D" />
        </View>
      ) : salesData.length === 0 ? (
        <View style={styles.centered}>
          <Text>No sales data available.</Text>
        </View>
      ) : (
        <>
          {/* Top Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Total Sales Today</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalValue}>₹{totalSales.toFixed(2)}</Text>
              {/* <Text style={styles.growthText}>↑ 12%</Text> */}
            </View>
          </View>

          {/* All Transactions */}
          <Text style={styles.sectionTitle}>All Transactions</Text>

          <FlatList
            data={salesData}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 50 }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginBottom: 15,
  },
  picker: { color: "#333" },
  summaryCard: {
    backgroundColor: "#fee9daff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
    
  },
  summaryTitle: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
   
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 6,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
  },
  growthText: {
    color: "green",
    fontWeight: "600",
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: "#000",
  },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
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
  row: { flexDirection: "row", justifyContent: "space-between", flex: 1 },
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
  },
  centered: { alignItems: "center", marginTop: 50 },
});
