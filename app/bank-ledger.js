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

const LEDGER_API = "https://taskprime.app/api/get-cash-ledger-details/?account_code=";

export default function BankLedgerScreen() {
  const router = useRouter();
  const { account_code, account_name } = useLocalSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });

  useEffect(() => {
    if (!account_code) {
      console.warn("⚠️ No account_code provided — skipping fetch");
      setLoading(false);
      return;
    }
    console.log("Fetching ledger for account_code:", account_code);
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
        console.error("Ledger fetch failed:", res);
        Alert.alert("Error", `Failed to fetch ledger: ${res.status}`);
        setData([]);
        setLoading(false);
        return;
      }

      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setData(json.data);
        const debitSum = json.data.reduce((a, b) => a + Number(b.debit ?? 0), 0);
        const creditSum = json.data.reduce((a, b) => a + Number(b.credit ?? 0), 0);
        setTotals({ debit: debitSum, credit: creditSum });
      } else {
        setData([]);
      }
    } catch (err) {
      console.error("Ledger fetch error:", err);
      Alert.alert("Network Error", "Could not fetch ledger.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item, index }) => (
    <View style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
      <Text style={[styles.cell, { flex: 1 }]}>{item.entry_date}</Text>
      <Text style={[styles.cell, { flex: 2 }]} numberOfLines={2}>
        {item.particulars}
      </Text>
      <Text style={[styles.cell, { flex: 1, textAlign: "right" }]}>
        {item.debit ? "₹" + Number(item.debit).toLocaleString("en-IN") : "-"}
      </Text>
      <Text style={[styles.cell, { flex: 1, textAlign: "right" }]}>
        {item.credit ? "₹" + Number(item.credit).toLocaleString("en-IN") : "-"}
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
        <>
          <FlatList
            data={data}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderItem}
            ListHeaderComponent={
              <View style={styles.headerRow}>
                <Text style={[styles.headerCell, { flex: 1 }]}>Date</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>Particulars</Text>
                <Text style={[styles.headerCell, { flex: 1, textAlign: "right" }]}>Debit</Text>
                <Text style={[styles.headerCell, { flex: 1, textAlign: "right" }]}>Credit</Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No ledger entries found.</Text>
              </View>
            }
          />

          {/* Totals */}
          <View style={styles.totalRow}>
            <Text style={[styles.headerCell, { flex: 3, textAlign: "right" }]}>Total:</Text>
            <Text style={[styles.headerCell, { flex: 1, textAlign: "right" }]}>
              ₹{totals.debit.toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.headerCell, { flex: 1, textAlign: "right" }]}>
              ₹{totals.credit.toLocaleString("en-IN")}
            </Text>
          </View>
        </>
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
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#fff6f1",
    paddingVertical: 10,
    borderTopColor: "#f1e9e0",
    borderTopWidth: 1,
    marginTop: 4,
  },
});
