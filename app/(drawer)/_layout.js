// app/(drawer)/_layout.js
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DrawerLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Orange fill for status bar area */}
      <View
        style={{
          height: insets.top,
          backgroundColor: "#ff6600",
        }}
      />
      
      <Drawer
        screenOptions={{
          headerStyle: { 
            backgroundColor: "#ff6600",
            height: 76,
          },
          headerTintColor: "#fff",
          drawerActiveTintColor: "#ff6600",
          drawerLabelStyle: { fontSize: 16 },
          sceneContainerStyle: { backgroundColor: "#fff" },
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

        {/* 🆕 Added Sales Report screen */}
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
