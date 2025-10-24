import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

const API_URL = "https://taskprime.app/api/debtors/get-debtors/";

export default function DebtorsScreen() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalStores, setTotalStores] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [rawJson, setRawJson] = useState(null);
  const router = useRouter();

  // ✅ Handle Android back button
  useEffect(() => {
    const backAction = () => {
      router.replace("/company-info");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, []);

  // ✅ Fetch data
  const fetchDebtors = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        setLoading(false);
        return;
      }

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error("Invalid JSON:", text.slice(0, 200));
        Alert.alert("Server Error", "Received invalid response from the server.");
        setLoading(false);
        return;
      }

      setRawJson(result);
      let arrayData = [];
      if (Array.isArray(result)) arrayData = result;
      else if (Array.isArray(result.data)) arrayData = result.data;
      else if (Array.isArray(result.results)) arrayData = result.results;

      const formatted = arrayData
        .map((item) => {
          let name = item.name ?? "-";
          name = name.replace(/^\(.*?\)\s*/g, "").trim();
          name = name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
          const balance = Math.round(Number(item.balance ?? 0));
          return {
            id: item.code || item.id || Math.random().toString(),
            name,
            place: item.place ?? "-",
            phone: item.phone ?? "-",
            balance,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setData(formatted);
      setFiltered(formatted);
      setTotalStores(formatted.length);
      const totalBal = formatted.reduce((sum, c) => sum + c.balance, 0);
      setTotalBalance(totalBal);
    } catch (error) {
      console.error("🔥 Error fetching customers:", error);
      Alert.alert("Network Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtors();
  }, []);

  useEffect(() => {
    const filteredData = data.filter(
      (i) =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.place.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.phone.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFiltered(filteredData);
  }, [searchQuery, data]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6600" />
      </View>
    );
  }

  if (filtered.length === 0) {
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

  // ✅ Card UI
  const renderCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={{ flex: 3, paddingRight: 8 }}>
          <Text style={styles.cardValue} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text style={styles.subText}>{item.phone}</Text>
          <Text style={styles.subText}>{item.place}</Text>
        </View>
        <View style={styles.balanceContainer}>
          <Text
            style={[
              styles.balanceText,
              { color: item.balance < 0 ? "red" : "#ff6600" },
            ]}
            numberOfLines={1}
            ellipsizeMode="clip"
            adjustsFontSizeToFit={true}
          >
            ₹{item.balance.toLocaleString("en-IN")}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customers Statement</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Stores</Text>
          <Text style={styles.summaryValue}>{totalStores}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Balance</Text>
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
        <Text
          style={[styles.headingText, { flex: 1, textAlign: "right" }]}
          numberOfLines={1}
        >
          Balance
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        contentContainerStyle={{ paddingBottom: 100 }}
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
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardValue: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  subText: { fontSize: 13, color: "#6b7280", marginBottom: 2 },
  balanceContainer: {
    justifyContent: "center",
    alignItems: "flex-end",
    flexShrink: 1,
    flexBasis: 100,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "right",
    includeFontPadding: false,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
