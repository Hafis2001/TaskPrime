import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";

const API_URL = "https://taskprime.app/api/get-ledger-details?account_code=";

export default function CustomerLedgerScreen() {
  const { code, name, closing_balance } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState([]);
  const [filteredLedger, setFilteredLedger] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(Number(closing_balance) || 0);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchLedger();
  }, [code]);

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
      // Sort by voucher number ascending
      entries.sort((a, b) => (a.voucher_no || 0) - (b.voucher_no || 0));

      setLedger(entries);
      setFilteredLedger(entries);
      calculateReverseBalances(entries, Number(closing_balance) || 0);
    } catch (err) {
      console.error("Ledger Fetch Error:", err);
      Alert.alert("Network Error", "Unable to fetch ledger details.");
    } finally {
      setLoading(false);
    }
  };

  const calculateReverseBalances = (entries, currentClosing) => {
    if (!entries.length) return;

    // Group transactions by date
    const grouped = {};
    entries.forEach((e) => {
      const d = e.entry_date;
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(e);
    });

    const dates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a)); // reverse order
    let nextClosing = currentClosing;
    let balances = {};

    for (let date of dates) {
      const dayEntries = grouped[date];
      let debitTotal = 0;
      let creditTotal = 0;

      dayEntries.forEach((e) => {
        debitTotal += Number(e.debit || 0);
        creditTotal += Number(e.credit || 0);
      });

      // Reverse logic
      const opening = nextClosing - debitTotal + creditTotal;
      const closing = nextClosing;

      balances[date] = { opening, closing, debitTotal, creditTotal };
      nextClosing = opening;
    }

    // Get today's (latest) data
    const latestDate = dates[0];
    const today = balances[latestDate];

    setOpeningBalance(Math.abs(today?.opening || 0));
    setClosingBalance(Math.abs(today?.closing || currentClosing));
    setTotalDebit(today?.debitTotal || 0);
    setTotalCredit(today?.creditTotal || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  };

  const filterByDate = (date) => {
    const formatted = date.toISOString().split("T")[0];
    const filtered = ledger.filter(
      (e) => e.entry_date && e.entry_date.startsWith(formatted)
    );
    setFilteredLedger(filtered);
    calculateReverseBalances(ledger, Number(closing_balance) || 0);
  };

  const onDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (selected) {
      setSelectedDate(selected);
      filterByDate(selected);
    }
  };

  const refreshAll = () => {
    setSelectedDate(null);
    setFilteredLedger(ledger);
    calculateReverseBalances(ledger, Number(closing_balance) || 0);
  };

  const renderItem = ({ item }) => {
    const isCredit = item.credit && item.credit > 0;
    const amount = isCredit ? item.credit : item.debit;
    const color = isCredit ? "#ff4d4d" : "#00b894"; // Credit red, Debit green

    return (
      <View style={styles.transactionCard}>
        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <View style={[styles.iconCircle, { backgroundColor: color + "20" }]}>
              <Icon
                name={isCredit ? "arrow-down" : "arrow-up"}
                size={18}
                color={color}
              />
            </View>
            <View>
              <Text style={styles.particulars}>{item.particulars}</Text>
              <Text style={styles.subText}>
                {formatDate(item.entry_date)} {item.narration ? `• ${item.narration}` : ""}
              </Text>
              <Text style={styles.voucherText}>Voucher ID: {item.voucher_no || "-"}</Text>
            </View>
          </View>
          <Text style={[styles.amountText, { color }]}>
            ₹{Math.abs(amount || 0).toLocaleString("en-IN")}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#ff6600" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#fff0e0", "#ffffff"]} style={styles.headerCard}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color="#ff6600" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{name || "Customer Ledger"}</Text>
          <Text style={styles.dateText}>
            {selectedDate
              ? formatDate(selectedDate)
              : "All Transactions"}
          </Text>
        </View>

        <View style={styles.rowCenter}>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar-outline" size={22} color="#ff6600" />
          </TouchableOpacity>
          <TouchableOpacity onPress={refreshAll} style={{ marginLeft: 10 }}>
            <Icon name="refresh" size={22} color="#ff6600" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="calendar"
          onChange={onDateChange}
        />
      )}

      {/* Balances */}
      <View style={styles.balanceRow}>
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceValue}>
            ₹{closingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Opening Balance</Text>
          <Text style={styles.balanceValue}>
            ₹{openingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* Totals */}
      <View style={styles.totalCard}>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Total Credit</Text>
          <Text style={[styles.totalValue, { color: "#ff4d4d" }]}>
            ₹{totalCredit.toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Total Debit</Text>
          <Text style={[styles.totalValue, { color: "#00b894" }]}>
            ₹{totalDebit.toLocaleString("en-IN")}
          </Text>
        </View>
      </View>

      {/* Transactions */}
      <Text style={styles.transHeading}>TRANSACTIONS</Text>
      <FlatList
        data={filteredLedger}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No transactions found.</Text>
        }
      />

      {/* Footer */}
      <View style={styles.footerCard}>
        <Text style={styles.footerLabel}>Closing Balance</Text>
        <Text style={styles.footerValue}>
          ₹{closingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 30,
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#ff6600", textAlign: "center" },
  dateText: { fontSize: 13, color: "#888", textAlign: "center" },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  balanceBox: {
    backgroundColor: "#f9f3ed",
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  balanceLabel: { color: "#6b7280", fontWeight: "600", fontSize: 13 },
  balanceValue: { fontSize: 17, fontWeight: "bold", color: "#1e293b" },
  totalCard: {
    flexDirection: "row",
    backgroundColor: "#fffaf5",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "space-evenly",
    elevation: 2,
  },
  totalItem: { flex: 1, alignItems: "center" },
  divider: { width: 1, height: 30, backgroundColor: "#ddd" },
  totalLabel: { color: "#6b7280", fontWeight: "600", fontSize: 14 },
  totalValue: { fontSize: 16, fontWeight: "bold" },
  transHeading: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 6,
    marginLeft: 4,
  },
  transactionCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    minHeight: 90,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  particulars: { fontWeight: "600", color: "#1e293b" },
  subText: { color: "#6b7280", fontSize: 12 },
  voucherText: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  amountText: { fontSize: 16, fontWeight: "bold" },
  footerCard: {
    position: "absolute",
    bottom: 0,
    left: 15,
    right: 0,
    backgroundColor: "#ff6600",
    padding: 16,
    alignItems: "center",
    borderRadius: 20,
    width: "95%",
    marginBottom: 45,
  },
  footerLabel: { color: "#fff", fontSize: 14, fontWeight: "600" },
  footerValue: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  emptyText: { textAlign: "center", color: "#999", marginTop: 20 },
});
