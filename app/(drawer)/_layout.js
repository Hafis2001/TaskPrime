import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DrawerLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* 🟧 Small orange strip for status bar area */}
      <View
        style={{
          height: insets.top + 20, // smaller orange area
          backgroundColor: "#ff6600",
        }}
      />

      <Drawer
        screenOptions={{
          headerStyle: {
            backgroundColor: "#fff", // white header background
            height: 65, // slightly smaller height
            borderBottomWidth: 0, // no border line
            shadowColor: "transparent", // remove shadow
          },
          headerTintColor: "#ff6600", // make icons orange
          headerTitleStyle: { color: "#fff" }, // black title text
          drawerActiveTintColor: "#ff6600",
          drawerLabelStyle: { fontSize: 16 },
          sceneContainerStyle: { backgroundColor: "#fff" },
            headerLeftContainerStyle: {
                        marginTop: -65, // adjust this for exact position
                      },
        }}
      >
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
          name="company-info"
          options={{
            title: "Company Info",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="business-outline" size={size} color={color} />
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
          name="settings"
          options={{
            title: "Settings",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Drawer>
    </View>
  );
}
