import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
  "https://taskprime.app/api/get-cash-ledger-details/?account_code=";

export default function CashLedgerScreen() {
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
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [isLicensed, setIsLicensed] = useState(null);

  const { checkModule } = useLicenseModules();

  useFocusEffect(
    useCallback(() => {
      const runCheck = async () => { setIsLicensed(null);
        const allowed = await checkModule("MOD019", "Cash Book", () => {
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
    }, [account_code, data.length])
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
        const processedAsc = json.data
          .map((item) => {
            const debit = Number(item.debit ?? 0);
            const credit = Number(item.credit ?? 0);
            let dateObj = null;
            if (item.entry_date) {
              const safeDate = item.entry_date.includes("T")
                ? item.entry_date
                : `${item.entry_date}T00:00:00Z`;
              dateObj = new Date(safeDate);
            }
            const formattedDate = dateObj
              ? `${String(dateObj.getDate()).padStart(2, "0")}-${String(
                dateObj.getMonth() + 1
              ).padStart(2, "0")}-${dateObj.getFullYear()}`
              : "-";
            return {
              date: formattedDate,
              rawDate: dateObj ? dateObj.getTime() : 0,
              dateOnly: dateObj
                ? dateObj.toISOString().split("T")[0]
                : null,
              particulars: item.particulars ?? item.account_name ?? "-",
              narration: item.narration ?? "-",
              debit,
              credit,
            };
          })
          .sort((a, b) => a.rawDate - b.rawDate);

        const dailyMap = {};
        processedAsc.forEach((item) => {
          if (!item.dateOnly) return;
          if (!dailyMap[item.dateOnly]) {
            dailyMap[item.dateOnly] = { debit: 0, credit: 0, entries: [] };
          }
          dailyMap[item.dateOnly].debit += item.debit;
          dailyMap[item.dateOnly].credit += item.credit;
          dailyMap[item.dateOnly].entries.push(item);
        });

        // ðŸ§® Reverse calculation (Opening = Closing + Debit - Credit)
        const dates = Object.keys(dailyMap).sort();
        let runningClosing = parseFloat(previous_balance) || 0;
        const balances = {};
        for (let i = dates.length - 1; i >= 0; i--) {
          const d = dates[i];
          const { debit, credit } = dailyMap[d];
          const open = runningClosing + debit - credit;
          balances[d] = { opening: open, closing: runningClosing };
          runningClosing = open;
        }

        setData(processedAsc);
        setDailyBalances(balances);

        const today = new Date().toISOString().split("T")[0];
        const todaysEntries = dailyMap[today]?.entries || [];
        setFilteredData(todaysEntries);
        setSelectedDate(today);

        if (balances[today]) {
          setOpeningBalance(balances[today].opening);
          setClosingBalance(balances[today].closing);
        } else {
          setOpeningBalance(parseFloat(previous_balance) || 0);
        }

        setTotalDebit(dailyMap[today]?.debit || 0);
        setTotalCredit(dailyMap[today]?.credit || 0);
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

  const onDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (selected) {
      const chosen = new Date(
        selected.getTime() - selected.getTimezoneOffset() * 60000
      )
        .toISOString()
        .split("T")[0];
      setSelectedDate(chosen);
      calculateOpeningForDate(chosen);
    }
  };

  const calculateOpeningForDate = (date) => {
    if (!data.length) return;
    const sorted = [...data].sort((a, b) => a.rawDate - b.rawDate);
    const dailyMap = {};
    sorted.forEach((item) => {
      if (!item.dateOnly) return;
      if (!dailyMap[item.dateOnly]) {
        dailyMap[item.dateOnly] = { debit: 0, credit: 0, entries: [] };
      }
      dailyMap[item.dateOnly].debit += item.debit;
      dailyMap[item.dateOnly].credit += item.credit;
      dailyMap[item.dateOnly].entries.push(item);
    });

    const dates = Object.keys(dailyMap).sort();
    let runningClosing = parseFloat(previous_balance) || 0;
    const balances = {};
    for (let i = dates.length - 1; i >= 0; i--) {
      const d = dates[i];
      const { debit, credit } = dailyMap[d];
      const open = runningClosing - debit + credit;
      balances[d] = { opening: open, closing: runningClosing };
      runningClosing = open;
    }

    setDailyBalances(balances);
    const entries = dailyMap[date]?.entries || [];
    setFilteredData(entries);

    setTotalDebit(dailyMap[date]?.debit || 0);
    setTotalCredit(dailyMap[date]?.credit || 0);

    if (balances[date]) {
      setOpeningBalance(balances[date].opening);
      setClosingBalance(balances[date].closing);
    }
  };

  const clearDateFilter = () => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    calculateOpeningForDate(today);
  };

  const getFilteredList = () => {
    if (filterType === "debit") return filteredData.filter((i) => i.debit > 0);
    if (filterType === "credit") return filteredData.filter((i) => i.credit > 0);
    return filteredData;
  };

  const renderItem = ({ item }) => {
    const isDebit = item.debit > 0;
    const color = isDebit ? Colors.success.main : Colors.error.main; // Note: In Cash book, Debit is usually Receipt (Green), Credit is Payment (Red) - wait, standard accounting: Debit is Receipt (Increase Cash), Credit is Payment (Decrease Cash).
    // Original code: item.debit > 0 ? "#2e7d32" : "#d32f2f" -> Green for Debit, Red for Credit. Correct for Cash Book.

    // Actually in the original code:
    // const color = item.debit > 0 ? "#2e7d32" : "#d32f2f";
    // So Debit (Receipt) is Green, Credit (Payment) is Red.

    const amount =
      item.debit > 0
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
                  { backgroundColor: isDebit ? Colors.success.lightest : Colors.error.lightest },
                ]}
              >
                <Ionicons
                  name={isDebit ? "arrow-down" : "arrow-up"} // Receipt (Debit) -> In (Down), Payment (Credit) -> Out (Up)
                  size={18}
                  color={color}
                />
              </View>
              <View style={styles.textBlock}>
                <Text style={styles.particulars} numberOfLines={1}>
                  {item.particulars}
                </Text>
                <Text style={styles.narration}>{item.date}</Text>
                {item.narration && item.narration !== "-" && <Text style={styles.subNarration}>{item.narration}</Text>}
              </View>
            </View>
          </View>

          <View style={styles.amountWrap}>
            <Text style={[styles.amount, { color }]} numberOfLines={1}>
              {amount}
            </Text>
            <Text style={[styles.drCrText, { color }]}>
              {isDebit ? "DR" : "CR"}
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
        title={account_name || "Cash Ledger"}
        subtitle={selectedDate}
        leftIcon={<Ionicons name="arrow-back" size={24} color={Colors.primary.main} />}
        onLeftPress={() => router.back()}
        rightIcon={<Ionicons name="calendar-outline" size={22} color={Colors.primary.main} />}
        onRightPress={() => setShowDatePicker(true)}
      />

      <View style={styles.content}>

        <View style={styles.balanceRow}>
          {/* Opening Balance */}
          <ModernCard style={styles.balanceBox} elevated={false}>
            <Text style={styles.label}>Opening Balance</Text>
            <Text
              style={[
                styles.balanceValue,
                { color: openingBalance >= 0 ? Colors.success.main : Colors.error.main },
              ]}
            >
              {Math.abs(openingBalance).toLocaleString("en-IN")}
            </Text>
          </ModernCard>

          {/* Current/Closing Balance */}
          <ModernCard style={styles.balanceBox} elevated={false}>
            <Text style={styles.label}>Closing Balance</Text>
            <Text style={[styles.balanceValue, { color: Colors.primary.main }]}>
              {Math.abs(dailyBalances[selectedDate]?.closing || closingBalance).toLocaleString("en-IN")}
            </Text>
          </ModernCard>
        </View>

        {/* Filter buttons */}
        <View style={styles.filterRow}>
          {["all", "debit", "credit"].map((type) => (
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
                {type === "all"
                  ? "All"
                  : type === "debit"
                    ? "Debit (Receipt)"
                    : "Credit (Payment)"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total Debit & Credit */}
        <ModernCard style={styles.totalsBox} elevated={false}>
          <View style={styles.totalItem}>
            <Text style={styles.label}>Total Debit</Text>
            <Text style={[styles.balanceValue, { color: Colors.success.main }]}>
              {totalDebit.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalItem}>
            <Text style={styles.label}>Total Credit</Text>
            <Text style={[styles.balanceValue, { color: Colors.error.main }]}>
              {totalCredit.toLocaleString("en-IN")}
            </Text>
          </View>
        </ModernCard>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary.main} />
          </View>
        ) : (
          <FlatList
            data={getFilteredList()}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: Spacing.xl + insets.bottom }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="documents-outline" size={48} color={Colors.text.disabled} style={{ marginBottom: Spacing.md }} />
                <Text style={styles.emptyText}>
                  {selectedDate
                    ? `No entries found for ${selectedDate}`
                    : "No ledger entries found."}
                </Text>
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
  balanceRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  balanceBox: {
    padding: Spacing.md,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "700",
  },
  filterRow: {
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
  totalsBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  totalItem: { flex: 1, alignItems: "center" },
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
  subNarration: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 1,
    fontStyle: 'italic',
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
  drCrText: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing['3xl'],
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
  },
});

