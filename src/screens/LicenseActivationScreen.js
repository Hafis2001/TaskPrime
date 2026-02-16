import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Device from "expo-device";

export default function LicenseActivationScreen({ onActivationSuccess }) {
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const getDeviceId = async () => {
    try {
      let id = null;
      
      if (Platform.OS === "android") {
        id = Application.androidId;
        if (id) return id;

        // Fallback or request if needed, but keeping simple for now based on user's code
        const storedId = await AsyncStorage.getItem("device_hardware_id");
        if (storedId) return storedId;

        const uuid = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function(c) {
          const r = Math.random() * 16 | 0;
          return r.toString(16);
        });
        await AsyncStorage.setItem("device_hardware_id", uuid);
        return uuid;
        
      } else if (Platform.OS === "ios") {
        id = await Application.getIosIdForVendorAsync();
        if (id) return id;

        const storedId = await AsyncStorage.getItem("device_hardware_id");
        if (storedId) return storedId;

        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        await AsyncStorage.setItem("device_hardware_id", uuid);
        return uuid;
        
      } else {
        // Web or other
        const storedId = await AsyncStorage.getItem("device_hardware_id");
        if (storedId) return storedId;
        
        const uuid = 'web-' + Math.random().toString(36).substring(2, 15);
        await AsyncStorage.setItem("device_hardware_id", uuid);
        return uuid;
      }
    } catch (error) {
      console.error("Error getting device ID", error);
      return "unknown-device";
    }
  };

  const getDeviceName = () => {
    try {
      if (Platform.OS === "android") {
        return `${Device.brand || ""} ${Device.modelName || ""}`.trim() || "Android Device";
      } else if (Platform.OS === "ios") {
        return Device.modelName || "iOS Device";
      }
      return "Unknown Device";
    } catch (e) {
      return "Unknown Device";
    }
  };

  const initializeApp = async () => {
    try {
      setChecking(true);
      const id = await getDeviceId();
      setDeviceId(id);
      
      const name = getDeviceName();
      setDeviceName(name);
      
      // Check registration
      await checkDeviceRegistration(id);
    } catch (error) {
      console.error(error);
      setChecking(false);
    }
  };

  const checkDeviceRegistration = async (deviceIdToCheck) => {
    try {
      const CHECK_LICENSE_API = `https://activate.imcbs.com/mobileapp/api/project/taskprime/`;
      const response = await fetch(CHECK_LICENSE_API);
      const data = await response.json();

      if (response.ok && data.success && data.customers) {
        for (const customer of data.customers) {
          if (customer.registered_devices?.some(d => d.device_id === deviceIdToCheck)) {
            // Found
            await AsyncStorage.setItem("licenseActivated", "true");
            await AsyncStorage.setItem("licenseKey", customer.license_key);
            await AsyncStorage.setItem("deviceId", deviceIdToCheck);
            await AsyncStorage.setItem("customerName", customer.customer_name);
            await AsyncStorage.setItem("clientId", customer.client_id || "");
            
            onActivationSuccess();
            return;
          }
        }
      }
      setChecking(false);
    } catch (error) {
      console.error("Check registration error", error);
      setChecking(false);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      Alert.alert("Error", "Please enter a license key");
      return;
    }

    setLoading(true);
    try {
      // 1. Verify License Key
      const CHECK_LICENSE_API = `https://activate.imcbs.com/mobileapp/api/project/taskprime/`;
      const checkResponse = await fetch(CHECK_LICENSE_API);
      const checkData = await checkResponse.json();

      if (!checkResponse.ok || !checkData.success || !checkData.customers) {
        throw new Error("Failed to validate license server.");
      }

      const customer = checkData.customers.find(c => c.license_key === licenseKey.trim());
      
      if (!customer) {
        Alert.alert("Invalid License", "License key not found.");
        setLoading(false);
        return;
      }

      // Check limits
      if (customer.registered_devices?.some(d => d.device_id === deviceId)) {
        // Already registered logic, but maybe we just save it locally?
         await AsyncStorage.setItem("licenseActivated", "true");
         await AsyncStorage.setItem("licenseKey", licenseKey.trim());
         await AsyncStorage.setItem("deviceId", deviceId);
         await AsyncStorage.setItem("customerName", customer.customer_name);
         await AsyncStorage.setItem("clientId", customer.client_id || "");
         onActivationSuccess();
         return;
      }

      if (customer.license_summary.registered_devices >= customer.license_summary.max_devices) {
        Alert.alert("Limit Reached", "Max devices registered for this license.");
        setLoading(false);
        return;
      }

      // 2. Register Device
      const REGISTER_API = `https://activate.imcbs.com/mobileapp/api/project/taskprime/license/register/`;
      const regResponse = await fetch(REGISTER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_key: licenseKey.trim(),
          device_id: deviceId,
          device_name: deviceName
        })
      });

      const regData = await regResponse.json();
      if (regResponse.ok && regData.success) {
         await AsyncStorage.setItem("licenseActivated", "true");
         await AsyncStorage.setItem("licenseKey", licenseKey.trim());
         await AsyncStorage.setItem("deviceId", deviceId);
         await AsyncStorage.setItem("customerName", customer.customer_name);
         await AsyncStorage.setItem("clientId", customer.client_id || "");
         
         Alert.alert("Success", "Device registered!");
         onActivationSuccess();
      } else {
        Alert.alert("Registration Failed", regData.message || "Unknown error");
      }

    } catch (error) {
      Alert.alert("Error", error.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ff6600" />
        <Text style={styles.loadingText}>Checking registration...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#ffffff", "#ff6600"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
            <Image
                source={require("../../assets/images/taskprime1.png")}
                style={styles.logo}
                resizeMode="contain"
            />
        </View>

        <Text style={styles.title}>Activate License</Text>
        <Text style={styles.subtitle}>Enter your license key provided by TaskPrime.</Text>

        <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Device ID:</Text>
            <Text style={styles.infoValue}>{deviceId}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="License Key"
          placeholderTextColor="#666"
          value={licenseKey}
          onChangeText={setLicenseKey}
          autoCapitalize="none"
          editable={!loading}
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleActivate}
          disabled={loading}
        >
          {loading ? (
             <ActivityIndicator color="#fff" />
          ) : (
             <Text style={styles.buttonText}>Activate</Text>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center", backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: "center", padding: 30 },
  logoContainer: { alignItems: "center", marginBottom: 30 },
  logo: { width: 150, height: 100 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#eee", textAlign: "center", marginBottom: 30 },
  infoBox: { backgroundColor: "rgba(255,255,255,0.2)", padding: 10, borderRadius: 10, marginBottom: 20 },
  infoLabel: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  infoValue: { color: "#fff", fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  input: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#171635", // Contrast color
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  loadingText: { marginTop: 10, color: "#555" }
});
