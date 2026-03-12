import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
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
import { BorderRadius, Colors, Spacing, Typography, Shadows } from "../../constants/modernTheme";
import { moderateScale, moderateVerticalScale, verticalScale, isTablet, Screen } from "../../src/utils/Responsive";
import { useLicenseModules } from "../utils/useLicenseModules";

export default function LoginScreen({ onAddLicense }) {
  const router = useRouter();
  const { refreshModules } = useLicenseModules();

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
  const [shopModalTab, setShopModalTab] = useState("switch"); // "switch", "add", "remove"

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
        await AsyncStorage.setItem("loginTimestamp", Date.now().toString());

        // Save credentials securely for specific shop auto re-auth
        try {
          const safeId = String(userData.clientId).trim().toUpperCase();
          console.log(`🔒 SAVING CREDS TO SECURE STORE FOR ID: [${safeId}]`);
          await SecureStore.setItemAsync(`savedUsername_${safeId}`, username.trim());
          await SecureStore.setItemAsync(`savedPassword_${safeId}`, password);
          console.log(`🔒 SAVED SUCCESSFULLY FOR: [${safeId}]`);
        } catch (e) {
          console.warn("SecureStore save failed:", e);
        }

        // Refresh license data immediately on login
        try {
          await refreshModules();
        } catch (e) {
          console.warn("License refresh failed on login:", e);
        }

        console.log("✅ User data saved:", userData);

        router.replace("/(drawer)/(tabs)");
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

  const handleRemoveShop = async (shop) => {
    Alert.alert(
      "Remove Shop",
      `Are you sure you want to remove ${shop.customerName}? This will deactivate this device for this license locally.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const LOGOUT_API = "https://activate.imcbs.com/mobileapp/api/project/taskprime/logout/";

              // 1. API Call
              try {
                await fetch(LOGOUT_API, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    license_key: shop.licenseKey,
                    device_id: shop.deviceId
                  })
                });
              } catch (e) {
                console.warn("Logout API failed, continuing local cleanup", e);
              }

              // 2. SecureStore cleanup
              if (shop.clientId) {
                const safeId = String(shop.clientId).trim().toUpperCase();
                await SecureStore.deleteItemAsync(`savedUsername_${safeId}`).catch(() => { });
                await SecureStore.deleteItemAsync(`savedPassword_${safeId}`).catch(() => { });
              }

              // 3. Update knownLicenses
              const storedLicenses = await AsyncStorage.getItem("knownLicenses");
              let licenses = storedLicenses ? JSON.parse(storedLicenses) : [];
              const updatedLicenses = licenses.filter(l => l.licenseKey !== shop.licenseKey);
              await AsyncStorage.setItem("knownLicenses", JSON.stringify(updatedLicenses));
              setShops(updatedLicenses);

              // 4. If current active shop, clear it
              if (shop.clientId === clientId) {
                await AsyncStorage.multiRemove([
                  "licenseActivated",
                  "licenseKey",
                  "deviceId",
                  "customerName",
                  "clientId",
                  "user",
                  "authToken",
                  "loginTimestamp"
                ]);
                setClientId("");
                setCustomerName("");
                Alert.alert("Shop Removed", "Active shop removed. You need to add a license or select another shop.");
              } else {
                Alert.alert("Shop Removed", "Shop removed successfully.");
              }
            } catch (error) {
              console.error("Error removing shop", error);
              Alert.alert("Error", "Failed to remove shop.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
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
    <View style={styles.shopItemContainer}>
      <TouchableOpacity
        style={[
          styles.shopItem,
          item.clientId === clientId && styles.activeShopItem,
          shopModalTab === "remove" && styles.removeModeShopItem
        ]}
        onPress={() => shopModalTab === "switch" && handleSwitchShop(item)}
        disabled={shopModalTab === "remove"}
      >
        <View style={{ flex: 1 }}>
          <Text style={[
            styles.shopItemName,
            item.clientId === clientId && styles.activeShopItemText
          ]}>
            {item.customerName}
          </Text>
          <Text style={styles.shopItemSub}>ID: {item.clientId}</Text>
        </View>
        {item.clientId === clientId && shopModalTab === "switch" && (
          <View style={styles.activeIndicator} />
        )}
      </TouchableOpacity>
      
      {shopModalTab === "remove" && (
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => handleRemoveShop(item)}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.error.main} />
        </TouchableOpacity>
      )}
    </View>
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
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={(text) => setUsername(text.toUpperCase())}
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
                  onPress={() => {
                    setShopModalTab("switch");
                    setShowShopModal(true);
                  }}
                >
                  <Ionicons name="business-outline" size={20} color={Colors.primary.main} style={{ marginRight: 6 }} />
                  <Text style={styles.actionButtonText}>Shops</Text>
                </TouchableOpacity>
              </View>

            </View>

            <Text style={styles.footerText}>
              Secure access for authorized users only
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Shops Management Modal */}
      <Modal
        visible={showShopModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowShopModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Shop Management</Text>
              <TouchableOpacity onPress={() => setShowShopModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
              <TouchableOpacity 
                style={[styles.tab, shopModalTab === "switch" && styles.activeTab]}
                onPress={() => setShopModalTab("switch")}
              >
                <Text style={[styles.tabText, shopModalTab === "switch" && styles.activeTabText]}>Switch</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, shopModalTab === "add" && styles.activeTab]}
                onPress={() => setShopModalTab("add")}
              >
                <Text style={[styles.tabText, shopModalTab === "add" && styles.activeTabText]}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, shopModalTab === "remove" && styles.activeTab]}
                onPress={() => setShopModalTab("remove")}
              >
                <Text style={[styles.tabText, shopModalTab === "remove" && styles.activeTabText]}>Remove</Text>
              </TouchableOpacity>
            </View>

            {shopModalTab === "add" ? (
              <View style={styles.addTabContent}>
                <View style={styles.addIconCircle}>
                  <Ionicons name="add-circle-outline" size={60} color={Colors.primary.main} />
                </View>
                <Text style={styles.addTitle}>Add New Shop</Text>
                <Text style={styles.addSubtitle}>
                  Register a new license to access another shop's data on this device.
                </Text>
                <ModernButton
                  title="Add License"
                  onPress={() => {
                    setShowShopModal(false);
                    onAddLicense && onAddLicense();
                  }}
                  variant="primary"
                  gradient
                  style={{ width: '100%', marginTop: Spacing.xl }}
                />
              </View>
            ) : (
              <>
                {shops.length > 0 ? (
                  <FlatList
                    data={shops}
                    keyExtractor={(item, index) => `${item.clientId}_${item.licenseKey}_${index}`}
                    renderItem={renderShopItem}
                    contentContainerStyle={styles.listContent}
                  />
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="business-outline" size={64} color={Colors.text.tertiary} />
                    <Text style={styles.emptyStateText}>No shops added yet</Text>
                    <TouchableOpacity onPress={() => setShopModalTab("add")}>
                      <Text style={styles.addShopLink}>Add your first shop</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
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
    padding: moderateScale(Spacing.xl),
  },

  content: {
    width: Screen.isTablet ? moderateScale(450) : '100%',
    alignSelf: 'center',
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: moderateVerticalScale(Spacing['3xl']),
  },

  logoCircle: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
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
    width: moderateScale(100),
    height: moderateScale(70),
  },

  appName: {
    fontSize: moderateScale(Typography.fontSize['3xl']),
    fontWeight: Typography.fontWeight.bold,
    color: Colors.dark.main,
    marginBottom: moderateVerticalScale(Spacing.xs),
  },

  tagline: {
    fontSize: moderateScale(Typography.fontSize.sm),
    color: Colors.text.secondary,
  },

  loginCard: {
    backgroundColor: Colors.background.card,
    borderRadius: moderateScale(BorderRadius.lg),
    padding: moderateScale(Spacing.xl),
    paddingBottom: moderateVerticalScale(Spacing['2xl']),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  badgeContainer: {
    alignItems: "center",
    marginBottom: moderateVerticalScale(Spacing.lg),
  },

  badge: {
    borderRadius: moderateScale(BorderRadius.xl),
    paddingVertical: moderateVerticalScale(Spacing.md),
    paddingHorizontal: moderateScale(Spacing.xl),
    minWidth: moderateScale(200),
    alignItems: 'center',
  },

  badgeText: {
    color: Colors.text.inverse,
    fontSize: moderateScale(Typography.fontSize.base),
    fontWeight: Typography.fontWeight.bold,
  },

  shopName: {
    textAlign: 'center',
    fontSize: moderateScale(Typography.fontSize.lg),
    fontWeight: '600',
    color: Colors.primary.main,
    marginBottom: moderateVerticalScale(Spacing.md),
  },

  input: {
    marginBottom: moderateVerticalScale(Spacing.base),
  },

  loginButton: {
    marginTop: moderateVerticalScale(Spacing.base),
    marginBottom: moderateVerticalScale(Spacing.lg),
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
    fontSize: moderateScale(Typography.fontSize.md),
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
    fontSize: moderateScale(Typography.fontSize.xs),
    marginTop: moderateVerticalScale(Spacing.xl),
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    padding: moderateScale(Spacing.xl),
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
    fontSize: moderateScale(Typography.fontSize.xl),
    fontWeight: 'bold',
    color: Colors.dark.main,
  },

  closeButton: {
    color: Colors.primary.main,
    fontSize: moderateScale(Typography.fontSize.lg),
    fontWeight: '600',
  },

  listContent: {
    paddingBottom: Spacing.xl,
  },

  shopItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateVerticalScale(Spacing.sm),
  },

  shopItem: {
    flex: 1,
    padding: moderateScale(Spacing.md),
    backgroundColor: Colors.background.primary,
    borderRadius: moderateScale(BorderRadius.md),
    borderWidth: 1,
    borderColor: Colors.border.light,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  removeModeShopItem: {
    borderColor: Colors.error.light + '40',
  },

  removeButton: {
    width: moderateScale(45),
    height: moderateScale(45),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: moderateScale(Spacing.xs),
    backgroundColor: Colors.error.light + '20',
    borderRadius: moderateScale(BorderRadius.md),
  },

  activeShopItem: {
    backgroundColor: '#FFF5EB',
    borderColor: Colors.primary.light,
  },

  shopItemName: {
    fontSize: moderateScale(Typography.fontSize.lg),
    fontWeight: '600',
    color: Colors.dark.main,
  },

  activeShopItemText: {
    color: Colors.primary.main,
  },

  shopItemSub: {
    fontSize: moderateScale(Typography.fontSize.sm),
    color: Colors.text.secondary,
    marginTop: moderateVerticalScale(2),
  },

  activeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary.main,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: moderateScale(BorderRadius.md),
    padding: 4,
    marginBottom: moderateVerticalScale(Spacing.lg),
  },

  tab: {
    flex: 1,
    paddingVertical: moderateVerticalScale(8),
    alignItems: 'center',
    borderRadius: moderateScale(BorderRadius.sm),
  },

  activeTab: {
    backgroundColor: Colors.background.primary,
    ...Shadows.small,
  },

  tabText: {
    fontSize: moderateScale(Typography.fontSize.sm),
    color: Colors.text.tertiary,
    fontWeight: Typography.fontWeight.medium,
  },

  activeTabText: {
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
  },

  addTabContent: {
    alignItems: 'center',
    padding: moderateScale(Spacing.xl),
  },

  addIconCircle: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: Colors.primary.lightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateVerticalScale(Spacing.lg),
  },

  addTitle: {
    fontSize: moderateScale(Typography.fontSize.xl),
    fontWeight: Typography.fontWeight.bold,
    color: Colors.dark.main,
    marginBottom: moderateVerticalScale(Spacing.sm),
  },

  addSubtitle: {
    fontSize: moderateScale(Typography.fontSize.base),
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: moderateScale(22),
  },

  emptyState: {
    alignItems: 'center',
    padding: moderateScale(Spacing['3xl']),
  },

  emptyStateText: {
    color: Colors.text.secondary,
    fontSize: moderateScale(Typography.fontSize.base),
    marginTop: moderateVerticalScale(Spacing.md),
    marginBottom: moderateVerticalScale(Spacing.xs),
  },

  addShopLink: {
    color: Colors.primary.main,
    fontWeight: 'bold',
    fontSize: moderateScale(Typography.fontSize.base),
  },
});

