import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker"; // 👈 dropdown

export default function DebtorsScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState(null);

  // 🔥 Fetch Debtors Data
  const fetchDebtors = async (pageNum = 1, size = pageSize) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      console.log("🔑 Retrieved token:", token);

      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://taskprime.app/api/get-debtors-data/?page=${pageNum}&page_size=${size}`,
        {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ FIXED
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📡 API Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("❌ API Error:", errorText);
        Alert.alert("Error", "Failed to fetch debtors. Please try again.");
        setLoading(false);
        return;
      }

      const result = await response.json();
      console.log("✅ API Response:", result);

      let normalizedData = [];
      if (result.data && Array.isArray(result.data)) {
        normalizedData = result.data;
      } else if (Array.isArray(result)) {
        normalizedData = result;
      }

      const formattedData = normalizedData
        .map((item) => {
          const debit = Number(item.master_debit ?? 0);
          const credit = Number(item.master_credit ?? 0);
          const balance = debit - credit;

          return {
            id: item.code,
            name: item.name ?? "-",
            place: item.place ?? "-",
            phone: item.phone2 ?? "-",
            balance: isNaN(balance) ? 0 : balance,
          };
        })
        .filter((item) => item.balance > 0);

      setData(formattedData);
      setPagination(result.pagination || null);
      setPage(pageNum);
    } catch (error) {
      console.error("🔥 Error fetching debtors:", error);
      Alert.alert("Network Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // Load first page when screen opens or when page size changes
  useEffect(() => {
    fetchDebtors(1, pageSize);
  }, [pageSize]);

  const filteredData = data.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.place?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBalance = filteredData.reduce((sum, d) => sum + (d.balance ?? 0), 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6600" />
      </View>
    );
  }

  const renderCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={{ flex: 3 }}>
          <Text style={styles.cardValue} numberOfLines={2} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text style={styles.subText}>{item.phone}</Text>
          <Text style={styles.subText}>{item.place}</Text>
        </View>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₹{Math.round(item.balance)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debtors Statement</Text>

      {/* 🔥 Dropdown for Page Size */}
      <View style={styles.dropdownContainer}>
        <Text style={styles.summaryLabel}>Page Size: </Text>
        <Picker
          selectedValue={pageSize}
          style={{ flex: 1 }}
          onValueChange={(val) => setPageSize(val)}
        >
          <Picker.Item label="10" value={10} />
          <Picker.Item label="20" value={20} />
          <Picker.Item label="50" value={50} />
          <Picker.Item label="100" value={100} />
        </Picker>
      </View>

      {/* 🔥 Top Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Stores</Text>
          <Text style={styles.summaryValue}>{filteredData.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Balance</Text>
          <Text style={styles.summaryValue}>₹{Math.round(totalBalance)}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <TextInput
        style={styles.searchBox}
        placeholder="Search by Name, Place or Phone"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Table Heading Card */}
      <View style={styles.headingCard}>
        <Text style={[styles.headingText, { flex: 3 }]}>Name</Text>
        <Text style={[styles.headingText, { flex: 1, textAlign: "right" }]}>
          Balance
        </Text>
      </View>

      {/* Cards List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderCard}
        showsVerticalScrollIndicator={false}
      />

      {/* 🔥 Pagination Controls */}
      <View style={styles.paginationContainer}>
        {pagination?.has_previous && (
          <TouchableOpacity
            style={[styles.pageButton, { backgroundColor: "#6b7280" }]}
            onPress={() => fetchDebtors(page - 1, pageSize)}
          >
            <Text style={styles.pageButtonText}> Previous</Text>
          </TouchableOpacity>
        )}
        {pagination?.has_next && (
          <TouchableOpacity
            style={styles.pageButton}
            onPress={() => fetchDebtors(page + 1, pageSize)}
          >
            <Text style={styles.pageButtonText}>Next </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#ff6600",
  },
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  summaryCard: {
    backgroundColor: "#fffaf5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryLabel: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  summaryValue: { fontSize: 18, fontWeight: "bold", color: "#ff6600" },
  searchBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  headingCard: {
    flexDirection: "row",
    backgroundColor: "#ffe6cc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  headingText: { fontWeight: "bold", fontSize: 15, color: "#ff6600" },
  card: {
    backgroundColor: "#fffaf5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  cardValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    flexWrap: "wrap",
  },
  subText: { fontSize: 13, color: "#6b7280", marginBottom: 2 },
  balanceContainer: { justifyContent: "center", alignItems: "flex-end", flex: 1 },
  balanceText: { fontSize: 18, fontWeight: "bold", color: "#ff6600" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  pageButton: {
    backgroundColor: "#ff6600",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    marginHorizontal: 5,
    marginBottom:30,
    
  },
  pageButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16, },
});
