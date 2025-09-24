import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DebtorsScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDebtors = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        setLoading(false);
        return;
      }

      const response = await fetch("https://taskprime.app/api/get-debtors-data/", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        Alert.alert("Error", "Failed to fetch debtors. Please try again.");
        setLoading(false);
        return;
      }

      const result = await response.json();
      let normalizedData = [];

      if (Array.isArray(result)) {
        normalizedData = result;
      } else if (result.data && Array.isArray(result.data)) {
        normalizedData = result.data;
      } else if (typeof result === "object" && result.code) {
        normalizedData = [result];
      }

      setData(normalizedData);
    } catch (error) {
      console.error("🔥 Error fetching debtors:", error);
      Alert.alert("Network Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtors();
  }, []);

  const filteredData = data.filter(
    (item) =>
      item.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6600" />
      </View>
    );
  }

  const COLUMN_WIDTHS = {
    code: 80,
    name: 200, // Give extra width to name column
    place: 140,
    phone: 130,
    number: 120,
    dept: 120,
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.code }]}>Code</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.name }]}>Name</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.place }]}>Place</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.phone }]}>Phone</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.number }]}>Opening</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.number }]}>Debit</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.number }]}>Credit</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.dept }]}>Dept</Text>
    </View>
  );

  const renderRow = ({ item, index }) => (
    <View style={[styles.row, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
      <Text style={[styles.cell, { width: COLUMN_WIDTHS.code, textAlign: "center", fontWeight: "bold" }]}>
        {item.code}
      </Text>
      <Text style={[styles.cell, styles.multiLineText, { width: COLUMN_WIDTHS.name }]}>
        {item.name}
      </Text>
      <Text style={[styles.cell, styles.multiLineText, { width: COLUMN_WIDTHS.place }]}>
        {item.place || "-"}
      </Text>
      <Text style={[styles.cell, { width: COLUMN_WIDTHS.phone, textAlign: "center" }]}>
        {item.phone2 || "-"}
      </Text>
      <Text style={[styles.cell, { width: COLUMN_WIDTHS.number, textAlign: "right" }]}>
        {item.opening_balance}
      </Text>
      <Text style={[styles.cell, { width: COLUMN_WIDTHS.number, textAlign: "right" }]}>
        {item.master_debit}
      </Text>
      <Text style={[styles.cell, { width: COLUMN_WIDTHS.number, textAlign: "right" }]}>
        {item.master_credit}
      </Text>
      <Text style={[styles.cell, styles.multiLineText, { width: COLUMN_WIDTHS.dept, textAlign: "center" }]}>
        {item.openingdepartment}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debtors Statement</Text>

      <TextInput
        style={styles.searchBox}
        placeholder="Search by Code or Name"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <ScrollView horizontal>
        <View>
          {renderHeader()}
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.code}
            renderItem={renderRow}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  searchBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#ff6600",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  headerCell: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 14, // more height for multi-line
    alignItems: "center",
  },
  rowEven: { backgroundColor: "#fff" },
  rowOdd: { backgroundColor: "#f9f9f9" },
  cell: {
    fontSize: 14,
    paddingHorizontal: 6,
  },
  multiLineText: {
    flexWrap: "wrap",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
