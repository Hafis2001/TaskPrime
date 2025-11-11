import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://taskprime.app/api/sales-return/get-data/?client_id=SYSMAC";

export default function SalesReturnScreen() {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    getClientIdAndFetch();
  }, []);

  const getClientIdAndFetch = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (!storedUser) {
        Alert.alert("Error", "Client ID not found. Please log in again.");
        setLoading(false);
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      const storedClientId = parsedUser?.clientId;

      if (!storedClientId) {
        Alert.alert("Error", "Client ID missing in user data. Please log in again.");
        setLoading(false);
        return;
      }

      setClientId(storedClientId);
      fetchSalesReturnData(storedClientId);
    } catch (error) {
      console.error("Error fetching client ID:", error);
      setLoading(false);
    }
  };

  const fetchSalesReturnData = async (storedClientId) => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      const result = await response.json();

      if (result && result.success && result.client_id === storedClientId) {
        const data = Array.isArray(result.data) ? result.data : [];
        setSalesData(data);
        const total = data.reduce((sum, item) => sum + (item.net || 0), 0);
        setTotalAmount(total);
      } else {
        console.error("Client ID mismatch or invalid response:", result);
        Alert.alert("No Data", "No sales return data found for your account.");
        setSalesData([]);
      }
    } catch (error) {
      console.error("Error fetching sales return data:", error);
      Alert.alert("Error", "Failed to load sales return data.");
      setSalesData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="storefront-outline" size={24} color="#ff7a00" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.customerName}>{item.customername}</Text>
        <Text style={styles.dateText}>
          {formatDate(item.date)} • #{item.invno}
        </Text>
      </View>
      <Text style={styles.amountText}>{parseFloat(item.net).toFixed(2)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View >
        <Text style={styles.headerTitle}> Sales Return</Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Invoice</Text>
          <Text style={styles.summaryValue}>{salesData.length}</Text>
        </View>
        <View style={[styles.summaryCard, styles.activeCard]}>
          <Text style={[styles.summaryLabel, styles.activeText]}>Total Amount</Text>
          <Text style={[styles.summaryValue, styles.activeText]}>
            {totalAmount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      </View>

      {/* Data */}
      {loading ? (
        <ActivityIndicator size="large" color="#ff7a00" style={{ marginTop: 20 }} />
      ) : salesData.length === 0 ? (
        <Text style={styles.noDataText}>No sales return data found.</Text>
      ) : (
        <FlatList
          data={salesData}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fefdfcff",
    
  },
  headerTitle: { color: "#f9742dff", fontSize: 18, fontWeight: "600", marginLeft: 120 },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
    marginBottom: 10,
  },
  summaryCard: {
    width: "45%",
    backgroundColor: "#fff",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  activeCard: { backgroundColor: "#ff7a00" },
  summaryLabel: { fontSize: 14, color: "#555" },
  summaryValue: { fontSize: 20, fontWeight: "700", marginTop: 5 },
  activeText: { color: "#fff" },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginVertical: 6,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  iconContainer: {
    backgroundColor: "#fff3e6",
    padding: 10,
    borderRadius: 50,
  },
  textContainer: { flex: 1, marginLeft: 12 },
  customerName: { fontSize: 16, fontWeight: "600", color: "#222" },
  dateText: { fontSize: 13, color: "#777", marginTop: 3 },
  amountText: { fontSize: 18, fontWeight: "600", color: "#f88126ff",marginTop:9, },
  noDataText: { textAlign: "center", color: "#666", marginTop: 40, fontSize: 15 },
});
