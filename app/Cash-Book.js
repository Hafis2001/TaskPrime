// screens/CashBookScreen.js
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = "https://taskprime.app/api/get-cash-book-data/";

/* Helper function */
function formatCurrency(v) {
  const n = Number(v ?? 0);
  if (isNaN(n)) return "₹0";
  try {
    return "₹" + n.toLocaleString();
  } catch {
    return "₹" + Math.round(n);
  }
}

export default function CashBookScreen() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const fetchCashBook = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("authToken");
      const headers = { Accept: "application/json", "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(API_URL, { headers });
      if (!res.ok) {
        console.error("CashBook fetch failed:", res.status);
        setData([]);
        setLoading(false);
        return;
      }

      const json = await res.json();
      let list = [];
      if (Array.isArray(json)) list = json;
      else if (json && Array.isArray(json.data)) list = json.data;
      else if (json && typeof json === "object") {
        const maybeProps = ["items", "cash_book", "cashbook", "results"];
        for (const p of maybeProps) {
          if (Array.isArray(json[p])) {
            list = json[p];
            break;
          }
        }
      }

      const mapped = list
        .map((it, i) => {
          const debit = Number(it.debit ?? it.total_debit ?? 0);
          const credit = Number(it.credit ?? it.total_credit ?? 0);
          const balance = debit - credit;
          return {
            id: it.id ?? String(i),
            name: it.name ?? it.account_name ?? it.bank_name ?? "-",
            balance,
          };
        })
        .filter((item) => item.balance > 0); // ✅ only balances > 0

      setData(mapped);
    } catch (err) {
      console.error("Fetch error:", err);
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCashBook();
  }, [fetchCashBook]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCashBook();
  };

  const filtered = useMemo(() => {
    if (!query) return data;
    const q = query.trim().toLowerCase();
    return data.filter((r) => r.name.toLowerCase().includes(q));
  }, [data, query]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ff6600" />
      </View>
    );
  }

  const renderRow = ({ item, index }) => {
    const alt = index % 2 === 1;
    return (
      <View style={[styles.row, alt && styles.rowAlt]}>
        <Text style={[styles.cell, styles.nameCell]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.cell, styles.numCell]}>{formatCurrency(item.balance)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.push("bank-cash")} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#0f1724" />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Cash Book</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#9ca3af" />
        <TextInput
          placeholder="Search by name"
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Table */}
      <View style={styles.tableWrapper}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
          <Text style={[styles.headerCell, styles.numCell]}>Balance</Text>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderRow}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No records found.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

/* Styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 0 },
    }),
  },
  titleWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: "700", color: "#0f1724" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffaf5",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: "#0f1724" },
  clearBtn: { marginLeft: 8 },

  tableWrapper: { flex: 1 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff6f1",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerCell: { fontSize: 13, fontWeight: "700", color: "#ff6600", marginRight: 18 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffaf5",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomColor: "#f1e9e0",
    borderBottomWidth: 1,
  },
  rowAlt: { backgroundColor: "#fff8f2" },

  cell: { fontSize: 14, color: "#1e293b", marginRight: 18 },
  nameCell: { flex: 2 },
  numCell: { flex: 1, textAlign: "right" },

  empty: { padding: 24, alignItems: "center" },
  emptyText: { color: "#666" },
});
