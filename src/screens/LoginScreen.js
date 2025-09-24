import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const router = useRouter();

  const [clientId, setClientId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState("personal");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!clientId || !username || !password) {
      Alert.alert("Missing Details", "Please fill all fields before logging in.");
      return;
    }

    setLoading(true);

    try {
      // ✅ Call the new API
      const response = await fetch("https://taskprime.app/api/login/", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password,
          client_id: clientId,
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

      // ✅ Expecting JWT token in response
      if (data?.token) {
        // Save token for later use (Debtors page)
        await AsyncStorage.setItem("authToken", data.token);
        console.log("🔑 Token saved:", data.token);

        // Navigate to dashboard after successful login
        router.replace("/(drawer)/dashboard");
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
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo.jpg")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Toggle Buttons */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            loginType === "personal" && styles.toggleButtonActive,
          ]}
          onPress={() => setLoginType("personal")}
        >
          <Text
            style={[
              styles.toggleText,
              loginType === "personal" && styles.toggleTextActive,
            ]}
          >
            Personal Login
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            loginType === "corporate" && styles.toggleButtonActive,
          ]}
          onPress={() => setLoginType("corporate")}
        >
          <Text
            style={[
              styles.toggleText,
              loginType === "corporate" && styles.toggleTextActive,
            ]}
          >
            Corporate Login
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input Fields */}
      <TextInput
        style={styles.input}
        placeholder="Enter your Client ID"
        value={clientId}
        onChangeText={setClientId}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* Login Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {loginType === "personal" ? "Personal Login" : "Corporate Login"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoImage: {
    width: 150,
    height: 100,
    marginBottom: 30,
  },
  toggleContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 30,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  toggleButtonActive: {
    backgroundColor: "#ff6600",
  },
  toggleText: {
    fontSize: 16,
    color: "#333",
  },
  toggleTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    padding: 12,
    marginBottom: 25,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#ff6600",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 50,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
