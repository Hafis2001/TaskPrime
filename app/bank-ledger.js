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
        // Calculate balance (absolute value, no minus sign)
        const processed = json.data.map((item) => {
          const debit = Number(item.debit ?? 0);
          const credit = Number(item.credit ?? 0);
          const balance = Math.abs(credit - debit);
          return { ...item, balance };
        });
        setData(processed);
      } else {
        setData([]);
      }
    } catch (err) {
      Alert.alert("Network Error", "Could not fetch ledger.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item, index }) => (
    <View style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
      <Text style={[styles.cell, { flex: 1 }]}>{item.entry_date}</Text>
      <Text style={[styles.cell, { flex: 1, textAlign: "right" }]}>
        ₹{item.balance.toLocaleString("en-IN")}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#0f1724" />
        </TouchableOpacity>
        <Text style={styles.title}>{account_name || "Ledger Details"}</Text>
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
          ListHeaderComponent={
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, { flex: 1 }]}>Date</Text>
              <Text style={[styles.headerCell, { flex: 1, textAlign: "right" }]}>
                Balance
              </Text>
            </View>
          }
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
  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fffaf5",
    marginRight: 10,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#0f1724" },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#fff6f1",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerCell: { fontSize: 13, fontWeight: "700", color: "#ff6600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffaf5",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomColor: "#f1e9e0",
    borderBottomWidth: 1,
  },
  rowAlt: { backgroundColor: "#fff8f2" },
  cell: { fontSize: 13, color: "#1e293b" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#666" },
});
