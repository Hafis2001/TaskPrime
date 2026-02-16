import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

export default function LoginScreen() {
  const router = useRouter();

  const [clientId, setClientId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const stored = await AsyncStorage.getItem("clientId");
        if (stored) {
          setClientId(stored.trim());
        }
      } catch (e) {
        console.error("Failed to load client ID", e);
      } finally {
        setInitializing(false);
      }
    };
    loadConfig();
  }, []);

  // LICENSE VALIDATION
  const validateLicense = async () => {
    try {
      // Use state clientId which should be loaded by now, or fetch again to be safe
      const stored = await AsyncStorage.getItem("clientId");
      const usedClientId = (stored || clientId || "").toString().trim().toUpperCase();

      if (!usedClientId) {
        return { ok: false, reason: "missing_client" };
      }

      const url = "https://activate.imcbs.com/mobileapp/api/project/taskprime/";
      const fetchUrl = `${url}?t=${Date.now()}`;

      let res;
      try {
        res = await fetch(fetchUrl, {
          method: "GET",
          headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        });
      } catch (networkErr) {
        return { ok: false, reason: "network" };
      }

      if (!res.ok) return { ok: false, reason: "network" };

      let data;
      try {
        data = await res.json();
      } catch {
        return { ok: false, reason: "invalid_response" };
      }

      if (!Array.isArray(data.customers))
        return { ok: false, reason: "invalid_response" };

      const matched = data.customers.find(
        (c) => (c?.client_id ?? "").toString().trim().toUpperCase() === usedClientId
      );

      if (!matched) return { ok: false, reason: "not_found" };

      return { ok: true, customer: matched };
    } catch {
      return { ok: false, reason: "network" };
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Missing Details", "Please fill all fields before logging in.");
      return;
    }

    if (!clientId) {
      Alert.alert("Configuration Error", "Client ID is missing. Please reactivate license.");
      return;
    }

    setLoading(true);

    // Validate License
    const licenseResult = await validateLicense();

    if (!licenseResult.ok) {
      setLoading(false);
      switch (licenseResult.reason) {
        case "missing_client":
          Alert.alert("Configuration Error", "Client ID is missing. Please reactivate.");
          break;
        case "network":
          Alert.alert("Network Error", "Check your internet connection.");
          break;
        case "not_found":
          Alert.alert("Invalid License", "Client ID not registered.");
          break;
        default:
          Alert.alert("License Error", "Unable to validate license.");
      }
      return;
    }

    try {
      // FIX: Replace letter 'O' with number '0' in client_id as a workaround for potential API/Data mismatch
      // The Licensing API might return 'O' (e.g. KROC...) but Login expects '0' (e.g. KR0C...)
      const cleanClientId = clientId.trim().replace(/O/g, "0");

      const payload = {
        username: username.trim(),
        password: password,
        client_id: cleanClientId,
      };

      console.log("🔑 Attempting Login with (Corrected ID):", { ...payload, password: "***" });

      const response = await fetch("https://taskprime.app/api/login/", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("🔗 API Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn("❌ API Error Response:", errorText);
        Alert.alert("Login Failed", "Invalid credentials or server error.");
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("✅ API Response:", data);

      if (data?.token) {
        const userData = {
          name: data?.username || username,
          clientId: data?.client_id || clientId,
          token: data.token,
        };

        await AsyncStorage.setItem("user", JSON.stringify(userData));
        await AsyncStorage.setItem("authToken", userData.token);

        console.log("✅ User data saved:", userData);

        router.replace("/(drawer)/company-info");
      } else {
        Alert.alert("Login Failed", "No token received from server.");
      }
    } catch (error) {
      console.error("🌐 Network Error:", error);
      Alert.alert(
        "Network Error",
        "Unable to connect to the server. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ff6600" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/taskprime1.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Single login type */}
      <View style={styles.singleToggleContainer}>
        <Text style={styles.singleToggleText}>Personal Login</Text>
      </View>

      {/* Username */}
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(text) => {
          setUsername(text);
        }}
      />

      {/* Password input with eye icon */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Icon
            name={showPassword ? "eye-off" : "eye"}
            size={22}
            color="#888"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },
  logoContainer: { alignItems: "center", marginBottom: 20 },
  logoImage: { width: 150, height: 100, marginBottom: 30 },
  singleToggleContainer: {
    alignItems: "center",
    backgroundColor: "#ff6600",
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 30,
  },
  singleToggleText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    padding: Platform.OS === "ios" ? 14 : 12,
    marginBottom: 25,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingRight: 12,
    marginBottom: 25,
  },
  eyeIcon: {
    paddingHorizontal: 8,
  },
  button: {
    backgroundColor: "#ff6600",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 50,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
