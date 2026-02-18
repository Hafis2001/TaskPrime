import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer"; // ✅ Correct import
import { useRouter } from "expo-router";
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
    await AsyncStorage.removeItem("user");
    setShowLogoutModal(false);
    router.replace("/");
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
          name="company-info"
          options={{
            title: "Company Info",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="business-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="dashboard"
          options={{
            title: "License Info",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="shield-checkmark-outline" size={size} color={color} />
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
