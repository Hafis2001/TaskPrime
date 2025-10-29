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
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

const LEDGER_API =
  "https://taskprime.app/api/get-bank-ledger-details/?account_code=";

export default function BankLedgerScreen() {
  const router = useRouter();
  const { account_code, account_name, previous_balance } =
    useLocalSearchParams();

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

  useEffect(() => {
    if (!account_code) {
      console.warn("⚠️ No account_code provided — skipping fetch");
      setLoading(false);
      return;
    }
    fetchLedger(account_code);
    console.log(account_code);
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
        setFilteredData([]);
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        let runningBalance = parseFloat(previous_balance) || 0;
        let totalCredit = 0;
        let totalDebit = 0;

        // ✅ Sort ascending for correct balance calculation
        const processedAsc = json.data
          .map((item) => {
            const debit = Number(item.debit ?? 0);
            const credit = Number(item.credit ?? 0);

            // Standardize entry_date format for Android/iOS
            let dateObj = null;
            if (item.entry_date) {
              const safeDate = item.entry_date.includes("T")
                ? item.entry_date
                : `${item.entry_date}T00:00:00`;
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

        // ✅ Calculate running balances in ascending order
        console.log("Calculating running balances... ,");
        const withBalances = processedAsc.map((item) => {
          runningBalance = runningBalance - item.credit + item.debit;
          totalCredit += item.credit;
          totalDebit += item.debit;
          return { ...item, runningBalance };
        });

        // ✅ Reverse for newest-first display
        const finalData = [...withBalances].reverse();

        setData(finalData);

        const today = new Date().toISOString().split("T")[0];
        const todaysEntries = finalData.filter(
          (item) => item.dateOnly === today
        );
        setFilteredData(todaysEntries);
        setSelectedDate(today);

        const openBal = runningBalance - totalCredit + totalDebit;
        console.log("Opening Balance:", openBal, "Closing Balance:", runningBalance, totalCredit , totalDebit);
        setOpeningBalance(openBal);
        setClosingBalance(runningBalance);
      } else {
        setData([]);
        setFilteredData([]);
      }
    } catch (err) {
      console.error("🔥 Ledger fetch error:", err);
      Alert.alert("Network Error", "Could not fetch ledger.");
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selected) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selected) {
      const chosen = selected.toISOString().split("T")[0];
      setSelectedDate(chosen);
      const filtered = data.filter((item) => item.dateOnly === chosen);
      setFilteredData(filtered);
    }
    console.log(selected )
  };

  const clearDateFilter = () => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    const filtered = data.filter((item) => item.dateOnly === today);
    setFilteredData(filtered);
  };

  const renderItem = ({ item }) => {
    const color = item.debit > 0 ? "#2e7d32" : "#d32f2f";
    const amount =
      item.debit > 0
        ? `+₹${item.debit.toLocaleString("en-IN")}`
        : `−₹${item.credit.toLocaleString("en-IN")}`;

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.dateText}>{item.date}</Text>
          <Text style={[styles.balanceText, { color }]}>{amount}</Text>
        </View>
        <Text style={styles.particulars}>{item.particulars}</Text>
        {item.narration && (
          <Text style={styles.narration}>{item.narration}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ---------- Header ---------- */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color="#0f1724" />
        </TouchableOpacity>
        <Text style={styles.title}>{account_name || "Bank Ledger"}</Text>

        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.calendarButton}
        >
          <Ionicons name="calendar-outline" size={22} color="#ff6600" />
        </TouchableOpacity>

        {selectedDate && (
          <TouchableOpacity onPress={clearDateFilter} style={styles.clearButton}>
            <Ionicons name="refresh" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate ? new Date(selectedDate) : new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {/* ---------- Opening Balance ---------- */}
      <View style={styles.balanceBox}>
        <Text style={styles.label}>Opening Balance</Text>
        <Text
          style={[
            styles.balanceValue,
            { color: openingBalance >= 0 ? "#16a34a" : "#dc2626" },
          ]}
        >
          ₹{Math.abs(openingBalance).toLocaleString("en-IN")}
        </Text>
      </View>

      {/* ---------- Ledger Entries ---------- */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ff6600" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {selectedDate
                  ? `No entries found for ${selectedDate}`
                  : "No ledger entries found."}
              </Text>
            </View>
          }
        />
      )}

      {/* ---------- Previous Balance ---------- */}
      {previous_balance && (
        <View style={styles.previousBox}>
          <Text style={styles.label}>Previous Closing Balance</Text>
          <Text
            style={[
              styles.balanceValue,
              {
                color:
                  parseFloat(previous_balance) >= 0
                    ? "#16a34a"
                    : "#dc2626",
              },
            ]}
          >
            ₹{Math.abs(previous_balance).toLocaleString("en-IN")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 14 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fffaf5",
    marginRight: 10,
    marginTop: 50,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#0f1724", marginTop: 50 },
  calendarButton: {
    marginLeft: "auto",
    marginTop: 50,
    backgroundColor: "#fffaf5",
    padding: 8,
    borderRadius: 8,
  },
  clearButton: { marginLeft: 6, marginTop: 50 },
  balanceBox: {
    backgroundColor: "#fffaf5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  previousBox: {
    backgroundColor: "#fff6f1",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 15,
  },
  label: { fontSize: 13, color: "#666" },
  balanceValue: { fontSize: 18, fontWeight: "700" },
  card: {
    backgroundColor: "#fffaf5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderColor: "#ffebdf",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dateText: { fontSize: 13, color: "#555" },
  balanceText: { fontSize: 14, fontWeight: "700" },
  particulars: { fontSize: 14, fontWeight: "600", color: "#222" },
  narration: { fontSize: 13, color: "#666", marginTop: 3 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#666" },
});
