import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Colors, Typography } from "../../../constants/modernTheme";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.primary.main,
                tabBarInactiveTintColor: Colors.text.tertiary,
                tabBarStyle: {
                    borderTopWidth: 0,
                    backgroundColor: "#ffffff",
                    height: 65,
                    paddingBottom: 10,
                    paddingTop: 10,
                    marginBottom: 25,
                    marginHorizontal: 16,
                    borderRadius: 20,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 25,
                    elevation: 15,
                    position: 'absolute',
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: Typography.fontWeight.semibold,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Overview",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="company-info"
                options={{
                    title: "Company",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="business-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="license-info"
                options={{
                    title: "License",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="shield-checkmark-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
