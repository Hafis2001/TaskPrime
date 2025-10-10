import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";

export default function DebtorsScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [rawJson, setRawJson] = useState(null);

  const fetchDebtors = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      console.log("🔑 Retrieved token:", token);

      const response = await fetch("https://taskprime.app/api/debtors/get-debtors/", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      console.log("📡 API Status:", response.status);
      const result = await response.json();
      console.log("✅ API Response:", result);
      setRawJson(result);

      let arrayData = [];
      if (Array.isArray(result)) arrayData = result;
      else if (Array.isArray(result.data)) arrayData = result.data;
      else if (Array.isArray(result.results)) arrayData = result.results;

      const formatted = arrayData
        .map((item) => ({
          id: item.code || item.id || Math.random().toString(),
          name: item.name ?? "-",
          place: item.place ?? "-",
          phone: item.phone ?? "-",
          balance: Math.round(Number(item.balance ?? 0)), // 👈 remove decimals
        }))
        .filter((i) => i.balance > 0);

      console.log("📊 Parsed Data:", formatted);
      setData(formatted);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6600" />
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <ScrollView style={{ padding: 20 }}>
        <Text style={{ fontWeight: "bold", color: "red" }}>
          ⚠️ No data displayed. API Raw Output:
        </Text>
        <Text selectable style={{ fontFamily: "monospace", fontSize: 12 }}>
          {JSON.stringify(rawJson, null, 2)}
        </Text>
      </ScrollView>
    );
  }

  const filtered = data.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.place.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBalance = filtered.reduce((a, b) => a + (b.balance || 0), 0);

  const renderCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={{ flex: 3 }}>
          <Text style={styles.cardValue}>{item.name}</Text>
          <Text style={styles.subText}>{item.phone}</Text>
          <Text style={styles.subText}>{item.place}</Text>
        </View>
        <View style={styles.balanceContainer}>
          {/* 👇 No decimals here */}
          <Text style={styles.balanceText}>₹{item.balance}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debtors Statement</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Stores</Text>
          <Text style={styles.summaryValue}>{filtered.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Balance</Text>
          {/* 👇 Rounded total balance */}
          <Text style={styles.summaryValue}>₹{Math.round(totalBalance)}</Text>
        </View>
      </View>

      <TextInput
        style={styles.searchBox}
        placeholder="Search by Name, Place or Phone"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <View style={styles.headingCard}>
        <Text style={[styles.headingText, { flex: 3 }]}>Name</Text>
        <Text style={[styles.headingText, { flex: 1, textAlign: "right" }]}>
          Balance
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
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
  cardValue: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  subText: { fontSize: 13, color: "#6b7280", marginBottom: 2 },
  balanceContainer: { justifyContent: "center", alignItems: "flex-end", flex: 1 },
  balanceText: { fontSize: 18, fontWeight: "bold", color: "#ff6600" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
