import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: "#ff6600" },
        headerTintColor: "#fff",
        drawerActiveTintColor: "#ff6600",
        drawerLabelStyle: { fontSize: 16 },
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

      {/* 👇 NEW SUPPLIERS PAGE */}
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
            <Ionicons name="building-outline" size={size} color={color} />
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
  );
}
