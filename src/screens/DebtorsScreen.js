import React from "react";
import { View, Text, FlatList, StyleSheet, ScrollView } from "react-native";

const data = [
  { id: "00918", name: "ARUN KUMAR", place: "KALPETTA", phone: "9946545535", opening: "₹0.00", debit: "₹0.00", credit: "₹0.00", balance: "₹0.00", dept: "GENERAL" },
  { id: "00930", name: "IN AND OUT", place: "FRAZER TOWN", phone: "N/A", opening: "₹0.00", debit: "₹0.00", credit: "₹0.00", balance: "₹0.00", dept: "GENERAL" },
  { id: "00931", name: "CRAFT SUPER MARKET", place: "HBR LAYOUT", phone: "25448355", opening: "₹0.00", debit: "₹0.00", credit: "₹0.00", balance: "₹0.00", dept: "GENERAL" },
];

export default function DebtorsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debtors Statement</Text>

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
            data={data}
            keyExtractor={(item) => item.id}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
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
