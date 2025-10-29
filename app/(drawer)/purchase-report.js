import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RNPickerSelect from "react-native-picker-select";
import { useRouter, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_URLS = {
  today: "https://taskprime.app/api/purchasetoday/",
  month: "https://taskprime.app/api/purchasemonth/",
  overall: "https://taskprime.app/api/purchaseoverall/",
};

export default function PurchaseReportScreen() {
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState("today");
  const [purchaseData, setPurchaseData] = useState([]);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Custom Header
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <View>
          <View style={{ height: 20, backgroundColor: "#ff6600" }} />
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
              <Ionicons name="menu-outline" size={26} color="#ff6600" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Purchase Report</Text>
          </View>
        </View>
      ),
    });
  }, [navigation, insets]);

  // Fetch data
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
        setPurchaseData(json.data);
      } else if (json.data) {
        setPurchaseData([json.data]);
      } else {
        setPurchaseData([]);
      }
    } catch (error) {
      console.error("❌ Fetch error:", error);
      setPurchaseData([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total
  const totalPurchase = purchaseData.reduce(
    (sum, item) => sum + parseFloat(item.nettotal || 0),
    0
  );

  // Render item
  const renderItem = ({ item }) => (
    <View style={styles.transactionCard}>
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="cart-outline" size={20} color="#FF914D" />
          </View>
          <View>
            <Text style={styles.name}>{item.suppliername}</Text>
            <Text style={styles.time}>Bill No: {item.billno}</Text>
          </View>
        </View>
        <Text style={styles.amount}>₹{item.nettotal}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Dropdown - identical look for iOS & Android */}
      <View style={styles.pickerWrapper}>
        <RNPickerSelect
          onValueChange={(value) => setSelectedSummary(value)}
          value={selectedSummary}
          placeholder={{}}
          items={[
            { label: "Today's Purchase", value: "today" },
            { label: "Monthly Purchase", value: "month" },
            { label: "Overall Summary", value: "overall" },
          ]}
          style={{
            inputIOS: styles.inputIOS,
            inputAndroid: styles.inputAndroid,
            iconContainer: { top: 18, right: 15 },
          }}
          useNativeAndroidPickerStyle={false}
          Icon={() => <Ionicons name="chevron-down" size={20} color="#666" />}
        />
      </View>

      {/* Loading / Data */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF914D" />
        </View>
      ) : purchaseData.length === 0 ? (
        <View style={styles.centered}>
          <Text>No purchase data available.</Text>
        </View>
      ) : (
        <>
          {/* Top Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Total Purchase</Text>
            <Text style={styles.totalValue}>₹{totalPurchase.toFixed(2)}</Text>
          </View>

          {/* All Transactions */}
          <Text style={styles.sectionTitle}>All Purchases</Text>
          <FlatList
            data={purchaseData}
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

  pickerWrapper: {
    backgroundColor: "#FFF8F3",
    borderRadius: 12,
    marginBottom: 15,
  },

  inputIOS: {
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    color: "#333",
    backgroundColor: "#FFF8F3",
    fontWeight: "500",
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    color: "#333",
    backgroundColor: "#FFF8F3",
    fontWeight: "500",
    paddingRight: 30,
  },

  summaryCard: {
    backgroundColor: "#FEEBDD",
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
  totalValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginTop: 5,
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
  amount: { color: "#FF914D", fontWeight: "700", fontSize: 15 },
  centered: { alignItems: "center", marginTop: 50 },
});
