import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLicenseModules } from "../src/utils/useLicenseModules";

import ModernCard from "../components/ui/ModernCard";
import ModernHeader from "../components/ui/ModernHeader";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "../constants/modernTheme";

const LEDGER_API =
  "https://taskprime.app/api/get-bank-ledger-details/?account_code=";

export default function BankLedgerScreen() {
  const router = useRouter();
  const { account_code, account_name, previous_balance } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(
    parseFloat(previous_balance) || 0
  );
  const [filterType, setFilterType] = useState("all");
  const [dailyBalances, setDailyBalances] = useState({});
  const [isLicensed, setIsLicensed] = useState(null);

  const { checkModule } = useLicenseModules();

  useFocusEffect(
    useCallback(() => {
      const runCheck = async () => { setIsLicensed(null);
        const allowed = await checkModule("MOD020", "Bank Book", () => {
          router.back();
        });

        if (!allowed) {
          setIsLicensed(false);
          return;
        }
        setIsLicensed(true);

        if (!account_code) {
          Alert.alert("Error", "No account code provided.");
          router.back();
          return;
        }

        if (data.length === 0) fetchLedger(account_code);
      };
      runCheck();
    }, [account_code, selectedDate, data.length])
  );

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
        setFilteredData([]);
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const processed = json.data
          .map((item) => {
            const debit = Number(item.debit ?? 0);
            const credit = Number(item.credit ?? 0);
            const dateObj = new Date(item.entry_date);
            return {
              ...item,
              debit,
              credit,
              rawDate: dateObj.getTime(),
              dateOnly: item.entry_date,
            };
          })
          .sort((a, b) => a.rawDate - b.rawDate || a.voucher_no - b.voucher_no);

        // ðŸ—‚ï¸ Group by date
        const grouped = {};
        processed.forEach((item) => {
          if (!grouped[item.dateOnly]) {
            grouped[item.dateOnly] = { debit: 0, credit: 0, entries: [] };
          }
          grouped[item.dateOnly].debit += item.debit;
          grouped[item.dateOnly].credit += item.credit;
          grouped[item.dateOnly].entries.push(item);
        });

        // ðŸ§® Correct reverse-opening logic
        const dates = Object.keys(grouped).sort(); // ascending (oldest â†’ latest)
        const balanceMap = {};

        // Start from known current closing balance
        let runningClosing = parseFloat(previous_balance) || 0;

        // Traverse backward (latest â†’ oldest)
        for (let i = dates.length - 1; i >= 0; i--) {
          const d = dates[i];
          const { debit, credit } = grouped[d];
          const opening = runningClosing - debit + credit;
          balanceMap[d] = { opening, closing: runningClosing };
          runningClosing = opening;
        }

        setData(processed);
        setDailyBalances(balanceMap);

        // Default to today
        const today = new Date().toISOString().split("T")[0];
        const todaysEntries = grouped[today]?.entries || [];
        setFilteredData(todaysEntries);
        setSelectedDate(today);

        if (balanceMap[today]) {
          setOpeningBalance(balanceMap[today].opening);
          setClosingBalance(balanceMap[today].closing);
        } else {
          // If no entry for today, keep last known
          setOpeningBalance(parseFloat(previous_balance) || 0);
          setClosingBalance(parseFloat(previous_balance) || 0);
        }
      } else {
        setData([]);
        setFilteredData([]);
      }
    } catch (err) {
      console.error("ðŸ”¥ Ledger fetch error:", err);
      Alert.alert("Network Error", "Could not fetch ledger.");
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  // âœ… Update balances when dailyBalances or selectedDate changes
  useEffect(() => {
    if (!loading && dailyBalances && Object.keys(dailyBalances).length > 0) {
      if (dailyBalances[selectedDate]) {
        setOpeningBalance(dailyBalances[selectedDate].opening);
        setClosingBalance(dailyBalances[selectedDate].closing);
      } else {
        // âœ… Correct fallback: if date has no entries, today's opening = current closing
        setOpeningBalance(parseFloat(previous_balance) || 0);
        setClosingBalance(parseFloat(previous_balance) || 0);
      }
    }
  }, [dailyBalances, selectedDate, loading]);

  const onDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (selected) {
      const chosen = new Date(
        selected.getTime() - selected.getTimezoneOffset() * 60000
      )
        .toISOString()
        .split("T")[0];
      setSelectedDate(chosen);
      updateForDate(chosen);
    }
  };

  const updateForDate = (date) => {
    const entries = data.filter((i) => i.dateOnly === date);
    setFilteredData(entries);
  };

  const getFilteredList = () => {
    if (filterType === "debit") return filteredData.filter((i) => i.debit > 0);
    if (filterType === "credit") return filteredData.filter((i) => i.credit > 0);
    return filteredData;
  };

  const totals = useMemo(() => {
    const list = getFilteredList();
    let debit = 0,
      credit = 0;
    list.forEach((i) => {
      debit += i.debit;
      credit += i.credit;
    });
    return { debit, credit };
  }, [filteredData, filterType]);

  const renderItem = ({ item }) => {
    const isDebit = item.debit > 0;
    const color = isDebit ? Colors.error.main : Colors.success.main;
    const icon = isDebit ? "arrow-down" : "arrow-up";
    const amount = isDebit
      ? `${item.debit.toLocaleString("en-IN")}`
      : `${item.credit.toLocaleString("en-IN")}`;

    return (
      <ModernCard style={styles.transactionCard} elevated={false}>
        <View style={styles.transactionRow}>
          <View style={styles.leftColumn}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: isDebit ? Colors.error.lightest : Colors.success.lightest },
                ]}
              >
                <Ionicons
                  name={icon}
                  size={18}
                  color={color}
                />
              </View>
              <View style={styles.textBlock}>
                <Text style={styles.particulars} numberOfLines={1}>
                  {item.particulars}
                </Text>
                <Text style={styles.narration}>{item.entry_date}</Text>
              </View>
            </View>
          </View>

          <View style={styles.amountWrap}>
            <Text style={[styles.amount, { color }]} numberOfLines={1}>
              {amount}
            </Text>
          </View>
        </View>
      </ModernCard>
    );
  };

  if (isLicensed === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.secondary }}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }
  if (!isLicensed) return null;

  return (
    <View style={styles.container}>
      <ModernHeader
        title={account_name || "Bank Ledger"}
        subtitle={new Date(selectedDate).toDateString()}
        leftIcon={<Ionicons name="arrow-back" size={24} color={Colors.primary.main} />}
        onLeftPress={() => router.back()}
        rightIcon={<Ionicons name="calendar-outline" size={22} color={Colors.primary.main} />}
        onRightPress={() => setShowDatePicker(true)}
      />

      <View style={styles.content}>
        {/* Balances */}
        <ModernCard style={styles.balanceCard} gradient>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Closing Balance</Text>
              <Text style={styles.balanceValue}>
                {Math.abs(closingBalance).toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={[styles.balanceItem, { alignItems: 'flex-end' }]}>
              <Text style={styles.balanceLabel}>Opening</Text>
              <Text style={[styles.balanceValue, { fontSize: Typography.fontSize.lg }]}>
                {Math.abs(openingBalance).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </ModernCard>

        {/* Filters */}
        <View style={styles.filterContainer}>
          {["all", "credit", "debit"].map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setFilterType(type)}
              style={[
                styles.filterButton,
                filterType === type && styles.filterActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filterType === type && styles.filterTextActive,
                ]}
              >
                {type === "all" ? "All" : type === "credit" ? "Credit" : "Debit"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary */}
        <ModernCard style={styles.summaryCard} elevated={false}>
          <View style={styles.rowBetween}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.summaryLabel}>Total Credit</Text>
              <Text style={[styles.summaryValue, { color: Colors.success.main }]}>
                {totals.credit.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.summaryLabel}>Total Debit</Text>
              <Text style={[styles.summaryValue, { color: Colors.error.main }]}>
                {totals.debit.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </ModernCard>

        {/* Transactions */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary.main} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={getFilteredList()}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: Spacing.xl + insets.bottom }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="documents-outline" size={48} color={Colors.text.disabled} />
                <Text style={styles.emptyText}>No transactions for this date.</Text>
              </View>
            }
          />
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(selectedDate)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
        />
      )}
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
  balanceCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.fontSize.xs,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: "700",
    color: "#fff",
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.full,
    padding: 4,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: BorderRadius.full,
  },
  filterActive: {
    backgroundColor: Colors.primary.main,
  },
  filterText: {
    color: Colors.text.secondary,
    fontWeight: "600",
    fontSize: Typography.fontSize.sm,
  },
  filterTextActive: {
    color: "#fff",
  },
  summaryCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontWeight: "700",
    fontSize: Typography.fontSize.lg,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border.light,
  },
  transactionCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  leftColumn: { flex: 1 },
  textBlock: { marginLeft: Spacing.sm, justifyContent: "center", flex: 1 },
  particulars: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 2,
  },
  narration: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  amountWrap: {
    marginLeft: Spacing.md,
    justifyContent: "center",
    alignItems: "flex-end",
    minWidth: 80,
  },
  amount: {
    fontSize: Typography.fontSize.base,
    fontWeight: "700",
    textAlign: "right",
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing['3xl'],
  },
  emptyText: {
    marginTop: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
});

