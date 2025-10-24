import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  BackHandler,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";

const API_URL = "https://taskprime.app/api/suppiers_api/suppliers/";

export default function SuppliersScreen() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  const fetchSuppliers = async () => {
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

      let arrayData = [];
      if (Array.isArray(result)) arrayData = result;
      else if (Array.isArray(result.data)) arrayData = result.data;
      else if (Array.isArray(result.results)) arrayData = result.results;

      const formatted = arrayData
        .map((item) => {
          let name = item.name ?? "-";
          name = name.replace(/^\(.*?\)\s*/g, "").trim();
          name = name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

          const credit = Math.round(Number(item.credit ?? 0));
          const debit = Math.round(Number(item.debit ?? 0));
          const balance = Math.round(credit - debit);

          return {
            id: item.code || item.id || Math.random().toString(),
            name,
            place: item.place ?? "-",
            phone: item.phone2 ?? "-",
            credit,
            debit,
            balance,
          };
        })
        .filter((item) => item.balance !== 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      setData(formatted);
      setFiltered(formatted);
      setTotalSuppliers(formatted.length);

      const totalBal = formatted.reduce((sum, c) => sum + c.balance, 0);
      setTotalBalance(Math.round(totalBal));
    } catch (error) {
      console.error("🔥 Error fetching suppliers:", error);
      Alert.alert("Network Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
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

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.push("/(drawer)/company-info");
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [router])
  );

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
        <Text style={{ fontWeight: "bold", color: "red" }}>⚠️ No data found :</Text>
      </ScrollView>
    );
  }

  const renderCard = ({ item }) => {
    const isNegative = item.balance < 0;
    const formattedBalance = Math.abs(item.balance).toLocaleString("en-IN");
    const displayText = isNegative ? `-₹${formattedBalance}` : `₹${formattedBalance}`;

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={{ flex: 3 }}>
            <Text style={styles.cardValue}>{item.name}</Text>
            <Text style={styles.subText}>{item.phone}</Text>
            <Text style={styles.subText}>{item.place}</Text>
          </View>
          <View style={styles.balanceContainer}>
            <Text
              style={[styles.balanceText, { color: isNegative ? "red" : "green" }]}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {displayText}
            </Text>
          </View>
        </View>
        <View style={styles.creditDebitRow}>
          <Text style={[styles.subText, { color: "green" }]}>
            Credit: ₹{item.credit.toLocaleString("en-IN")}
          </Text>
          <Text style={[styles.subText, { color: "red" }]}>
            Debit: ₹{item.debit.toLocaleString("en-IN")}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Suppliers Statement</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Suppliers</Text>
          <Text style={styles.summaryValue}>{totalSuppliers}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Balance</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: totalBalance < 0 ? "red" : "green" },
            ]}
          >
            ₹{totalBalance.toLocaleString("en-IN")}
          </Text>
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
        <Text style={[styles.headingText, { flex: 1, textAlign: "right" }]}>Balance</Text>
      </View>

      <FlatList data={filtered} keyExtractor={(item) => item.id.toString()} renderItem={renderCard} />
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
    elevation: 2,
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryLabel: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  summaryValue: { fontSize: 18, fontWeight: "bold" },
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
    elevation: 2,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  creditDebitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  cardValue: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  subText: { fontSize: 13, color: "#6b7280", marginBottom: 2 },
  balanceContainer: {
    justifyContent: "center",
    alignItems: "flex-end",
    flexShrink: 1,
    flexGrow: 0,
    minWidth: 120,
    paddingLeft: 10,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "right",
    flexWrap: "nowrap",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
