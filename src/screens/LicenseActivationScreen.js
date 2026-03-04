import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ModernButton from "../../components/ui/ModernButton";
import ModernInput from "../../components/ui/ModernInput";
import { BorderRadius, Colors, Spacing, Typography } from "../../constants/modernTheme";

export default function LicenseActivationScreen({ onActivationSuccess, onCancel, isAddingNew }) {
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [checking, setChecking] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (!checking) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [checking]);

  const getDeviceId = async () => {
    try {
      let id = null;

      if (Platform.OS === "android") {
        id = Application.androidId;
        if (id) return id;

        const storedId = await AsyncStorage.getItem("device_hardware_id");
        if (storedId) return storedId;

        const uuid = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function (c) {
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

        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        await AsyncStorage.setItem("device_hardware_id", uuid);
        return uuid;

      } else {
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

      if (!isAddingNew) {
        await checkDeviceRegistration(id);
      } else {
        setChecking(false);
      }
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

      if (response.ok && data.success) {
        // 1. Check regular customers
        if (data.customers) {
          for (const customer of data.customers) {
            if (customer.registered_devices?.some(d => d.device_id === deviceIdToCheck)) {
              await saveLicense(customer.license_key, deviceIdToCheck, customer.customer_name, customer.client_id || "");
              onActivationSuccess();
              return;
            }
          }
        }

        // 2. Check demo licenses (Since demo licenses don't typically have registered_devices array in the response, 
        // we might skip auto-check for demo unless they are already in AsyncStorage. 
        // But for consistency, if they ever add registered_devices to demo, we support it here.)
        if (data.demo_licenses) {
          for (const demo of data.demo_licenses) {
            if (demo.registered_devices?.some(d => d.device_id === deviceIdToCheck)) {
              await saveLicense(demo.demo_license, deviceIdToCheck, demo.company, demo.client_id || "");
              onActivationSuccess();
              return;
            }
          }
        }
      }
      setChecking(false);
    } catch (error) {
      console.error("Check registration error", error);
      setChecking(false);
    }
  };

  const saveLicense = async (key, dId, name, cId) => {
    const newLicense = {
      licenseKey: key,
      deviceId: dId,
      customerName: name,
      clientId: cId
    };

    const storedLicenses = await AsyncStorage.getItem("knownLicenses");
    let licenses = storedLicenses ? JSON.parse(storedLicenses) : [];

    if (!licenses.some(l => l.licenseKey === key)) {
      licenses.push(newLicense);
      await AsyncStorage.setItem("knownLicenses", JSON.stringify(licenses));
    }

    await AsyncStorage.setItem("licenseActivated", "true");
    await AsyncStorage.setItem("licenseKey", key);
    await AsyncStorage.setItem("deviceId", dId);
    await AsyncStorage.setItem("customerName", name);
    await AsyncStorage.setItem("clientId", cId);
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      Alert.alert("Error", "Please enter a license key");
      return;
    }

    setLoading(true);
    try {
      const CHECK_LICENSE_API = `https://activate.imcbs.com/mobileapp/api/project/taskprime/`;
      const checkResponse = await fetch(CHECK_LICENSE_API);
      const checkData = await checkResponse.json();

      if (!checkResponse.ok || !checkData.success) {
        throw new Error("Failed to validate license server.");
      }

      const inputKey = licenseKey.trim().toUpperCase();
      let customer = checkData.customers?.find(c => c.license_key?.toUpperCase() === inputKey);
      let isDemo = false;

      if (!customer && checkData.demo_licenses) {
        const demo = checkData.demo_licenses.find(d => d.demo_license?.toUpperCase() === inputKey);
        if (demo) {
          isDemo = true;
          customer = {
            license_key: demo.demo_license,
            customer_name: demo.company,
            client_id: demo.client_id,
            license_summary: {
              registered_devices: demo.demo_login_limit > 0 ? 0 : 99, // Fallback logic
              max_devices: demo.demo_login_limit
            }
          };
          // Note: Demo response doesn't show registered_devices list usually, 
          // so we rely on registration API if not found.
        }
      }

      if (!customer) {
        Alert.alert("Invalid License", "License key not found.");
        setLoading(false);
        return;
      }

      if (customer.registered_devices?.some(d => d.device_id === deviceId)) {
        const newLicense = {
          licenseKey: licenseKey.trim(),
          deviceId: deviceId,
          customerName: customer.customer_name,
          clientId: customer.client_id || ""
        };

        // Get existing licenses
        const storedLicenses = await AsyncStorage.getItem("knownLicenses");
        let licenses = storedLicenses ? JSON.parse(storedLicenses) : [];

        // Check for duplicates
        const isDuplicate = licenses.some(l => l.licenseKey === newLicense.licenseKey);
        if (!isDuplicate) {
          licenses.push(newLicense);
          await AsyncStorage.setItem("knownLicenses", JSON.stringify(licenses));
        } else {
          Alert.alert("License Already Added", `The license for ${customer.customer_name} is already added on this device.`);
        }

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

      const REGISTER_API = `https://activate.imcbs.com/mobileapp/api/project/taskprime/license/register/`;
      const regResponse = await fetch(REGISTER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_key: customer.license_key, // Use the matched key (regular or demo)
          device_id: deviceId,
          device_name: deviceName
        })
      });

      const regData = await regResponse.json();
      if (regResponse.ok && regData.success) {
        await saveLicense(customer.license_key, deviceId, customer.customer_name, customer.client_id || "");
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
      <LinearGradient
        colors={['#FFFFFF', '#FFF5EB', '#FFE6CC']}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={Colors.primary.main} />
        <Text style={styles.loadingText}>Checking registration...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FFF5EB', '#FFE6CC', '#ff6600']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image
              source={require("../../assets/images/taskprime1.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        <Text style={styles.title}>Activate License</Text>
        <Text style={styles.subtitle}>
          Enter your license key to get started with TaskPrime
        </Text>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{deviceId}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device Name</Text>
            <Text style={styles.infoValue}>{deviceName}</Text>
          </View>
        </View>

        <ModernInput
          placeholder="Enter License Key"
          value={licenseKey}
          onChangeText={setLicenseKey}
          autoCapitalize="none"
          editable={!loading}
          containerStyle={styles.inputContainer}
        />

        <ModernButton
          title="Activate License"
          onPress={handleActivate}
          loading={loading}
          disabled={loading}
          gradient={true}
          size="large"
          style={styles.button}
        />

        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Back to Login</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footerText}>
          Need help? Contact support@taskprime.app
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing['2xl'],
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing['2xl'],
  },

  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  logo: {
    width: 120,
    height: 80,
  },

  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.dark.main,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.base,
  },

  infoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 102, 0, 0.2)',
  },

  infoRow: {
    marginBottom: Spacing.sm,
  },

  infoLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  infoValue: {
    color: Colors.dark.main,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },

  inputContainer: {
    marginBottom: Spacing.xl,
  },

  button: {
    marginBottom: Spacing.md,
  },

  cancelButton: {
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },

  cancelButtonText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
  },

  loadingText: {
    marginTop: Spacing.base,
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
  },

  footerText: {
    textAlign: 'center',
    color: Colors.text.tertiary,
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.base,
  },
});
