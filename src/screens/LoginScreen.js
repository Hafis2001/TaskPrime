import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

export default function LoginScreen() {
  const router = useRouter();

  const [clientId, setClientId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!clientId || !username || !password) {
      Alert.alert("Missing Details", "Please fill all fields before logging in.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://taskprime.app/api/login/", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
          client_id: clientId.trim(),
        }),
      });

      console.log("🔗 API Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error Response:", errorText);
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

      {/* Client ID */}
      <TextInput
        style={styles.input}
        placeholder="Enter your Client ID"
        value={clientId}
        autoCapitalize="characters"
        autoCorrect={false}
        onChangeText={(text) => {
          const upper = text.toUpperCase().replace(/\s/g, "");
          if (upper !== clientId) setClientId(upper);
        }}
      />

      {/* Username */}
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        autoCapitalize="characters"
        autoCorrect={false}
        onChangeText={(text) => {
          const upper = text.toUpperCase().replace(/\s/g, "");
          if (upper !== username) setUsername(upper);
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
