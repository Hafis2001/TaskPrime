import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function CompanyInfoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Company Info Page</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 20,
    color: "#ff6600",
    fontWeight: "bold",
  },
});
