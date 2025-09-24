import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DebtorsScreen() {
  const [data, setData] = useState([]); 
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchDebtors = async () => {
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) {
          Alert.alert("Error", "No token found. Please login again.");
          setLoading(false);
          return;
        }

        const response = await fetch("https://taskcloud.imcbs.com/api/get-debtors-data/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          Alert.alert("Session Expired", "Please login again.");
          setLoading(false);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          Alert.alert("Error", errorData.detail || "Failed to fetch data");
          setLoading(false);
          return;
        }

        const result = await response.json();

        const formattedData = result.map((item) => ({
          id: item.code,
          name: item.name,
          place: item.place || "-",
          phone: item.phone2 || "-",
          opening: `₹${item.opening_balance?.toFixed(2) || "0.00"}`,
          debit: `₹${item.master_debit?.toFixed(2) || "0.00"}`,
          credit: `₹${item.master_credit?.toFixed(2) || "0.00"}`,
          balance: `₹${(
            (item.opening_balance || 0) +
            (item.master_debit || 0) -
            (item.master_credit || 0)
          ).toFixed(2)}`,
          dept: item.openingdepartment || "-",
        }));

        setData(formattedData);
        setFilteredData(formattedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching debtors:", error);
        Alert.alert("Error", "Something went wrong while fetching data.");
        setLoading(false);
      }
    };

    fetchDebtors();
  }, []);

  // ✅ Filter data whenever searchQuery changes
  useEffect(() => {
    if (!searchQuery) {
      setFilteredData(data);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = data.filter(
        (item) =>
          item.id.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query)
      );
      setFilteredData(filtered);
    }
  }, [searchQuery, data]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debtors Statement</Text>

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by Code or Name"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0d6efd" style={{ marginTop: 20 }} />
      ) : (
        <ScrollView horizontal>
          <View>
            {/* Table Header */}
            <View style={styles.headerRow}>
              {["Code", "Name", "Place", "Phone", "Opening", "Debit", "Credit", "Balance", "Dept"].map(
                (h) => (
                  <Text style={styles.headerCell} key={h}>
                    {h}
                  </Text>
                )
              )}
            </View>

            {/* Table Rows */}
            <FlatList
              data={filteredData}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.id}</Text>
                  <Text style={styles.cell}>{item.name}</Text>
                  <Text style={styles.cell}>{item.place}</Text>
                  <Text style={styles.cell}>{item.phone}</Text>
                  <Text style={styles.cell}>{item.opening}</Text>
                  <Text style={styles.cell}>{item.debit}</Text>
                  <Text style={styles.cell}>{item.credit}</Text>
                  <Text style={styles.cell}>{item.balance}</Text>
                  <Text style={styles.cell}>{item.dept}</Text>
                </View>
              )}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: "#f8f8f8",
  },
  headerRow: { flexDirection: "row", backgroundColor: "#0d6efd", paddingVertical: 8 },
  headerCell: {
    flex: 1,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    minWidth: 90,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 6,
  },
  cell: {
    flex: 1,
    textAlign: "center",
    minWidth: 90,
    fontSize: 14,
  },
});
