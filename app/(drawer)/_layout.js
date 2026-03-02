import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer"; // ✅ Correct import
import { useNavigation, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography } from "../../constants/modernTheme";

export default function DrawerLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();

  const [user, setUser] = useState({ name: "" });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser({ name: parsed.name || "User" });
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
    console.log("🚀 Logout initiated from Drawer");
    setShowLogoutModal(false);

    // Clear session immediately
    try {
      await AsyncStorage.multiRemove(["user", "authToken", "loginTimestamp"]);
      console.log("🧹 Session data cleared");
    } catch (e) {
      console.error("Storage error:", e);
    }

    // Forceful reset to root index screen
    setTimeout(() => {
      console.log("🔄 Resetting navigation to Login screen...");
      navigation.reset({
        index: 0,
        routes: [{ name: 'index' }],
      });
    }, 200);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerActiveTintColor: Colors.primary.main,
          drawerLabelStyle: {
            fontSize: Typography.fontSize.base,
            fontWeight: Typography.fontWeight.medium,
          },
          sceneContainerStyle: { backgroundColor: Colors.background.primary },
        }}
        drawerContent={(props) => (
          <View style={{ flex: 1 }}>
            {/* ✅ Drawer list container */}
            <DrawerContentScrollView {...props}>
              <DrawerItemList {...props} />
            </DrawerContentScrollView>

            {/* ✅ Bottom Logout Button */}
            <View style={{ paddingBottom: insets.bottom + 20 }}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => setShowLogoutModal(true)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="log-out-outline"
                      size={22}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.logoutText}>
                      Logout {user.name ? `(${user.name})` : ""}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* ✅ Logout Modal */}
            <Modal
              transparent
              animationType="fade"
              visible={showLogoutModal}
              onRequestClose={() => setShowLogoutModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalText}>
                    Hey, {user.name || "there"} 👋{"\n"}Are you logging out?
                  </Text>
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.yesButton}
                      onPress={confirmLogout}
                    >
                      <Text style={styles.buttonText}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.noButton}
                      onPress={() => setShowLogoutModal(false)}
                    >
                      <Text style={styles.buttonText}>No</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        )}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            title: "Home",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="customers"
          options={{
            title: "Customers",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="cash-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="suppliers"
          options={{
            title: "Suppliers",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="sales-report"
          options={{
            title: "Sales Report",
            drawerItemStyle: { display: 'none' },
            drawerIcon: ({ color, size }) => (
              <Ionicons name="stats-chart-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="sales-return"
          options={{
            title: "Sales Return",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="return-down-forward-sharp" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="purchase-report"
          options={{
            title: "Purchase Report",
            drawerItemStyle: { display: 'none' },
            drawerIcon: ({ color, size }) => (
              <Ionicons name="cart-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="bank-cash"
          options={{
            title: "Bank & Cash",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="business-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="stock-report"
          options={{
            title: "Stock Report",
            drawerItemStyle: { display: 'none' },
            drawerIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="pdc-report"
          options={{
            title: "PDC Report",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="document-text-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="refresh-tag"
          options={{
            title: "Refresh Tag",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="sync-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="event-log"
          options={{
            title: "Event Log",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="list-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="tender-cash"
          options={{
            title: "Tender Cash",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="wallet-outline" size={size} color={color} />
            ),
          }}
        />
      </Drawer>
    </View>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    backgroundColor: "#ff6600",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "80%",
    alignItems: "center",
    elevation: 10,
  },
  modalText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  yesButton: {
    backgroundColor: "#FF914D",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  noButton: {
    backgroundColor: "#aaa",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
});
