import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";

const LEDGER_API =
  "https://taskprime.app/api/get-bank-ledger-details/?account_code=";

export default function BankLedgerScreen() {
  const router = useRouter();
  const { account_code, account_name } = useLocalSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account_code) {
      console.warn("⚠️ No account_code provided — skipping fetch");
      setLoading(false);
      return;
    }
    fetchLedger(account_code);
  }, [account_code]);

  const fetchLedger = async (code) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${LEDGER_API}${code}`, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        Alert.alert("Error", `Failed to fetch ledger: ${res.status}`);
        setData([]);
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const processed = json.data
          .map((item) => {
            const debit = Number(item.debit ?? 0);
            const credit = Number(item.credit ?? 0);
            const balance = credit - debit;

            // Format date to dd-mm-yyyy
            const dateObj = item.entry_date ? new Date(item.entry_date) : null;
            const formattedDate = dateObj
              ? `${String(dateObj.getDate()).padStart(2, "0")}-${String(
                  dateObj.getMonth() + 1
                ).padStart(2, "0")}-${dateObj.getFullYear()}`
              : "-";

            return {
              date: formattedDate,
              rawDate: dateObj ? dateObj.getTime() : 0,
              particulars: item.particulars ?? item.account_name ?? "-",
              narration: item.narration ?? "-",
              balance,
            };
          })
          .sort((a, b) => b.rawDate - a.rawDate); // ✅ newest → oldest

        setData(processed);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error("🔥 Ledger fetch error:", err);
      Alert.alert("Network Error", "Could not fetch ledger.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isNegative = item.balance < 0;
    const color = isNegative ? "#d32f2f" : "#2e7d32";
    const sign = isNegative ? "−" : "+";

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.dateText}>{item.date}</Text>
          <Text style={[styles.balanceText, { color }]}>
            {sign}₹{Math.abs(item.balance).toLocaleString("en-IN")}
          </Text>
        </View>

        <Text style={styles.particulars}>{item.particulars}</Text>

        {item.narration && (
          <Text style={styles.narration}>{item.narration}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#0f1724" />
        </TouchableOpacity>
        <Text style={styles.title}>{account_name || "Bank Ledger"}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ff6600" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No ledger entries found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 14 },

  // Header
  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fffaf5",
    marginRight: 10,
      marginTop:50
  },
  title: { fontSize: 18, fontWeight: "700", color: "#0f1724",marginTop:50 },

  // Card
  card: {
    backgroundColor: "#fffaf5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderColor: "#ffebdf",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dateText: { fontSize: 13, color: "#555" },
  balanceText: { fontSize: 14, fontWeight: "700" },
  particulars: { fontSize: 14, fontWeight: "600", color: "#222" },
  narration: { fontSize: 13, color: "#666", marginTop: 3 },

  // Empty State
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#666" },
});
