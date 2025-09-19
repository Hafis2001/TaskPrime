import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

export default function DebtorsScreen() {
  const [search, setSearch] = useState("");
  const [rowCount, setRowCount] = useState("20");

  const data = [
    {
      code: "00918",
      name: "ARUN KUMAR",
      ledger: "",
      invoice: "KALPETTA",
      place: "KALPETTA",
      phone: "9946545535",
      opening: "₹0.00",
      debit: "₹0.00",
      credit: "₹0.00",
      balance: "₹0.00",
      dept: "GENERAL",
    },
    {
      code: "00930",
      name: "IN AND OUT",
      ledger: "",
      invoice: "FRAZER TOWN",
      place: "FRAZER TOWN",
      phone: "N/A",
      opening: "₹0.00",
      debit: "₹0.00",
      credit: "₹0.00",
      balance: "₹0.00",
      dept: "GENERAL",
    },
  ];

  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Debtors Statement</Text>

      {/* Search & Row Count */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={rowCount}
            style={styles.picker}
            onValueChange={(value) => setRowCount(value)}
          >
            <Picker.Item label="10" value="10" />
            <Picker.Item label="20" value="20" />
            <Picker.Item label="50" value="50" />
          </Picker>
        </View>
      </View>

      {/* Table */}
      <ScrollView horizontal>
        <View>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { width: 70 }]}>Code</Text>
            <Text style={[styles.headerCell, { width: 140 }]}>Name</Text>
            <Text style={[styles.headerCell, { width: 80 }]}>Ledger</Text>
            <Text style={[styles.headerCell, { width: 100 }]}>Invoice</Text>
            <Text style={[styles.headerCell, { width: 120 }]}>Place</Text>
            <Text style={[styles.headerCell, { width: 120 }]}>Phone</Text>
            <Text style={[styles.headerCell, { width: 90 }]}>Opening</Text>
            <Text style={[styles.headerCell, { width: 90 }]}>Debit</Text>
            <Text style={[styles.headerCell, { width: 90 }]}>Credit</Text>
            <Text style={[styles.headerCell, { width: 90 }]}>Balance</Text>
            <Text style={[styles.headerCell, { width: 100 }]}>Dept</Text>
          </View>

          {/* Rows */}
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <View style={styles.tableRow}>
                <Text style={[styles.cell, { width: 70 }]}>{item.code}</Text>
                <Text style={[styles.cell, { width: 140 }]}>{item.name}</Text>
                <Text style={[styles.cell, { width: 80 }]}>{item.ledger}</Text>
                <Text style={[styles.cell, { width: 100 }]}>{item.invoice}</Text>
                <Text style={[styles.cell, { width: 120 }]}>{item.place}</Text>
                <Text style={[styles.cell, { width: 120 }]}>{item.phone}</Text>
                <Text style={[styles.cell, { width: 90 }]}>{item.opening}</Text>
                <Text style={[styles.cell, { width: 90 }]}>{item.debit}</Text>
                <Text style={[styles.cell, { width: 90 }]}>{item.credit}</Text>
                <Text style={[styles.cell, { width: 90 }]}>{item.balance}</Text>
                <Text style={[styles.cell, { width: 100 }]}>{item.dept}</Text>
              </View>
            )}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ff6600",
    textAlign: "center",
    marginVertical: 10,
  },
  searchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 10,
    flex: 1,
    marginRight: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    overflow: "hidden",
    width: 100,
    justifyContent: "center",
  },
  picker: {
    height: 40,
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#ff6600",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerCell: {
    color: "#fff",
    fontWeight: "bold",
    padding: 8,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#fff",
  },
  cell: {
    padding: 8,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#ddd",
  },
});
