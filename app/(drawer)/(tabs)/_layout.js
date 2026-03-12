import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Pressable } from "react-native";
import { Colors, Typography } from "../../../constants/modernTheme";

const TabButton = (props) => {
    const { onPress, accessibilityState, children } = props;
    const focused = accessibilityState?.selected ?? false;
    const scale = useRef(new Animated.Value(focused ? 1.1 : 1)).current;

    useEffect(() => {
        Animated.spring(scale, {
            toValue: focused ? 1.15 : 1,
            useNativeDriver: true,
            friction: 4,
            tension: 40,
        }).start();
    }, [focused]);

    return (
        <Pressable
            onPress={onPress}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
            <Animated.View style={{
                transform: [{ scale }],
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 16,
                backgroundColor: focused ? Colors.primary.main + '10' : 'transparent'
            }}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.primary.main,
                tabBarInactiveTintColor: Colors.text.tertiary,
                tabBarButton: (props) => <TabButton {...props} />,
                tabBarStyle: {
                    borderTopWidth: 0,
                    backgroundColor: "#feeadcff", // Soft pale orange tint
                    height: 80,
                    paddingBottom: 25,
                    paddingTop: 18,
                    marginBottom: 45,
                    marginHorizontal: 16,
                    borderRadius: 30,
                    shadowColor: Colors.primary.main,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.15,
                    shadowRadius: 20,
                    elevation: 15,
                    position: 'absolute',
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    marginTop: 2,
                    fontWeight: Typography.fontWeight.bold,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Dashboard",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="stock"
                options={{
                    title: "Stock",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="cube-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="events"
                options={{
                    title: "Events",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="list-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="pdc"
                options={{
                    title: "PDC",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="document-text-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="cash"
                options={{
                    title: "Cash",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="cash-outline" size={size} color={color} />
                    ),
                }}
            />
            {/* Hidden from tab bar — accessible via drawer */}
            <Tabs.Screen
                name="company-info"
                options={{ href: null }}
            />
            <Tabs.Screen
                name="license-info"
                options={{ href: null }}
            />
        </Tabs>
    );
}
