import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ModernButton from "../../components/ui/ModernButton";
import ModernInput from "../../components/ui/ModernInput";
import { BorderRadius, Colors, Spacing, Typography } from "../../constants/modernTheme";

export default function LoginScreen({ onAddLicense }) {
  const router = useRouter();

  const [clientId, setClientId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [shops, setShops] = useState([]);
  const [showShopModal, setShowShopModal] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const storedClientId = await AsyncStorage.getItem("clientId");
        const storedCustomerName = await AsyncStorage.getItem("customerName");
        const storedLicenses = await AsyncStorage.getItem("knownLicenses");

        if (storedClientId) {
          setClientId(storedClientId.trim());
        }
        if (storedCustomerName) {
          setCustomerName(storedCustomerName.trim());
        }
        if (storedLicenses) {
          setShops(JSON.parse(storedLicenses));
        }
      } catch (e) {
        console.error("Failed to load client ID", e);
      } finally {
        setInitializing(false);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    if (!initializing) {
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
  }, [initializing]);

  const validateLicense = async () => {
    try {
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
      Alert.alert("Configuration Error", "Client ID is missing. Please select a shop or add a license.");
      return;
    }

    setLoading(true);

    const licenseResult = await validateLicense();

    if (!licenseResult.ok) {
      setLoading(false);
      switch (licenseResult.reason) {
        case "missing_client":
          Alert.alert("Configuration Error", "Please select a Switch Shop or add a license.");
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
      // Ensure we use the exact Client ID from the license data if available
      const activeClientId = licenseResult.customer.client_id || clientId;

      const payload = {
        username: username.trim(),
        password: password,
        client_id: activeClientId.trim().toUpperCase(),
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

  const handleSwitchShop = async (shop) => {
    try {
      await AsyncStorage.setItem("licenseKey", shop.licenseKey);
      await AsyncStorage.setItem("deviceId", shop.deviceId);
      await AsyncStorage.setItem("customerName", shop.customerName);
      await AsyncStorage.setItem("clientId", shop.clientId);

      setClientId(shop.clientId);
      setCustomerName(shop.customerName);
      setShowShopModal(false);
    } catch (error) {
      console.error("Error switching shop", error);
    }
  };

  const renderShopItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.shopItem,
        item.clientId === clientId && styles.activeShopItem
      ]}
      onPress={() => handleSwitchShop(item)}
    >
      <View>
        <Text style={[
          styles.shopItemName,
          item.clientId === clientId && styles.activeShopItemText
        ]}>
          {item.customerName}
        </Text>
        <Text style={styles.shopItemSub}>ID: {item.clientId}</Text>
      </View>
      {item.clientId === clientId && (
        <View style={styles.activeIndicator} />
      )}
    </TouchableOpacity>
  );

  if (initializing) {
    return (
      <LinearGradient
        colors={['#FFFFFF', '#FFF5EB']}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FFF5EB', '#FFE6CC']}
      locations={[0, 0.6, 1]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>TaskPrime</Text>
              <Text style={styles.tagline}>Professional Business Management</Text>
            </View>

            <View style={styles.loginCard}>
              <View style={styles.badgeContainer}>
                <LinearGradient
                  colors={[Colors.primary.main, Colors.primary.light]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.badge}
                >
                  <Text style={styles.badgeText}>Personal Login</Text>
                </LinearGradient>
              </View>

              {customerName ? (
                <Text style={styles.shopName} numberOfLines={1}>
                  {customerName}
                </Text>
              ) : null}

              <ModernInput
                placeholder="Client ID"
                value={clientId}
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={setClientId}
                containerStyle={styles.input}
                editable={false}
              />
              {/* Made Client ID read-only or we can keep it editable but typically switching shop sets it */}

              <ModernInput
                placeholder="Username"
                value={username}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setUsername}
                containerStyle={styles.input}
              />

              <ModernInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                showPasswordToggle={true}
                containerStyle={styles.input}
              />

              <ModernButton
                title="Login"
                onPress={handleLogin}
                disabled={loading}
                loading={loading}
                gradient={true}
                size="large"
                style={styles.loginButton}
              />

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowShopModal(true)}
                >
                  <Text style={styles.actionButtonText}>Switch Shop</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onAddLicense}
                >
                  <Text style={styles.actionButtonText}>Add License</Text>
                </TouchableOpacity>
              </View>

            </View>

            <Text style={styles.footerText}>
              Secure access for authorized users only
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Switch Shop Modal */}
      <Modal
        visible={showShopModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowShopModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Shop</Text>
              <TouchableOpacity onPress={() => setShowShopModal(false)}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>

            {shops.length > 0 ? (
              <FlatList
                data={shops}
                keyExtractor={(item, index) => item.clientId || index.toString()}
                renderItem={renderShopItem}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No shops found</Text>
                <TouchableOpacity onPress={() => {
                  setShowShopModal(false);
                  onAddLicense && onAddLicense();
                }}>
                  <Text style={styles.addShopLink}>Add a License</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

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

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: Spacing.xl,
  },

  content: {
    width: '100%',
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing['3xl'],
  },

  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    shadowColor: Colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },

  logoImage: {
    width: 100,
    height: 70,
  },

  appName: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.dark.main,
    marginBottom: Spacing.xs,
  },

  tagline: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  loginCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  badgeContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },

  badge: {
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minWidth: 200,
    alignItems: 'center',
  },

  badgeText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },

  shopName: {
    textAlign: 'center',
    fontSize: Typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.primary.main,
    marginBottom: Spacing.md,
  },

  input: {
    marginBottom: Spacing.base,
  },

  loginButton: {
    marginTop: Spacing.base,
    marginBottom: Spacing.lg,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },

  actionButton: {
    padding: Spacing.sm,
  },

  actionButtonText: {
    color: Colors.primary.main,
    fontWeight: '600',
    fontSize: Typography.fontSize.md,
  },

  divider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border.base,
    marginHorizontal: Spacing.md,
  },

  footerText: {
    textAlign: 'center',
    color: Colors.text.tertiary,
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.xl,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.xl,
    maxHeight: '70%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },

  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.dark.main,
  },

  closeButton: {
    color: Colors.primary.main,
    fontSize: Typography.fontSize.lg,
    fontWeight: '600',
  },

  listContent: {
    paddingBottom: Spacing.xl,
  },

  shopItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  activeShopItem: {
    backgroundColor: '#FFF5EB',
    borderColor: Colors.primary.light,
  },

  shopItemName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.dark.main,
  },

  activeShopItemText: {
    color: Colors.primary.main,
  },

  shopItemSub: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },

  activeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary.main,
  },

  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },

  emptyStateText: {
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },

  addShopLink: {
    color: Colors.primary.main,
    fontWeight: 'bold',
  },
});

