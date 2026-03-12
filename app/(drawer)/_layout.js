import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer"; // ✅ Correct import
import { useNavigation, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography } from "../../constants/modernTheme";
import { useLicenseModules } from "../../src/utils/useLicenseModules";

export default function DrawerLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { refreshModules } = useLicenseModules();

  const [user, setUser] = useState({ name: "", customerName: "" });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Switch Shop state
  const [shops, setShops] = useState([]);
  const [currentClientId, setCurrentClientId] = useState("");
  const [showShopModal, setShowShopModal] = useState(false);
  const [switchingShop, setSwitchingShop] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const [storedUser, storedCustomerName] = await Promise.all([
          AsyncStorage.getItem("user"),
          AsyncStorage.getItem("customerName"),
        ]);

        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser({
            name: parsed.name || "User",
            customerName: storedCustomerName || "TaskPrime Partner"
          });
          setCurrentClientId(parsed.clientId || "");
        }
        const storedLicenses = await AsyncStorage.getItem("knownLicenses");
        if (storedLicenses) {
          setShops(JSON.parse(storedLicenses));
        }
      } catch (err) {
        console.error("Error loading user:", err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      const safeCurrentId = String(currentClientId || "").trim().toUpperCase();
      await AsyncStorage.multiRemove(["user", "authToken", "loginTimestamp"]);
      if (safeCurrentId) {
        await SecureStore.deleteItemAsync(`savedUsername_${safeCurrentId}`).catch(() => { });
        await SecureStore.deleteItemAsync(`savedPassword_${safeCurrentId}`).catch(() => { });
      }
    } catch (e) {
      console.error("Storage error:", e);
    }

    setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'index' }],
      });
    }, 200);
  };

  const handleSwitchShop = async (shop) => {
    if (shop.clientId === currentClientId) {
      setShowShopModal(false);
      return;
    }

    setSwitchingShop(true);
    setShowShopModal(false);

    try {
      const safeShopId = String(shop.clientId).trim().toUpperCase();
      const savedUsername = await SecureStore.getItemAsync(`savedUsername_${safeShopId}`);
      const savedPassword = await SecureStore.getItemAsync(`savedPassword_${safeShopId}`);

      if (!savedUsername || !savedPassword) {
        setSwitchingShop(false);
        await AsyncStorage.setItem("clientId", shop.clientId);
        await AsyncStorage.setItem("customerName", shop.customerName);

        Alert.alert(
          "First Time Login",
          `Please log into ${shop.customerName} once to save your credentials for future auto-switching.`,
          [
            {
              text: "OK",
              onPress: async () => {
                await AsyncStorage.multiRemove(["user", "authToken", "loginTimestamp"]);
                navigation.reset({ index: 0, routes: [{ name: 'index' }] });
              }
            }
          ]
        );
        return;
      }

      const response = await fetch("https://taskprime.app/api/login/", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          username: savedUsername,
          password: savedPassword,
          client_id: shop.clientId.trim().toUpperCase(),
        }),
      });

      if (!response.ok) {
        setSwitchingShop(false);
        const errText = await response.text();
        Alert.alert("Switch Failed", "Could not authenticate with the selected shop.");
        return;
      }

      const data = await response.json();
      if (!data?.token) {
        setSwitchingShop(false);
        Alert.alert("Switch Failed", "No token received from server.");
        return;
      }

      const userData = {
        name: data?.username || savedUsername,
        clientId: data?.client_id || shop.clientId,
        token: data.token,
      };

      await AsyncStorage.setItem("user", JSON.stringify(userData));
      await AsyncStorage.setItem("authToken", data.token);
      await AsyncStorage.setItem("loginTimestamp", Date.now().toString());
      await AsyncStorage.setItem("clientId", shop.clientId);
      await AsyncStorage.setItem("customerName", shop.customerName);

      try { await refreshModules(); } catch (e) { }

      setUser({ name: userData.name, customerName: shop.customerName });
      setCurrentClientId(userData.clientId);

      router.replace("/(drawer)/(tabs)");
    } catch (error) {
      Alert.alert("Network Error", "Unable to connect.");
    } finally {
      setSwitchingShop(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <Drawer
        key={currentClientId || "drawer"}
        screenOptions={{
          headerShown: false,
          drawerActiveTintColor: Colors.primary.main,
          drawerActiveBackgroundColor: Colors.primary.main + "08",
          drawerInactiveTintColor: "#64748B",
          drawerLabelStyle: {
            fontSize: 14,
            fontWeight: "600",
            marginLeft: -10,
          },
          drawerItemStyle: {
            borderRadius: 12,
            marginHorizontal: 12,
            paddingHorizontal: 8,
          },
          sceneContainerStyle: { backgroundColor: "#F8FAFC" },
        }}
        drawerContent={(props) => (
          <View style={{ flex: 1 }}>
            {/* Header section */}
            <View style={[styles.drawerHeader, { paddingTop: insets.top + 20 }]}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person-circle" size={54} color={Colors.primary.main} />
                <View style={styles.activeDot} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                <Text style={styles.shopName} numberOfLines={1}>{user.customerName}</Text>
                <View style={styles.idBadge}>
                  <Text style={styles.idText}>ID: {currentClientId || "N/A"}</Text>
                </View>
              </View>
            </View>

            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
              <View style={styles.menuTitleContainer}>
                <Text style={styles.menuTitle}>MAIN MENU</Text>
              </View>
              <DrawerItemList {...props} />
            </DrawerContentScrollView>

            <View style={styles.footer}>
              {/* Switch Shop Button */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShowShopModal(true)}
                disabled={switchingShop}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.primary.main + "10" }]}>
                  <Ionicons name="swap-horizontal" size={18} color={Colors.primary.main} />
                </View>
                <Text style={styles.actionText}>Switch Shop</Text>
                {switchingShop && <ActivityIndicator size="small" color={Colors.primary.main} style={{ marginLeft: 8 }} />}
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity
                style={[styles.actionBtn, { marginTop: 8 }]}
                onPress={() => setShowLogoutModal(true)}
              >
                <View style={[styles.actionIcon, { backgroundColor: "#EF444410" }]}>
                  <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                </View>
                <Text style={[styles.actionText, { color: "#EF4444" }]}>Logout</Text>
              </TouchableOpacity>
            </View>

            {/* Logout Modal */}
            <Modal
              transparent
              animationType="fade"
              visible={showLogoutModal}
              onRequestClose={() => setShowLogoutModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                  <View style={styles.modalIconBox}>
                    <Ionicons name="help-circle-outline" size={40} color={Colors.primary.main} />
                  </View>
                  <Text style={styles.modalTitle}>Confirm Logout</Text>
                  <Text style={styles.modalSub}>Are you sure you want to end your session?</Text>
                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.modalNo} onPress={() => setShowLogoutModal(false)}>
                      <Text style={styles.noText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalYes} onPress={confirmLogout}>
                      <Text style={styles.yesText}>Logout</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Switch Shop Modal */}
            <Modal
              transparent
              animationType="slide"
              visible={showShopModal}
              onRequestClose={() => setShowShopModal(false)}
            >
              <View style={styles.shopModalOverlay}>
                <View style={styles.shopModalCard}>
                  <View style={styles.shopHandle} />
                  <View style={styles.shopModalHeader}>
                    <Text style={styles.shopModalTitle}>Select Shop</Text>
                    <TouchableOpacity onPress={() => setShowShopModal(false)} style={styles.closeBtn}>
                      <Ionicons name="close" size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  
                  {shops.length === 0 ? (
                    <View style={styles.emptyShops}>
                      <Ionicons name="storefront-outline" size={40} color="#CBD5E1" />
                      <Text style={styles.emptyShopsText}>No other shops available.</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={shops}
                      keyExtractor={(item, index) => `${item.clientId}_${index}`}
                      contentContainerStyle={{ paddingBottom: 30 }}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.shopItem, item.clientId === currentClientId && styles.shopItemActive]}
                          onPress={() => handleSwitchShop(item)}
                        >
                          <View style={[styles.shopIcon, item.clientId === currentClientId && { backgroundColor: Colors.primary.main + '20' }]}>
                            <Ionicons 
                              name="business" 
                              size={20} 
                              color={item.clientId === currentClientId ? Colors.primary.main : "#94A3B8"} 
                            />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.shopItemName, item.clientId === currentClientId && { color: Colors.primary.main }]}>
                              {item.customerName}
                            </Text>
                            <Text style={styles.shopItemId}>Client ID: {item.clientId}</Text>
                          </View>
                          {item.clientId === currentClientId && (
                            <Ionicons name="checkmark-circle" size={22} color={Colors.primary.main} />
                          )}
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>
              </View>
            </Modal>
          </View>
        )}
      >
        <Drawer.Screen name="(tabs)" options={{ title: "Dashboard", drawerIcon: ({ color }) => <Ionicons name="grid-outline" size={20} color={color} /> }} />
        <Drawer.Screen name="customers" options={{ title: "Customers", drawerIcon: ({ color }) => <Ionicons name="people-outline" size={20} color={color} /> }} />
        <Drawer.Screen name="suppliers" options={{ title: "Suppliers", drawerIcon: ({ color }) => <Ionicons name="trail-sign-outline" size={20} color={color} /> }} />
        <Drawer.Screen name="sales-report" options={{ title: "Sales Report", drawerIcon: ({ color }) => <Ionicons name="analytics-outline" size={20} color={color} /> }} />
        <Drawer.Screen name="sales-return" options={{ title: "Sales Return", drawerIcon: ({ color }) => <Ionicons name="return-up-back-outline" size={20} color={color} /> }} />
        <Drawer.Screen name="purchase-report" options={{ title: "Purchase Report", drawerItemStyle: { display: 'none' }, drawerIcon: ({ color }) => <Ionicons name="cart-outline" size={20} color={color} /> }} />
        <Drawer.Screen name="bank-cash" options={{ title: "Bank & Cash", drawerIcon: ({ color }) => <Ionicons name="wallet-outline" size={20} color={color} /> }} />
        <Drawer.Screen name="stock-report" options={{ title: "Stock Report", drawerItemStyle: { display: 'none' }, drawerIcon: ({ color }) => <Ionicons name="cube-outline" size={20} color={color} /> }} />
        <Drawer.Screen name="pdc-report" options={{ title: "PDC Report", drawerIcon: ({ color }) => <Ionicons name="receipt-outline" size={20} color={color} /> }} />
        <Drawer.Screen name="refresh-tag" options={{ title: "Refresh Tag", drawerIcon: ({ color }) => <Ionicons name="sync-outline" size={20} color={color} /> }} />
        <Drawer.Screen name="event-log" options={{ title: "Event Log", drawerIcon: ({ color }) => <Ionicons name="list-outline" size={20} color={color} /> }} />
        <Drawer.Screen name="tender-cash" options={{ title: "Tender Cash", drawerIcon: ({ color }) => <Ionicons name="cash-outline" size={20} color={color} /> }} />
        <Drawer.Screen name="company-info" options={{ title: "Company Info", drawerIcon: ({ color }) => <Ionicons name="information-circle-outline" size={20} color={color} /> }} />
        <Drawer.Screen name="license-info" options={{ title: "License", drawerIcon: ({ color }) => <Ionicons name="shield-checkmark-outline" size={20} color={color} /> }} />
      </Drawer>
    </View>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth:1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#fff',
  },
  avatarContainer: {
    position: 'relative',
    width: 54,
    height: 54,
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerInfo: {
    marginTop: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  shopName: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  idBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary.main + '10',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  idText: {
    fontSize: 10,
    color: Colors.primary.main,
    fontWeight: '700',
  },
  menuTitleContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  menuTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#fff',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary.main,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary.main + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalNo: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalYes: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary.main,
    alignItems: 'center',
  },
  noText: { color: '#64748B', fontWeight: '700' },
  yesText: { color: '#fff', fontWeight: '700' },
  shopModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  shopModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '75%',
  },
  shopHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  shopModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  shopModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  shopItemActive: {
    backgroundColor: Colors.primary.main + '05',
    borderColor: Colors.primary.main + '20',
  },
  shopIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 2,
  },
  shopItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  shopItemId: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyShops: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyShopsText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
  },
});
