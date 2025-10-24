import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const LEDGER_API =
  "https://taskprime.app/api/get-cash-ledger-details/?account_code=";

// ✅ Format date to dd-mm-yyyy
function formatDate(dateStr) {
  if (!dateStr) return "-";
  
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function CashLedgerScreen() {
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
        // ✅ Process data and calculate balance (credit - debit)
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
      rawDate: dateObj ? dateObj.getTime() : 0, // for sorting
      particulars: item.particulars ?? item.account_name ?? "-",
      narration: item.narration ?? "-",
      balance,
    };
  })
  .sort((a, b) => b.rawDate - a.rawDate); // ✅ Sort newest to oldest

setData(processed);

      } else {
        setData([]);
      }
    } catch (err) {
      console.error("🔥 Cash ledger fetch error:", err);
      Alert.alert("Network Error", "Could not fetch ledger.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isNegative = item.balance < 0;
    const color = isNegative ? "#d32f2f" : "#2e7d32"; // red / green
    const sign = isNegative ? "−" : "+";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{item.date}</Text>
          <Text style={[styles.balanceText, { color }]}>
            {sign}₹{Math.abs(item.balance).toLocaleString("en-IN")}
          </Text>
        </View>

        <Text style={styles.particularsText}>{item.particulars}</Text>

        {item.narration ? (
          <Text style={styles.narrationText}>{item.narration}</Text>
        ) : null}
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
        <Text style={styles.title}>{account_name || "Cash Ledger"}</Text>
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
          showsVerticalScrollIndicator={false}
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
      marginTop:45,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#0f1724" ,marginTop:45},

  // Center / Empty state
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#666", fontSize: 14 },

  // Card styles
  card: {
    backgroundColor: "#fffaf5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f1e9e0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dateText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  balanceText: { fontSize: 14, fontWeight: "700" },
  particularsText: { fontSize: 15, color: "#111827", fontWeight: "600" },
  narrationText: { fontSize: 13, color: "#6b7280", marginTop: 4 },
});
