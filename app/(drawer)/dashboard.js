import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

export default function DashboardScreen() {
  const router = useRouter();
  const [licenseKey, setLicenseKey] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const storedLicenseKey = await AsyncStorage.getItem("licenseKey");
      const storedDeviceId = await AsyncStorage.getItem("deviceId");
      const storedCustomerName = await AsyncStorage.getItem("customerName");

      setLicenseKey(storedLicenseKey || "Not Available");
      setDeviceId(storedDeviceId || "Not Available");
      setCustomerName(storedCustomerName || "Valued Customer");
    } catch (error) {
      console.error(error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStoredData();
    setRefreshing(false);
  };

  const handleRemoveLicense = async () => {
    Alert.alert(
      "Remove License",
      "Are you sure? Does not effect your subscription but deactivates this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: removeLicense
        }
      ]
    );
  };

  const removeLicense = async () => {
    setLoading(true);
    try {
      const LOGOUT_API = "https://activate.imcbs.com/mobileapp/api/project/taskprime/logout/";

      // Attempt generic logout API call
      try {
        await fetch(LOGOUT_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ license_key: licenseKey, device_id: deviceId })
        });
      } catch (e) {
        console.warn("Logout API failed, continuing local cleanup", e);
      }

      // Local cleanup
      await AsyncStorage.multiRemove([
        "licenseActivated",
        "licenseKey",
        "deviceId",
        "customerName",
        "clientId",
        "user",
        "authToken"
      ]);

      Alert.alert("Success", "License removed.", [
        { text: "OK", onPress: () => router.replace("/") }
      ]);
    } catch (e) {
      Alert.alert("Error", "Failed to remove license.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#ffffff", "#f0f0f0"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>License Management</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#ff6600" />
              <Text style={styles.cardTitle}>Active License</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Customer:</Text>
              <Text style={styles.value}>{customerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>License Key:</Text>
              <Text style={styles.value}>{licenseKey}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Device ID:</Text>
              <Text style={styles.value}>{deviceId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>App ID:</Text>
              <Text style={styles.value}>{Application.applicationId}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRemoveLicense}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Remove License</Text>
              </View>
            )}
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { marginBottom: 30, marginTop: 20, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 10 },
  infoRow: { marginBottom: 15 },
  label: { fontSize: 12, color: '#999', textTransform: 'uppercase', marginBottom: 4, fontWeight: '600' },
  value: { fontSize: 16, color: '#333', fontWeight: '500' },
  button: {
    backgroundColor: '#ff4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonContent: { flexDirection: 'row', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
