import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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

const API_URL = "https://taskprime.app/api/get-ledger-details?account_code=";

export default function CustomerLedgerScreen() {
  const { code, name, current_balance } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState([]);
  const [filteredLedger, setFilteredLedger] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(Number(current_balance) || 0);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);

  // ðŸ—“ï¸ New State for Date Range
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState(null); // "from" or "to"

  const [isLicensed, setIsLicensed] = useState(null);

  const { checkModule } = useLicenseModules();

  useFocusEffect(
    useCallback(() => {
      const runCheck = async () => { setIsLicensed(null);
        const allowed = await checkModule("MOD033", "Customers", () => {
          router.back();
        });

        if (!allowed) {
          setIsLicensed(false);
          return;
        }
        setIsLicensed(true);
        if (ledger.length === 0) fetchLedger();
      };
      runCheck();
    }, [code, ledger.length])
  );

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        router.replace("/");
        return;
      }

      const res = await fetch(`${API_URL}${code}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        console.error("Invalid JSON:", text.slice(0, 200));
        Alert.alert("Server Error", "Invalid response from server.");
        setLoading(false);
        return;
      }

      let entries = Array.isArray(result) ? result : result.data || [];

      entries.sort((a, b) => {
        const dateA = new Date(a.entry_date);
        const dateB = new Date(b.entry_date);
        if (dateA.getTime() === dateB.getTime()) {
          return (a.voucher_no || 0) - (b.voucher_no || 0);
        }
        return dateB - dateA;
      });

      setLedger(entries);
      setFilteredLedger(entries);
      calculateReverseBalances(entries, Number(current_balance) || 0, false);
    } catch (err) {
      console.error("Ledger Fetch Error:", err);
      Alert.alert("Network Error", "Unable to fetch ledger details.");
    } finally {
      setLoading(false);
    }
  };

  const calculateReverseBalances = (entries, currentClosing, isDateFiltered) => {
    if (!entries.length) return;

    const grouped = {};
    entries.forEach((e) => {
      const d = e.entry_date;
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(e);
    });

    const dates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
    let balances = {};
    let nextOpening = currentClosing;

    for (let i = dates.length - 1; i >= 0; i--) {
      const date = dates[i];
      const dayEntries = grouped[date];
      let debitTotal = 0;
      let creditTotal = 0;

      dayEntries.forEach((e) => {
        debitTotal += Number(e.debit || 0);
        creditTotal += Number(e.credit || 0);
      });

      const closing = nextOpening;
      const opening = closing - debitTotal + creditTotal;
      balances[date] = { opening, closing, debitTotal, creditTotal };
      nextOpening = opening;
    }

    if (!isDateFiltered) {
      let totalDebitAll = 0;
      let totalCreditAll = 0;
      entries.forEach((e) => {
        totalDebitAll += Number(e.debit || 0);
        totalCreditAll += Number(e.credit || 0);
      });

      const earliestDate = dates[0];
      const earliest = balances[earliestDate];

      setOpeningBalance(earliest?.opening || 0);
      setClosingBalance(currentClosing);
      setTotalDebit(totalDebitAll);
      setTotalCredit(totalCreditAll);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // ðŸ—“ï¸ Filter ledger between two dates
  const filterByDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return;
    const from = new Date(startDate);
    const to = new Date(endDate);

    const filtered = ledger.filter((e) => {
      const d = new Date(e.entry_date);
      return d >= from && d <= to;
    });

    setFilteredLedger(filtered);
    calculateReverseBalances(filtered, Number(current_balance) || 0, true);

    let totalDebit = 0;
    let totalCredit = 0;
    filtered.forEach((e) => {
      totalDebit += Number(e.debit || 0);
      totalCredit += Number(e.credit || 0);
    });

    setTotalDebit(totalDebit);
    setTotalCredit(totalCredit);
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerMode === "from") {
        setFromDate(selectedDate);
        if (toDate) filterByDateRange(selectedDate, toDate);
      } else if (datePickerMode === "to") {
        setToDate(selectedDate);
        if (fromDate) filterByDateRange(fromDate, selectedDate);
      }
    }
  };

  const refreshAll = () => {
    setFromDate(null);
    setToDate(null);
    setFilteredLedger(ledger);
    calculateReverseBalances(ledger, Number(current_balance) || 0, false);
  };

  const renderItem = ({ item }) => {
    const isCredit = item.credit && item.credit > 0;
    const amount = isCredit ? item.credit : item.debit;
    const color = isCredit ? Colors.error.main : Colors.success.main;

    return (
      <UserTransactionCard
        item={item}
        amount={amount}
        color={color}
        isCredit={isCredit}
        formatDate={formatDate}
      />
    );
  };

  const UserTransactionCard = React.memo(({ item, amount, color, isCredit, formatDate }) => (
    <ModernCard style={styles.transactionCard} elevated={false}>
      <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
          <View style={[styles.iconCircle, { backgroundColor: isCredit ? Colors.error.lightest : Colors.success.lightest }]}>
            <Ionicons name={isCredit ? "arrow-down" : "arrow-up"} size={18} color={color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.particulars} numberOfLines={1}>
              {item.particulars}
            </Text>
            <Text style={styles.subText}>
              {formatDate(item.entry_date)} {item.narration ? `â€¢ ${item.narration}` : ""}
            </Text>
            <Text style={styles.voucherText}>Ref: {item.voucher_no || "-"}</Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[styles.amountText, { color }]}>
            â‚¹{Math.abs(amount || 0).toLocaleString("en-IN")}
          </Text>
          {/* <Text style={[styles.drCrText, { color }]}>{isCredit ? "DR" : "CR"}</Text> */}
        </View>
      </View>
    </ModernCard>
  ));

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
        title={name || "Customer Ledger"}
        subtitle={fromDate && toDate ? `${formatDate(fromDate)} â†’ ${formatDate(toDate)}` : "All Transactions"}
        leftIcon={<Ionicons name="arrow-back" size={24} color={Colors.primary.main} />}
        onLeftPress={() => router.back()}
        rightIcon={<Ionicons name="refresh" size={22} color={Colors.primary.main} />}
        onRightPress={refreshAll}
      />

      {/* Date Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => { setDatePickerMode("from"); setShowDatePicker(true); }}
        >
          <Ionicons name="calendar-outline" size={16} color={Colors.primary.main} style={{ marginRight: 6 }} />
          <Text style={styles.filterText}>{fromDate ? formatDate(fromDate) : "From Date"}</Text>
        </TouchableOpacity>

        <Ionicons name="arrow-forward" size={16} color={Colors.text.tertiary} />

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => { setDatePickerMode("to"); setShowDatePicker(true); }}
        >
          <Ionicons name="calendar-outline" size={16} color={Colors.primary.main} style={{ marginRight: 6 }} />
          <Text style={styles.filterText}>{toDate ? formatDate(toDate) : "To Date"}</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <ModernCard style={styles.balanceCard} gradient>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabelLight}>Current Balance</Text>
              <Text style={styles.balanceValueLight}>
                â‚¹{closingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.balanceLabelLight}>Opening</Text>
              <Text style={styles.balanceValueLightSmall}>
                â‚¹{openingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </ModernCard>

        <View style={styles.totalRow}>
          <ModernCard style={[styles.totalCard, { marginRight: Spacing.sm }]} elevated={false}>
            <Text style={styles.totalLabel}>Total Credit</Text>
            <Text style={[styles.totalValue, { color: Colors.error.main }]}>
              â‚¹{totalCredit.toLocaleString("en-IN")}
            </Text>
          </ModernCard>
          <ModernCard style={[styles.totalCard, { marginLeft: Spacing.sm }]} elevated={false}>
            <Text style={styles.totalLabel}>Total Debit</Text>
            <Text style={[styles.totalValue, { color: Colors.success.main }]}>
              â‚¹{totalDebit.toLocaleString("en-IN")}
            </Text>
          </ModernCard>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Transactions</Text>

      <FlatList
        data={filteredLedger}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: Spacing['3xl'] + insets.bottom, paddingHorizontal: Spacing.md }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="documents-outline" size={48} color={Colors.text.disabled} />
            <Text style={styles.emptyText}>No transactions found.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary.lightest,
    minWidth: 120,
    justifyContent: 'center',
  },
  filterText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
  },
  summaryContainer: {
    padding: Spacing.md,
  },
  balanceCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabelLight: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.fontSize.xs,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  balanceValueLight: {
    color: '#fff',
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
  },
  balanceValueLightSmall: {
    color: '#fff',
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  totalRow: {
    flexDirection: 'row',
  },
  totalCard: {
    flex: 1,
    padding: Spacing.md,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  totalLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionHeader: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.secondary,
    marginLeft: Spacing.lg,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  transactionCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: '#fff',
    ...Shadows.sm,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  particulars: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    marginBottom: 2,
  },
  subText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
  },
  voucherText: {
    color: Colors.text.tertiary,
    fontSize: 10,
    marginTop: 2
  },
  amountContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  amountText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  drCrText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 2,
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
});

