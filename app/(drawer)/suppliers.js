import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Suppliers() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Suppliers</Text>
      <Text style={styles.text}>This is your suppliers page.</Text>
      <Text style={styles.text}>
        You can list supplier details or add new ones here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ff6600",
    marginBottom: 10,
  },
  text: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
  },
});
