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

const CASH_LEDGER_API =
  "https://taskprime.app/api/get-cash-ledger-details/?account_code=";

const formatToYMD = (dateObj) => {
  if (!dateObj) return null;
  const d = new Date(dateObj);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const formatToDMY = (dateObj) => {
  if (!dateObj) return "-";
  const d = new Date(dateObj);
  if (isNaN(d)) return "-";
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${d.getFullYear()}`;
};

export default function CashLedgerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const account_code = params?.account_code;
  const account_name = params?.account_name || "Cash Ledger";

  const [previousBalance, setPreviousBalance] = useState(null);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ✅ Load previous closing balance from AsyncStorage
  useEffect(() => {
    const loadPrevBalance = async () => {
      try {
        const value = await AsyncStorage.getItem("previousClosingBalance");
        if (value !== null) setPreviousBalance(parseFloat(value));
      } catch (e) {
        console.error("Failed to load previous closing balance", e);
      }
    };
    loadPrevBalance();
  }, []);

  // ✅ Clear previous balance on unmount (optional)
  useEffect(() => {
    return () => {
      AsyncStorage.removeItem("previousClosingBalance");
    };
  }, []);

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

      const res = await fetch(`${CASH_LEDGER_API}${code}`, {
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
      const items = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];

      const processed = items
        .map((item) => {
          const debit = Number(item.debit ?? 0);
          const credit = Number(item.credit ?? 0);
          const balance = credit - debit;
          const dateObj = item.entry_date ? new Date(item.entry_date) : null;
          const formattedDate = dateObj ? formatToDMY(dateObj) : "-";

          return {
            date: formattedDate,
            rawDate: dateObj ? dateObj.getTime() : 0,
            dateOnly: formatToYMD(dateObj),
            particulars: item.particulars ?? item.account_name ?? "-",
            narration: item.narration ?? "-",
            balance,
          };
        })
        .sort((a, b) => b.rawDate - a.rawDate);

      setData(processed);

      const todayYMD = formatToYMD(new Date());
      setSelectedDate(todayYMD);
      const todayEntries = processed.filter((it) => it.dateOnly === todayYMD);
      setFilteredData(todayEntries);
    } catch (err) {
      console.error("🔥 Cash ledger fetch error:", err);
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
      const chosenYMD = formatToYMD(selected);
      setSelectedDate(chosenYMD);
      const filtered = data.filter((it) => it.dateOnly === chosenYMD);
      setFilteredData(filtered);
    }
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
    setFilteredData(data);
  };

  const renderItem = ({ item }) => {
    const isNegative = item.balance < 0;
    const color = isNegative ? "#d32f2f" : "#2e7d32";
    const sign = isNegative ? "−" : "+";
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.dateText}>{item.date}</Text>
          <Text style={[styles.balanceText, { color }]}>
            {sign}₹{Math.abs(item.balance).toLocaleString("en-IN")}
          </Text>
        </View>
        <Text style={styles.particulars}>{item.particulars}</Text>
        {item.narration ? <Text style={styles.narration}>{item.narration}</Text> : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#0f1724" />
        </TouchableOpacity>
        <Text style={styles.title}>{account_name}</Text>

        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.calendarButton}>
          <Ionicons name="calendar-outline" size={22} color="#ff6600" />
        </TouchableOpacity>

        {selectedDate ? (
          <TouchableOpacity onPress={clearDateFilter} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        ) : null}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate ? new Date(selectedDate) : new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {previousBalance !== null && !isNaN(previousBalance) && (
        <View style={styles.balanceBox}>
          <Text style={{ fontSize: 13, color: "#666" }}>Previous Closing Balance</Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: previousBalance >= 0 ? "#16a34a" : "#dc2626",
            }}
          >
            ₹{Math.abs(previousBalance).toLocaleString("en-IN")}
          </Text>
        </View>
      )}

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
    marginTop: 50,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#0f1724", marginTop: 50 },
  calendarButton: {
    marginLeft: "auto",
    padding: 6,
    marginTop: 50,
  },
  clearButton: { padding: 6, marginLeft: 6, marginTop: 50 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#777", fontSize: 14, marginTop: 20 },
  balanceBox: {
    backgroundColor: "#fffaf5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fffaf5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  dateText: { fontSize: 14, color: "#555" },
  balanceText: { fontSize: 16, fontWeight: "700" },
  particulars: { fontSize: 14, color: "#111", fontWeight: "600", marginTop: 6 },
  narration: { fontSize: 13, color: "#666", marginTop: 3 },
});
