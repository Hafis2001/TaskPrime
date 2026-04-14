import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
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
import { useLicenseModules } from "../src/utils/useLicenseModules";
import { moderateScale, moderateVerticalScale, verticalScale, isTablet, Screen } from "../src/utils/Responsive";

import ModernCard from "../components/ui/ModernCard";
import ModernHeader from "../components/ui/ModernHeader";
import ModernInput from "../components/ui/ModernInput";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "../constants/modernTheme";

const API_URL = "https://taskprime.app/api/get-cash-book-data/";

function formatCurrency(v) {
  const n = Number(v ?? 0);
  if (isNaN(n)) return "";
  const isNegative = n < 0;
  const absValue = Math.abs(Math.round(n));
  const formatted = "" + absValue.toLocaleString("en-IN");
  return isNegative ? `-${formatted}` : formatted;
}

export default function CashBookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [isLicensed, setIsLicensed] = useState(null);

  const { checkModule } = useLicenseModules();

  useFocusEffect(
    useCallback(() => {
      const runCheck = async () => { setIsLicensed(null);
        const allowed = await checkModule("MOD019", "Cash Book", () => {
          router.push("/(drawer)/bank-cash");
        });

        if (!allowed) {
          setIsLicensed(false);
          return;
        }
        setIsLicensed(true);
        fetchCashBook();
      };
      runCheck();
    }, [])
  );

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

      const ZERO_EPS = 0.01;

      const mapped = list
        .map((it, i) => {
          const rawBalance =
            it.balance !== undefined && it.balance !== null
              ? Number(it.balance)
              : Number(it.debit ?? it.total_debit ?? 0) - Number(it.credit ?? it.total_credit ?? 0);
          const balance = Number.isFinite(rawBalance) ? rawBalance : 0;
          return {
            id: it.id ?? String(i),
            name: it.name ?? it.account_name ?? it.bank_name ?? "-",
            code: it.account_code ?? it.code ?? it.id ?? String(i),
            balance,
          };
        })
        .filter((item) => Math.abs(Number(item.balance)) >= ZERO_EPS);

      setData(mapped);
    } catch (err) {
      console.error("Fetch error:", err);
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  const filtered = React.useMemo(() => {
    if (!query) return data;
    const q = query.trim().toLowerCase();
    return data.filter((r) => r.name.toLowerCase().includes(q));
  }, [data, query]);

  const totalBalance = React.useMemo(() => {
    return data.reduce((acc, it) => acc + (it.balance || 0), 0);
  }, [data]);

  if (isLicensed === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.secondary }}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }
  if (!isLicensed) return null;

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchCashBook();
  };

  const renderRow = ({ item }) => {
    const isPositive = item.balance >= 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          router.push({
            pathname: "cash-ledger",
            params: {
              account_code: item.code,
              account_name: item.name,
              previous_balance: item.balance, // âœ… Pass previous balance directly
            },
          });
        }}
      >
        <ModernCard style={styles.card} elevated={false}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Text style={styles.avatarText}>
                {item.name ? item.name.charAt(0).toUpperCase() : "C"}
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
                {Math.abs(item.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Cash Book"
        leftIcon={<Ionicons name="arrow-back" size={24} color={Colors.primary.main} />}
        onLeftPress={() => router.back()}
      />

      <View style={styles.content}>
        <FlatList
          data={filtered}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderRow}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <LinearGradient
                colors={["#1cc88a", "#13855c"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.totalCard}
              >
                <View style={styles.totalInfo}>
                  <Text style={styles.totalLabel}>Total Cash Balance</Text>
                  <Text style={styles.totalAmount}>
                    {Math.abs(totalBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.totalIconBg}>
                  <Ionicons name="cash" size={32} color="rgba(255,255,255,0.3)" />
                </View>
              </LinearGradient>

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
                <Text style={styles.headerText}>Account Name</Text>
                <Text style={styles.headerText}>Balance</Text>
              </View>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} />}
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
    paddingTop: 50,
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
  listHeader: {
    paddingBottom: Spacing.xs,
    width: Screen.isTablet ? 600 : '100%',
    alignSelf: 'center',
  },
  totalCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...Shadows.md,
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: Typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  totalAmount: {
    color: "#ffffff",
    fontSize: Typography.fontSize['3xl'],
    fontWeight: "900",
  },
  totalIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    width: Screen.isTablet ? 600 : '100%',
    alignSelf: 'center',
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

