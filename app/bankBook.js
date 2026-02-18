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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernCard from "../components/ui/ModernCard";
import ModernHeader from "../components/ui/ModernHeader";
import ModernInput from "../components/ui/ModernInput";
import { Colors, Shadows, Spacing, Typography } from "../constants/modernTheme";

const API_URL = "https://taskprime.app/api/get-bank-book-data/";

// ✅ Format currency with optional "-" sign
function formatCurrency(v) {
  const n = Number(v ?? 0);
  const isNegative = n < 0;
  const absValue = Math.abs(Math.round(n));
  const formatted = "" + absValue.toLocaleString("en-IN");
  return isNegative ? `-${formatted}` : formatted;
}

export default function BankBookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const fetchBankBook = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("authToken");
      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(API_URL, { headers });
      if (!res.ok) {
        console.error("BankBook fetch failed:", res.status);
        setData([]);
        return;
      }

      const json = await res.json();
      const list = Array.isArray(json) ? json : json.data ?? [];

      // ✅ Calculate balance as debit - credit
      const mapped = list
        .map((it, i) => {
          const debit = Number(it.debit ?? it.total_debit ?? 0);
          const credit = Number(it.credit ?? it.total_credit ?? 0);
          const balance = debit - credit;
          return {
            id: it.code ?? it.account_code ?? String(i),
            name: it.name ?? it.account_name ?? "-",
            balance,
          };
        })
        .filter((item) => item.balance !== 0); // ✅ remove only zero balances

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
    fetchBankBook();
  }, [fetchBankBook]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBankBook();
  };

  const filtered = useMemo(() => {
    if (!query) return data;
    const q = query.trim().toLowerCase();
    return data.filter((r) => r.name.toLowerCase().includes(q));
  }, [data, query]);

  const renderRow = ({ item }) => {
    const isPositive = item.balance >= 0;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          router.push({
            pathname: "bank-ledger",
            params: {
              account_code: item.id,
              account_name: item.name,
              previous_balance: item.balance.toString(), // ✅ sending balance
            },
          });
        }}
      >
        <ModernCard style={styles.card} elevated={false}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Text style={styles.avatarText}>
                {item.name ? item.name.charAt(0).toUpperCase() : "B"}
              </Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.nameText} numberOfLines={2}>
                {item.name}
              </Text>
            </View>
            <View style={styles.amountContainer}>
              <Text
                style={[
                  styles.amountText,
                  { color: isPositive ? Colors.success.main : Colors.error.main },
                ]}
                numberOfLines={1}
              >
                ₹{Math.abs(item.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
              <Text
                style={[
                  styles.drCrText,
                  { color: isPositive ? Colors.success.main : Colors.error.main },
                ]}
              >
                {/* {isPositive ? "CR" : "DR"} */}
              </Text>
            </View>
          </View>
        </ModernCard>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Bank Book"
        leftIcon={<Ionicons name="arrow-back" size={24} color={Colors.primary.main} />}
        onLeftPress={() => router.back()}
      />

      <View style={styles.content}>
        <ModernInput
          placeholder="Search by name"
          value={query}
          onChangeText={setQuery}
          leftIcon={<Ionicons name="search" size={20} color={Colors.text.tertiary} />}
          rightIcon={
            query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
              </TouchableOpacity>
            ) : null
          }
          containerStyle={styles.searchBox}
        />

        <View style={styles.headerRow}>
          <Text style={styles.headerText}>Bank Name</Text>
          <Text style={styles.headerText}>Balance</Text>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderRow}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="search-outline" size={48} color={Colors.text.disabled} style={{ marginBottom: Spacing.md }} />
              <Text style={styles.emptyText}>No records found.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary
  },
  content: {
    flex: 1,
    padding: Spacing.base,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing['3xl'],
  },
  searchBox: {
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.secondary,
    textTransform: "uppercase",
  },
  card: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    ...Platform.select({
      ios: Shadows.sm,
      android: { elevation: 2 },
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.lightest,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary.dark,
  },
  infoContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  nameText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  amountContainer: {
    alignItems: "flex-end",
    minWidth: 100,
    marginLeft: Spacing.sm,
  },
  amountText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  drCrText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 2,
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
  },
});
