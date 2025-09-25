import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

export default function DebtorsScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDebtors = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        setLoading(false);
        return;
      }

      const response = await fetch("https://taskprime.app/api/get-debtors-data/", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        Alert.alert("Error", "Failed to fetch debtors. Please try again.");
        setLoading(false);
        return;
      }

      const result = await response.json();
      let normalizedData = [];

      if (Array.isArray(result)) {
        normalizedData = result;
      } else if (result.data && Array.isArray(result.data)) {
        normalizedData = result.data;
      } else if (typeof result === "object" && result.code) {
        normalizedData = [result];
      }

      const formattedData = normalizedData
        .map((item) => {
          const debit = Number(item.master_debit ?? 0);
          const credit = Number(item.master_credit ?? 0);
          const balance = debit - credit;

          return {
            id: item.code,
            name: item.name ?? "-",
            place: item.place ?? "-",
            phone: item.phone2 ?? "-",
            balance: isNaN(balance) ? 0 : balance,
          };
        })
        .filter((item) => item.balance > 0);

      setData(formattedData);
    } catch (error) {
      console.error("🔥 Error fetching debtors:", error);
      Alert.alert("Network Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtors();
  }, []);

  const filteredData = data.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.place?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBalance = filteredData.reduce((sum, d) => sum + (d.balance ?? 0), 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6600" />
      </View>
    );
  }

  const renderCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={{ flex: 3 }}>
          <Text style={styles.cardValue} numberOfLines={2} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text style={styles.subText}>{item.phone}</Text>
          <Text style={styles.subText}>{item.place}</Text>
        </View>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₹{Math.round(item.balance)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debtors Statement</Text>

      {/* 🔥 Top Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Stores</Text>
          <Text style={styles.summaryValue}>{filteredData.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Balance</Text>
          <Text style={styles.summaryValue}>₹{Math.round(totalBalance)}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <TextInput
        style={styles.searchBox}
        placeholder="Search by Name, Place or Phone"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Table Heading Card */}
      <View style={styles.headingCard}>
        <Text style={[styles.headingText, { flex: 3 }]}>Name</Text>
        <Text style={[styles.headingText, { flex: 1, textAlign: "right" }]}>
          Balance
        </Text>
      </View>

      {/* Cards List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderCard}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#ff6600",
  },
  summaryCard: {
    backgroundColor: "#fffaf5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryLabel: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  summaryValue: { fontSize: 18, fontWeight: "bold", color: "#ff6600" },
  searchBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  headingCard: {
    flexDirection: "row",
    backgroundColor: "#ffe6cc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  headingText: { fontWeight: "bold", fontSize: 15, color: "#ff6600" },
  card: {
    backgroundColor: "#fffaf5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  cardValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    flexWrap: "wrap",
  },
  subText: { fontSize: 13, color: "#6b7280", marginBottom: 2 },
  balanceContainer: { justifyContent: "center", alignItems: "flex-end", flex: 1 },
  balanceText: { fontSize: 18, fontWeight: "bold", color: "#ff6600" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
